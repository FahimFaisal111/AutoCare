/**
 * AutoCare AI - Maintenance Reminders & Alerts Automated Test Suite
 * 
 * Tests:
 * 1. Mechanic manual calendar reminder creation (future & past due)
 * 2. Scheduled daily job surfacing due reminders
 * 3. ServiceCompletedEvent triggering default preventive-maintenance rules
 * 4. Milestone computation (multiples above current odometer)
 * 5. Duplicate prevention for active/due rules
 * 6. Mileage threshold detection (odometer >= milestone)
 * 7. Customer & Mechanic endpoint scoping and grouping
 * 8. Multi-tenant and role-based security isolation
 * 9. Reminder status updates (COMPLETED / DISMISSED)
 */

const assert = require('assert');
const { pool } = require('../src/config/db');
const reminderRepo = require('../src/repositories/reminderRepo');
const reminderService = require('../src/services/reminderService');
const vehicleRepo = require('../src/repositories/vehicleRepo');
const appointmentService = require('../src/services/appointmentService');
const serviceEvents = require('../src/events/serviceEvents');
const reminderJob = require('../src/jobs/reminderJob');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || '404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970';

function generateToken(user) {
  return jwt.sign(
    {
      userId: user.userId,
      workshopId: user.workshopId,
      role: user.role,
      sub: user.email
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function runTests() {
  console.log('=======================================================');
  console.log('🧪 Starting Maintenance Reminders & Alerts Test Suite');
  console.log('=======================================================\n');

  let testWorkshopId;
  let testCustomer1;
  let testCustomer2;
  let testMechanic1;
  let otherWorkshopId;
  let otherMechanic;
  let vehicle1Id;
  let vehicle2Id;

  try {
    // ------------------------------------------------------------------
    // Setup Test Data
    // ------------------------------------------------------------------
    const timestamp = Date.now();

    // 1. Create primary workshop
    const [wsRes] = await pool.query(
      `INSERT INTO workshop (name, address, access_code) VALUES (?, ?, ?);`,
      [`Test Reminders Workshop ${timestamp}`, '100 Garage Way', `REM-${timestamp}`]
    );
    testWorkshopId = wsRes.insertId;

    // 2. Create secondary workshop (for tenant boundary test)
    const [otherWsRes] = await pool.query(
      `INSERT INTO workshop (name, address, access_code) VALUES (?, ?, ?);`,
      [`Other Workshop ${timestamp}`, '200 Another St', `OTH-${timestamp}`]
    );
    otherWorkshopId = otherWsRes.insertId;

    // 3. Create users
    const [u1] = await pool.query(
      `INSERT INTO user (workshop_id, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?);`,
      [testWorkshopId, `cust1_${timestamp}@test.com`, 'hash', 'Alice', 'Owner', 'CUSTOMER']
    );
    await pool.query(`INSERT INTO customer (user_id) VALUES (?);`, [u1.insertId]);
    testCustomer1 = { userId: u1.insertId, workshopId: testWorkshopId, role: 'CUSTOMER', email: `cust1_${timestamp}@test.com` };

    const [u2] = await pool.query(
      `INSERT INTO user (workshop_id, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?);`,
      [testWorkshopId, `cust2_${timestamp}@test.com`, 'hash', 'Bob', 'Driver', 'CUSTOMER']
    );
    await pool.query(`INSERT INTO customer (user_id) VALUES (?);`, [u2.insertId]);
    testCustomer2 = { userId: u2.insertId, workshopId: testWorkshopId, role: 'CUSTOMER', email: `cust2_${timestamp}@test.com` };

    const [m1] = await pool.query(
      `INSERT INTO user (workshop_id, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?);`,
      [testWorkshopId, `mech1_${timestamp}@test.com`, 'hash', 'Mike', 'Wrench', 'MECHANIC']
    );
    await pool.query(`INSERT INTO mechanic (user_id, employee_code) VALUES (?, ?);`, [m1.insertId, `EMP1-${timestamp}`]);
    testMechanic1 = { userId: m1.insertId, workshopId: testWorkshopId, role: 'MECHANIC', email: `mech1_${timestamp}@test.com` };

    const [om] = await pool.query(
      `INSERT INTO user (workshop_id, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?);`,
      [otherWorkshopId, `other_mech_${timestamp}@test.com`, 'hash', 'Dave', 'Other', 'MECHANIC']
    );
    await pool.query(`INSERT INTO mechanic (user_id, employee_code) VALUES (?, ?);`, [om.insertId, `EMP2-${timestamp}`]);
    otherMechanic = { userId: om.insertId, workshopId: otherWorkshopId, role: 'MECHANIC', email: `other_mech_${timestamp}@test.com` };

    // 4. Create vehicles
    const vin1 = `1HGCR2F8${timestamp.toString().slice(-9)}`;
    const [v1] = await pool.query(
      `INSERT INTO vehicle (owner_id, vin, make, model, year, odometer) VALUES (?, ?, 'Honda', 'Accord', 2019, 48250);`,
      [testCustomer1.userId, vin1]
    );
    vehicle1Id = v1.insertId;

    const vin2 = `2T1BURHE${(timestamp + 1).toString().slice(-9)}`;
    const [v2] = await pool.query(
      `INSERT INTO vehicle (owner_id, vin, make, model, year, odometer) VALUES (?, ?, 'Toyota', 'Corolla', 2021, 22000);`,
      [testCustomer2.userId, vin2]
    );
    vehicle2Id = v2.insertId;

    console.log('✅ [Setup] Test tenant, users, and vehicles created successfully.');

    // ------------------------------------------------------------------
    // TEST 1: Mechanic Manual Calendar Reminder Creation
    // ------------------------------------------------------------------
    console.log('\n--- Test 1: Mechanic Manual Calendar Reminder Creation ---');
    const manualReminder = await reminderService.createManualReminder(
      {
        vehicleId: vehicle1Id,
        reminderType: 'BRAKE_PAD_REPLACEMENT',
        dueDate: '2026-12-15',
        message: 'Front brake pads measured at 3mm. Recommend replacement before winter.'
      },
      testMechanic1
    );

    assert.ok(manualReminder.reminderId, 'Reminder ID should be generated');
    assert.strictEqual(manualReminder.status, 'ACTIVE', 'Status should be ACTIVE');
    assert.strictEqual(manualReminder.isDue, false, 'Future date should not be due');
    assert.strictEqual(manualReminder.dueReason, 'UPCOMING');
    console.log('✅ Test 1 Passed: Manual calendar reminder created with ACTIVE status.');

    // ------------------------------------------------------------------
    // TEST 2: Scheduled Daily Job Surfacing Due Reminders
    // ------------------------------------------------------------------
    console.log('\n--- Test 2: Scheduled Daily Job Surfacing Due Reminders ---');
    // Insert an active reminder with yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const pastReminderId = await reminderRepo.create(null, {
      vehicleId: vehicle1Id,
      reminderType: 'EMISSIONS_TEST',
      dueDate: yesterdayStr,
      message: 'Annual state emissions test inspection required.',
      status: 'ACTIVE'
    });

    // Run the scheduled scan
    const affected = await reminderJob.runDueRemindersScan();
    assert.ok(affected >= 1, 'Should have surfaced at least 1 due reminder');

    const updatedPast = await reminderRepo.findById(null, pastReminderId);
    assert.strictEqual(updatedPast.status, 'DUE', 'Past due reminder should transition to DUE');
    console.log('✅ Test 2 Passed: Scheduled job successfully surfaced past due reminder to DUE.');

    // ------------------------------------------------------------------
    // TEST 3: ServiceCompletedEvent & Default Preventive Rules
    // ------------------------------------------------------------------
    console.log('\n--- Test 3: ServiceCompletedEvent & Default Preventive Rules ---');
    // Create an appointment for Vehicle 1 (odometer = 48,250 km)
    const [apptRes] = await pool.query(
      `INSERT INTO appointment (vehicle_id, mechanic_id, scheduled_start, duration_minutes, status, parts_cost, labor_cost)
       VALUES (?, ?, NOW(), 60, 'IN_PROGRESS', 50.00, 100.00);`,
      [vehicle1Id, testMechanic1.userId]
    );
    const appointmentId = apptRes.insertId;

    // Complete appointment via appointmentService with odometer update (48,250)
    const updatedAppt = await appointmentService.updateAppointmentStatus(
      appointmentId,
      {
        status: 'COMPLETED',
        partsCost: 80.00,
        laborCost: 120.00,
        serviceDescription: 'Performed comprehensive multi-point inspection.',
        odometer: 48250
      },
      testMechanic1
    );

    assert.strictEqual(updatedAppt.status, 'COMPLETED');
    assert.strictEqual(updatedAppt.totalAmount, 200.00);

    // Verify invoice was automatically generated
    const [invRows] = await pool.query('SELECT * FROM invoice WHERE appointment_id = ?', [appointmentId]);
    assert.strictEqual(invRows.length, 1, 'Invoice should be created');
    assert.strictEqual(parseFloat(invRows[0].total_amount), 200.00);

    // Verify 4 default rules were automatically generated
    const vehicle1Reminders = await reminderService.getRemindersForVehicle(vehicle1Id, testCustomer1);
    const types = vehicle1Reminders.map(r => r.reminderType);
    assert.ok(types.includes('OIL_SERVICE'), 'Should include OIL_SERVICE');
    assert.ok(types.includes('TIRE_ROTATION'), 'Should include TIRE_ROTATION');
    assert.ok(types.includes('BRAKE_INSPECTION'), 'Should include BRAKE_INSPECTION');
    assert.ok(types.includes('COOLANT_SERVICE'), 'Should include COOLANT_SERVICE');

    // Verify milestone calculation:
    // current = 48,250.
    // OIL_SERVICE (every 3,000): next milestone = 51,000 km
    // TIRE_ROTATION (every 5,000): next milestone = 50,000 km
    const oilReminder = vehicle1Reminders.find(r => r.reminderType === 'OIL_SERVICE');
    assert.strictEqual(oilReminder.milestoneKm, 51000, 'Oil service milestone should be 51,000 km');
    assert.strictEqual(oilReminder.isDue, false, '48,250 < 51,000 km so not yet due');

    const tireReminder = vehicle1Reminders.find(r => r.reminderType === 'TIRE_ROTATION');
    assert.strictEqual(tireReminder.milestoneKm, 50000, 'Tire rotation milestone should be 50,000 km');
    assert.strictEqual(tireReminder.isDue, false, '48,250 < 50,000 km so not yet due');

    console.log('✅ Test 3 Passed: ServiceCompletedEvent triggered invoice generation and provisioned 4 default rules with correct milestones.');

    // ------------------------------------------------------------------
    // TEST 4: Duplicate Prevention
    // ------------------------------------------------------------------
    console.log('\n--- Test 4: Duplicate Prevention on Subsequent Service Completion ---');
    const initialReminderCount = vehicle1Reminders.length;

    // Complete another appointment for vehicle 1
    const [appt2Res] = await pool.query(
      `INSERT INTO appointment (vehicle_id, mechanic_id, scheduled_start, duration_minutes, status)
       VALUES (?, ?, NOW(), 60, 'IN_PROGRESS');`,
      [vehicle1Id, testMechanic1.userId]
    );
    await appointmentService.updateAppointmentStatus(
      appt2Res.insertId,
      { status: 'COMPLETED', partsCost: 0, laborCost: 50, odometer: 48500 },
      testMechanic1
    );

    const afterSecondService = await reminderService.getRemindersForVehicle(vehicle1Id, testCustomer1);
    assert.strictEqual(
      afterSecondService.length,
      initialReminderCount,
      'Active reminder count should not increase because duplicate active rules are prevented'
    );
    console.log('✅ Test 4 Passed: No duplicate active reminders created on subsequent service completion.');

    // ------------------------------------------------------------------
    // TEST 5: Mileage Milestone Threshold Detection (Odometer >= Milestone)
    // ------------------------------------------------------------------
    console.log('\n--- Test 5: Mileage Milestone Threshold Detection ---');
    // Update vehicle odometer to 50,200 km (crosses Tire Rotation milestone of 50,000 km, but not Oil at 51,000 km)
    await vehicleRepo.updateOdometer(null, vehicle1Id, 50200);

    const reEvaluated = await reminderService.getRemindersForVehicle(vehicle1Id, testCustomer1);
    const updatedTire = reEvaluated.find(r => r.reminderType === 'TIRE_ROTATION');
    const updatedOil = reEvaluated.find(r => r.reminderType === 'OIL_SERVICE');

    assert.strictEqual(updatedTire.isDue, true, 'Tire rotation should now be DUE because 50,200 >= 50,000 km');
    assert.strictEqual(updatedTire.dueReason, 'MILEAGE_DUE');
    assert.strictEqual(updatedOil.isDue, false, 'Oil service should NOT be due because 50,200 < 51,000 km');
    console.log('✅ Test 5 Passed: Mileage threshold accurately detected when odometer crossed milestone.');

    // ------------------------------------------------------------------
    // TEST 6: Customer List Grouping and Sorting
    // ------------------------------------------------------------------
    console.log('\n--- Test 6: Customer List Grouping & Sorting ---');
    const customerReminders = await reminderService.getReminders(testCustomer1);
    assert.ok(customerReminders.length > 0, 'Customer should receive their reminders');
    // First element must be due
    assert.strictEqual(customerReminders[0].isDue, true, 'Due reminders must sort to top');
    console.log('✅ Test 6 Passed: Customer reminders return with DUE items prioritized at the top.');

    // ------------------------------------------------------------------
    // TEST 7: Multi-Tenant & Role Security Isolation
    // ------------------------------------------------------------------
    console.log('\n--- Test 7: Multi-Tenant & Role Security Isolation ---');

    // Customer 2 cannot access Vehicle 1 reminders
    try {
      await reminderService.getRemindersForVehicle(vehicle1Id, testCustomer2);
      assert.fail('Customer 2 should not be able to access Vehicle 1');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403, 'Should throw 403 Forbidden for vehicle owned by another user');
    }

    // Customer cannot create manual reminder
    try {
      await reminderService.createManualReminder(
        { vehicleId: vehicle1Id, reminderType: 'OIL_SERVICE', dueDate: '2026-12-31' },
        testCustomer1
      );
      assert.fail('Customer should not be able to create manual reminder');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403, 'Should throw 403 Forbidden for customer creating reminder');
    }

    // Mechanic from Other Workshop cannot create reminder on Vehicle 1
    try {
      await reminderService.createManualReminder(
        { vehicleId: vehicle1Id, reminderType: 'OIL_SERVICE', dueDate: '2026-12-31' },
        otherMechanic
      );
      assert.fail('Mechanic from another workshop should not be able to create reminder');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403, 'Should throw 403 Forbidden for cross-tenant mechanic');
    }
    console.log('✅ Test 7 Passed: Multi-tenant and role-based permissions strictly enforced.');

    // ------------------------------------------------------------------
    // TEST 8: Reminder Status Transition (COMPLETED / DISMISSED)
    // ------------------------------------------------------------------
    console.log('\n--- Test 8: Reminder Status Transition ---');
    const completed = await reminderService.updateReminderStatus(updatedTire.reminderId, 'COMPLETED', testCustomer1);
    assert.strictEqual(completed.status, 'COMPLETED');

    const activeList = await reminderRepo.findActiveByVehicleId(null, vehicle1Id);
    assert.strictEqual(
      activeList.some(r => r.reminderId === updatedTire.reminderId),
      false,
      'Completed reminder should no longer appear in active list'
    );
    console.log('✅ Test 8 Passed: Reminder status transitioned to COMPLETED and removed from active alerts.');

    console.log('\n=======================================================');
    console.log('🎉 ALL 8 MAINTENANCE REMINDER TESTS PASSED SUCCESSFULLY!');
    console.log('=======================================================');
  } catch (error) {
    console.error('\n❌ Test Suite Failed:', error);
    process.exit(1);
  } finally {
    // Teardown created test data
    if (testWorkshopId || otherWorkshopId) {
      await pool.query('SET FOREIGN_KEY_CHECKS = 0;');
      await pool.query('DELETE FROM invoice WHERE appointment_id IN (SELECT appointment_id FROM appointment WHERE vehicle_id IN (?, ?))', [vehicle1Id || 0, vehicle2Id || 0]);
      await pool.query('DELETE FROM reminder WHERE vehicle_id IN (?, ?)', [vehicle1Id || 0, vehicle2Id || 0]);
      await pool.query('DELETE FROM appointment WHERE vehicle_id IN (?, ?)', [vehicle1Id || 0, vehicle2Id || 0]);
      await pool.query('DELETE FROM vehicle WHERE vehicle_id IN (?, ?)', [vehicle1Id || 0, vehicle2Id || 0]);
      await pool.query('DELETE FROM mechanic WHERE user_id IN (?, ?)', [testMechanic1?.userId || 0, otherMechanic?.userId || 0]);
      await pool.query('DELETE FROM customer WHERE user_id IN (?, ?)', [testCustomer1?.userId || 0, testCustomer2?.userId || 0]);
      await pool.query('DELETE FROM user WHERE workshop_id IN (?, ?)', [testWorkshopId || 0, otherWorkshopId || 0]);
      await pool.query('DELETE FROM workshop WHERE workshop_id IN (?, ?)', [testWorkshopId || 0, otherWorkshopId || 0]);
      await pool.query('SET FOREIGN_KEY_CHECKS = 1;');
    }
    process.exit(0);
  }
}

runTests();
