/**
 * AutoCare AI - End-to-End Integration Verification Test Suite
 * Validates all REST API endpoints, raw SQL transactions, and business logic
 */

const http = require('http');

const BASE_URL = 'http://localhost:8080';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  };

  const res = await fetch(url, fetchOptions);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    throw new Error(message);
  }
}

async function runTests() {
  console.log('-------------------------------------------------------');
  console.log('🧪 Running AutoCare AI Pure Raw SQL Integration Tests...');
  console.log('-------------------------------------------------------');

  const randomSuffix = Math.floor(Math.random() * 100000);
  const testAccessCode = `TEST-WS-${randomSuffix}`;
  const adminEmail = `admin-${randomSuffix}@autocare.test`;
  const mechanicEmail = `mechanic-${randomSuffix}@autocare.test`;
  const customerEmail = `customer-${randomSuffix}@autocare.test`;
  const employeeCode = `TECH-${randomSuffix}`;
  const testVin = `1HGCR2F83HA${String(randomSuffix).padStart(6, '0')}`;

  // 1. Health Check
  console.log('\n[1/13] Testing GET /api/health');
  const healthRes = await request('/api/health');
  assert(healthRes.status === 200, `Health check returned status ${healthRes.status}`);
  console.log('✅ Server is healthy');

  // 2. Register Workshop Tenant (Admin)
  console.log('\n[2/13] Testing POST /api/auth/register/workshop');
  const wsRes = await request('/api/auth/register/workshop', {
    method: 'POST',
    body: {
      workshopName: `Precision Auto Lab ${randomSuffix}`,
      workshopAddress: '100 Innovation Parkway, Suite 400',
      accessCode: testAccessCode,
      firstName: 'Arthur',
      lastName: 'Pendelton',
      email: adminEmail,
      password: 'AdminPassword123!'
    }
  });
  assert(wsRes.status === 201, `Workshop register failed with ${wsRes.status}: ${JSON.stringify(wsRes.data)}`);
  assert(wsRes.data.token, 'Admin JWT token missing');
  const adminToken = wsRes.data.token;
  const workshopId = wsRes.data.workshopId;
  console.log(`✅ Workshop created (ID: ${workshopId}, Access Code: ${testAccessCode})`);

  // 3. Register Mechanic
  console.log('\n[3/13] Testing POST /api/auth/register/mechanic');
  const mechRes = await request('/api/auth/register/mechanic', {
    method: 'POST',
    body: {
      firstName: 'Marcus',
      lastName: 'Vance',
      email: mechanicEmail,
      password: 'MechanicPass123!',
      workshopAccessCode: testAccessCode,
      employeeCode
    }
  });
  assert(mechRes.status === 201, `Mechanic register failed with ${mechRes.status}: ${JSON.stringify(mechRes.data)}`);
  assert(mechRes.data.role === 'MECHANIC', 'Role is not MECHANIC');
  const mechanicToken = mechRes.data.token;
  const mechanicId = mechRes.data.userId;
  console.log(`✅ Mechanic registered (ID: ${mechanicId}, Code: ${employeeCode})`);

  // 4. Register Customer
  console.log('\n[4/13] Testing POST /api/auth/register/customer');
  const custRes = await request('/api/auth/register/customer', {
    method: 'POST',
    body: {
      firstName: 'Elena',
      lastName: 'Rostova',
      email: customerEmail,
      password: 'CustomerPass123!',
      workshopAccessCode: testAccessCode,
      phone: '+1-555-0199'
    }
  });
  assert(custRes.status === 201, `Customer register failed with ${custRes.status}: ${JSON.stringify(custRes.data)}`);
  assert(custRes.data.role === 'CUSTOMER', 'Role is not CUSTOMER');
  const customerToken = custRes.data.token;
  const customerId = custRes.data.userId;
  console.log(`✅ Customer registered (ID: ${customerId})`);

  // 5. Verify GET /api/auth/me for Customer Profile
  console.log('\n[5/13] Testing GET /api/auth/me');
  const meRes = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(meRes.status === 200, `GET /me failed with ${meRes.status}`);
  assert(meRes.data.phone === '+1-555-0199', 'Phone number not joined properly in EER subtype');
  console.log(`✅ Customer profile retrieved: ${meRes.data.firstName} ${meRes.data.lastName}, Phone: ${meRes.data.phone}`);

  // 6. Register Vehicle
  console.log('\n[6/13] Testing POST /api/vehicles (with automatic reminder provisioning)');
  const vehRes = await request('/api/vehicles', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: {
      vin: testVin,
      make: 'Porsche',
      model: '911 Carrera',
      year: 2023,
      odometer: 14200
    }
  });
  assert(vehRes.status === 201, `Vehicle creation failed with ${vehRes.status}: ${JSON.stringify(vehRes.data)}`);
  const vehicleId = vehRes.data.vehicleId;
  console.log(`✅ Vehicle registered (ID: ${vehicleId}, VIN: ${testVin})`);

  // 7. Check Reminders
  console.log('\n[7/13] Testing GET /api/reminders');
  const remRes = await request('/api/reminders', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(remRes.status === 200, `Reminders failed with ${remRes.status}`);
  assert(remRes.data.length > 0, 'Auto-provisioned reminder not found');
  console.log(`✅ Active reminder confirmed: "${remRes.data[0].reminderType}" (Due: ${remRes.data[0].dueDate})`);

  // 8. Create Problem Report with AI Diagnostic Synthesis
  console.log('\n[8/13] Testing POST /api/problem-reports (AI diagnostic synthesis & keywords)');
  const repRes = await request('/api/problem-reports', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: {
      vehicleId,
      description: 'High-pitched squeak and grinding noise when braking at highway speeds.'
    }
  });
  assert(repRes.status === 201, `Problem report failed with ${repRes.status}: ${JSON.stringify(repRes.data)}`);
  assert(repRes.data.solution, 'Solution report not attached');
  assert(repRes.data.solution.keywords.length > 0, 'Symptom keywords not normalized or saved');
  const reportId = repRes.data.reportId;
  console.log(`✅ Problem report filed (ID: ${reportId})`);
  console.log(`   Urgency: ${repRes.data.solution.urgency}, Cause: "${repRes.data.solution.probableCause.substring(0, 50)}..."`);
  console.log(`   Keywords: [${repRes.data.solution.keywords.join(', ')}]`);

  // 9. Review Problem Report by Mechanic
  console.log('\n[9/13] Testing PATCH /api/problem-reports/:id/review (Mechanic review)');
  const revRes = await request(`/api/problem-reports/${reportId}/review`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${mechanicToken}` }
  });
  assert(revRes.status === 200, `Review failed with ${revRes.status}`);
  assert(revRes.data.solution.reviewedBy === mechanicId, 'Reviewer ID not set');
  console.log(`✅ Diagnostic solution reviewed by Mechanic: ${revRes.data.solution.reviewerName}`);

  // 10. Book Conflict-Free Appointment
  console.log('\n[10/13] Testing POST /api/appointments');
  const scheduledStart = new Date(Date.now() + 86400000).toISOString(); // tomorrow
  const apptRes = await request('/api/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: {
      vehicleId,
      mechanicId,
      reportId,
      scheduledStart,
      durationMinutes: 60,
      serviceDescription: 'Brake pad replacement and rotor resurfacing'
    }
  });
  assert(apptRes.status === 201, `Appointment creation failed with ${apptRes.status}: ${JSON.stringify(apptRes.data)}`);
  const appointmentId = apptRes.data.appointmentId;
  console.log(`✅ Appointment booked (ID: ${appointmentId}, Status: ${apptRes.data.status})`);

  // 11. Concurrency Overlap Check (Expect 409 Conflict)
  console.log('\n[11/13] Testing Overlapping Appointment Conflict Prevention (Expect 409 Conflict)');
  // Overlapping by 30 mins
  const overlappingStart = new Date(new Date(scheduledStart).getTime() + 30 * 60 * 1000).toISOString();
  const conflictRes = await request('/api/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: {
      vehicleId,
      mechanicId,
      scheduledStart: overlappingStart,
      durationMinutes: 45,
      serviceDescription: 'Overlapping inspection attempt'
    }
  });
  assert(conflictRes.status === 409, `Expected 409 Conflict but received ${conflictRes.status}`);
  console.log(`✅ Concurrency lock correctly rejected overlapping slot with HTTP 409 Conflict: "${conflictRes.data.message}"`);

  // 12. Complete Appointment -> Auto Invoice Generation & Problem Report Resolution
  console.log('\n[12/13] Testing PATCH /api/appointments/:id/status (Mark COMPLETED -> Auto Invoice & Resolution)');
  const compRes = await request(`/api/appointments/${appointmentId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${mechanicToken}` },
    body: {
      status: 'COMPLETED',
      partsCost: 320.50,
      laborCost: 150.00,
      serviceDescription: 'Completed OEM ceramic brake pads installation and system bleeding.'
    }
  });
  assert(compRes.status === 200, `Complete appointment failed with ${compRes.status}: ${JSON.stringify(compRes.data)}`);
  assert(compRes.data.status === 'COMPLETED', 'Status is not COMPLETED');
  assert(compRes.data.totalAmount === 470.50, `Total amount expected 470.50, got ${compRes.data.totalAmount}`);
  assert(compRes.data.invoiceStatus === 'PENDING', 'Invoice status not PENDING');

  // Verify Problem Report is marked RESOLVED
  const checkRepRes = await request(`/api/problem-reports/${reportId}`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(checkRepRes.data.status === 'RESOLVED', `Problem report status expected RESOLVED, got ${checkRepRes.data.status}`);
  console.log(`✅ Service completed: Total Bill = $${compRes.data.totalAmount}, Invoice Status = ${compRes.data.invoiceStatus}`);
  console.log(`✅ Linked Problem Report automatically marked as ${checkRepRes.data.status}`);

  // 13. Workshop Admin Telemetry Aggregation
  console.log('\n[13/13] Testing GET /api/workshops/stats (Admin multi-tenant telemetry)');
  const statsRes = await request('/api/workshops/stats', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(statsRes.status === 200, `Stats failed with ${statsRes.status}`);
  assert(statsRes.data.customerCount >= 1, 'Customer count mismatch');
  assert(statsRes.data.vehicleCount >= 1, 'Vehicle count mismatch');
  assert(statsRes.data.mechanicCount >= 1, 'Mechanic count mismatch');
  assert(statsRes.data.completedAppointmentsCount >= 1, 'Completed appointments mismatch');
  assert(statsRes.data.totalRevenue >= 470.50, `Total revenue expected >= 470.50, got ${statsRes.data.totalRevenue}`);
  console.log('✅ Workshop stats verified successfully:');
  console.log(`   Customers: ${statsRes.data.customerCount}, Vehicles: ${statsRes.data.vehicleCount}, Mechanics: ${statsRes.data.mechanicCount}`);
  console.log(`   Completed Work Orders: ${statsRes.data.completedAppointmentsCount}, Total Revenue: $${statsRes.data.totalRevenue}`);

  console.log('\n-------------------------------------------------------');
  console.log('🎉 ALL 13 INTEGRATION TESTS PASSED SUCCESSFULLY! (100% PURE RAW SQL)');
  console.log('-------------------------------------------------------');
}

if (require.main === module) {
  runTests().catch(err => {
    console.error('\n❌ Test suite failed:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
