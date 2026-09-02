/**
 * AutoCare AI - Diagnostic Assistant & OpenRouter Integration Test Suite
 * Validates real vehicle context assembly, prompt construction, structured response parsing,
 * database persistence (solution_report & solution_keyword), tenant isolation, error handling,
 * and procedural fallback behavior.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const assert = require('assert');
const http = require('http');
const app = require('../src/server');
const { pool } = require('../src/config/db');
const openRouterService = require('../src/services/openRouterService');
const problemReportService = require('../src/services/problemReportService');
const vehicleRepo = require('../src/repositories/vehicleRepo');
const appointmentRepo = require('../src/repositories/appointmentRepo');
const reminderRepo = require('../src/repositories/reminderRepo');
const problemReportRepo = require('../src/repositories/problemReportRepo');
const solutionRepo = require('../src/repositories/solutionRepo');

let server;
let baseUrl;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('-------------------------------------------------------------------');
  console.log('🧪 Running AI Diagnostic Assistant & OpenRouter Test Suite...');
  console.log('-------------------------------------------------------------------\n');

  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
  console.log(`📡 In-process test server listening on ${baseUrl}`);

  const runId = Date.now().toString().slice(-6);

  try {
    // ------------------------------------------------------------------
    // Setup Workshop 1, Customer 1, Mechanic 1, Vehicles
    // ------------------------------------------------------------------
    console.log('\n[1/17] Setting up multi-tenant test workshops, vehicles, and history...');

    const testAccessCode1 = `DIAG-WS1-${runId}`;
    const testAccessCode2 = `DIAG-WS2-${runId}`;

    const ws1Res = await request('/api/auth/register/workshop', {
      method: 'POST',
      body: {
        workshopName: `Diagnostic Workshop 1 ${runId}`,
        workshopAddress: '100 AI Lab Road',
        accessCode: testAccessCode1,
        firstName: 'Owner',
        lastName: 'One',
        email: `ws1_diag_${runId}@autocare.test`,
        password: 'Password123!'
      }
    });
    assert.strictEqual(ws1Res.status, 201, `Workshop 1 registration failed: ${JSON.stringify(ws1Res.data)}`);
    const ws1 = ws1Res.data;

    const cust1Res = await request('/api/auth/register/customer', {
      method: 'POST',
      body: {
        workshopAccessCode: testAccessCode1,
        firstName: 'Alice',
        lastName: 'Customer',
        email: `alice_${runId}@autocare.test`,
        phone: '555-0102',
        password: 'Password123!'
      }
    });
    assert.strictEqual(cust1Res.status, 201, `Customer 1 registration failed: ${JSON.stringify(cust1Res.data)}`);
    const cust1 = cust1Res.data;

    const mech1Res = await request('/api/auth/register/mechanic', {
      method: 'POST',
      body: {
        workshopAccessCode: testAccessCode1,
        firstName: 'Bob',
        lastName: 'Mechanic',
        email: `bob_${runId}@autocare.test`,
        password: 'Password123!',
        employeeCode: `TECH1-${runId}`
      }
    });
    assert.strictEqual(mech1Res.status, 201, `Mechanic 1 registration failed: ${JSON.stringify(mech1Res.data)}`);
    const mech1 = mech1Res.data;

    // Create Vehicle 1 (with history) and Vehicle 2 (fresh, zero history)
    const v1Res = await request('/api/vehicles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cust1.token}` },
      body: {
        vin: `1HGCR2F83HA${runId.slice(0, 6)}`,
        make: 'Honda',
        model: 'Accord',
        year: 2018,
        odometer: 64200
      }
    });
    assert.strictEqual(v1Res.status, 201);
    const v1 = v1Res.data;

    const v2Res = await request('/api/vehicles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cust1.token}` },
      body: {
        vin: `2T1BURHE5JC${runId.slice(0, 6)}`,
        make: 'Toyota',
        model: 'Corolla',
        year: 2022,
        odometer: 14500
      }
    });
    assert.strictEqual(v2Res.status, 201);
    const v2 = v2Res.data;

    // Insert historical service records for Vehicle 1
    await appointmentRepo.create(null, {
      vehicleId: v1.vehicleId,
      mechanicId: mech1.userId,
      reportId: null,
      scheduledStart: '2026-06-15 10:00:00',
      durationMinutes: 60,
      status: 'COMPLETED',
      serviceDescription: 'Replaced front ceramic brake pads and resurfaced rotors',
      partsCost: 150.00,
      laborCost: 95.00
    });

    // Insert active reminder for Vehicle 1
    await reminderRepo.create(null, {
      vehicleId: v1.vehicleId,
      reminderType: 'BRAKE_INSPECTION',
      dueDate: '2026-10-01',
      message: 'Routine bi-annual brake system inspection',
      status: 'ACTIVE'
    });

    // Insert prior problem report & AI diagnosis for Vehicle 1
    const priorReportId = await problemReportRepo.create(null, {
      customerId: cust1.userId,
      vehicleId: v1.vehicleId,
      description: 'Customer noticed light high-pitched squeal when stopping in wet weather.',
      status: 'RESOLVED'
    });
    const priorSolId = await solutionRepo.createSolutionReport(null, {
      reportId: priorReportId,
      description: 'Prior AI Assessment',
      probableCause: 'Moisture adhesion on rotor surface or initial wear indicator contact',
      recommendedAction: 'Inspect pad thickness and check brake hardware lubrication',
      urgency: 'LOW',
      confidenceScore: 0.88,
      reviewedBy: mech1.userId
    });
    await solutionRepo.batchInsertKeywords(null, priorSolId, ['brake squeal', 'rotor moisture', 'pad thickness']);

    console.log('✅ Multi-tenant test setup completed.');

    // ------------------------------------------------------------------
    // Test 2: Real Problem Report Context Retrieval
    // ------------------------------------------------------------------
    console.log('\n[2/17] Testing real problem report context retrieval...');
    const serviceHistory = await appointmentRepo.findCompletedByVehicleId(null, v1.vehicleId);
    assert(serviceHistory.length >= 1, 'Should find completed service history');
    assert.strictEqual(serviceHistory[0].serviceDescription, 'Replaced front ceramic brake pads and resurfaced rotors');
    console.log('✅ Real service history correctly retrieved from database.');

    // ------------------------------------------------------------------
    // Test 3: Active Reminders Retrieval
    // ------------------------------------------------------------------
    console.log('\n[3/17] Testing active reminders retrieval...');
    const activeReminders = await reminderRepo.findActiveByVehicleId(null, v1.vehicleId);
    assert(activeReminders.length >= 1, 'Should find active reminders for vehicle');
    assert(activeReminders.some(r => r.reminderType === 'BRAKE_INSPECTION'), 'Should find the brake inspection reminder');
    console.log('✅ Active reminders correctly retrieved.');

    // ------------------------------------------------------------------
    // Test 4: Previous Problem Reports & Solution History Retrieval
    // ------------------------------------------------------------------
    console.log('\n[4/17] Testing previous problem reports & solution history retrieval...');
    const previousReports = await problemReportRepo.findAllByVehicleId(null, v1.vehicleId);
    assert(previousReports.length >= 1);
    assert(previousReports[0].probableCause.includes('Moisture adhesion'));
    console.log('✅ Previous problem and solution history correctly retrieved.');

    // ------------------------------------------------------------------
    // Test 5: OpenRouter Prompt Construction with Structured Sections
    // ------------------------------------------------------------------
    console.log('\n[5/17] Testing OpenRouter prompt construction and grounding rules...');
    const context = {
      vehicle: { year: 2018, make: 'Honda', model: 'Accord', odometer: 64200, vin: '1HGCR2F83HA...' },
      currentProblem: { description: 'Intermittent grinding sound when applying hard brakes at highway speeds.', createdAt: '2026-09-02T10:00:00.000Z' },
      serviceHistory: serviceHistory.map(s => ({ scheduledStart: s.scheduledStart, serviceDescription: s.serviceDescription, status: s.status })),
      previousReports: previousReports.map(r => ({ reportId: r.reportId, description: r.description, probableCause: r.probableCause, recommendedAction: r.recommendedAction, urgency: r.urgency, createdAt: r.createdAt })),
      activeReminders: activeReminders.map(rem => ({ reminderType: rem.reminderType, dueDate: rem.dueDate, message: rem.message }))
    };

    const prompt = openRouterService.buildPrompt(context);
    assert(prompt.includes('--- VEHICLE SPECIFICATIONS ---'), 'Prompt must contain vehicle section');
    assert(prompt.includes('Honda') && prompt.includes('Accord'), 'Prompt must contain vehicle make and model');
    assert(prompt.includes('--- CURRENT REPORTED PROBLEM ---'), 'Prompt must contain current problem');
    assert(prompt.includes('--- CONFIRMED SERVICE HISTORY ---'), 'Prompt must contain service history');
    assert(prompt.includes('--- PREVIOUS PROBLEM REPORTS & AI ASSESSMENTS ---'), 'Prompt must contain prior reports');
    assert(prompt.includes('Advisory Suggestion Only'), 'Prompt must explicitly mark prior AI diagnoses as advisory suggestions');
    assert(prompt.includes('--- ACTIVE MAINTENANCE REMINDERS ---'), 'Prompt must contain active reminders');
    assert(prompt.includes('--- REASONING INSTRUCTIONS & CONSTRAINTS ---'), 'Prompt must contain strict grounding rules');
    console.log('✅ Prompt correctly built with strict facts, historical separation, and grounding constraints.');

    // ------------------------------------------------------------------
    // Test 6: API Key Handling & Security (No Secret Exposure)
    // ------------------------------------------------------------------
    console.log('\n[6/17] Verifying API key is handled securely without leaking secrets...');
    const model = openRouterService.getModel();
    assert(typeof model === 'string' && model.length > 0, 'Configured model must be string');
    assert(!prompt.includes(process.env.OPENROUTER_API_KEY || 'fake_key'), 'Prompt must never contain the API key');
    console.log('✅ Model configured:', model, '| API Key secured safely.');

    // ------------------------------------------------------------------
    // Test 7: Structured AI Response Parsing & Validation
    // ------------------------------------------------------------------
    console.log('\n[7/17] Testing structured AI JSON response parser and validator...');
    const mockModelOutput = JSON.stringify({
      overall_summary: "Customer reports intermittent grinding under heavy braking. Given front pads were replaced 3 months ago, issue likely relates to rear friction assembly or rotor surface variation.",
      probable_cause: "Rear brake pad wear or uneven friction deposition on rear brake rotors.",
      recommended_action: "1. Inspect rear brake pad lining thickness. 2. Measure rotor thickness runout with dial indicator. 3. Check caliper slide pin lubrication.",
      urgency: "MEDIUM",
      confidence_score: 0.895,
      keywords: ["rear brake pads", "rotor runout", "brake grinding", "caliper slide pins"]
    });

    const parsedOutput = openRouterService.parseAndValidateResponse(mockModelOutput);
    assert.strictEqual(parsedOutput.urgency, 'MEDIUM');
    assert.strictEqual(parsedOutput.confidenceScore, 0.895);
    assert.strictEqual(parsedOutput.keywords.length, 4);
    assert(parsedOutput.keywords.includes('rear brake pads'));
    console.log('✅ Structured JSON response parsed and validated successfully.');

    // ------------------------------------------------------------------
    // Test 8 & 9: Full Problem Report Submission & Database Persistence
    // ------------------------------------------------------------------
    console.log('\n[8/17] Testing problem report submission & transactional persistence...');
    const submitRes = await request('/api/problem-reports', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cust1.token}` },
      body: {
        vehicleId: v1.vehicleId,
        description: 'Brake pedal feels spongy and there is a squeal when slowing down.'
      }
    });

    assert.strictEqual(submitRes.status, 201, `Expected 201 Created, got ${submitRes.status}`);
    const reportData = submitRes.data;
    assert(reportData.reportId > 0, 'Report ID must be generated');
    assert(reportData.solution && reportData.solution.solutionId > 0, 'Solution ID must be generated (1:1 relationship)');
    assert(reportData.solution.probableCause, 'Probable cause must be populated');
    assert(reportData.solution.recommendedAction, 'Recommended action must be populated');
    assert(['HIGH', 'MEDIUM', 'LOW'].includes(reportData.solution.urgency), 'Urgency must be valid');
    assert(reportData.solution.confidenceScore >= 0 && reportData.solution.confidenceScore <= 1, 'Confidence score must be valid');
    assert(Array.isArray(reportData.solution.keywords) && reportData.solution.keywords.length > 0, 'Keywords must be persisted');

    // Verify raw database records
    const [dbSolution] = await pool.query('SELECT * FROM solution_report WHERE report_id = ?', [reportData.reportId]);
    assert.strictEqual(dbSolution.length, 1, 'Exactly one solution_report row must exist for report');

    const [dbKeywords] = await pool.query('SELECT * FROM solution_keyword WHERE solution_id = ?', [reportData.solution.solutionId]);
    assert(dbKeywords.length > 0, 'solution_keyword entries must be inserted in database');
    console.log('✅ Problem report, solution report (1:1), and keywords persisted accurately.');

    // ------------------------------------------------------------------
    // Test 10: Invalid Model Response Handling
    // ------------------------------------------------------------------
    console.log('\n[10/17] Testing invalid model output parsing fallback...');
    assert.throws(() => {
      openRouterService.parseAndValidateResponse('NOT VALID JSON');
    }, /Failed to parse OpenRouter JSON output/);

    assert.throws(() => {
      openRouterService.parseAndValidateResponse(JSON.stringify({
        urgency: 'HIGH',
        keywords: ['test']
      }));
    }, /missing required diagnostic fields/);
    console.log('✅ Malformed and incomplete model responses correctly rejected.');

    // ------------------------------------------------------------------
    // Test 11: OpenRouter API Failure / Fallback Handling
    // ------------------------------------------------------------------
    console.log('\n[11/17] Testing procedural fallback when AI provider encounters an error...');
    // Procedural synthesis generates deterministic valid structured output without crashing
    const procedural = problemReportService.generateProceduralSynthesis(v1, 'Engine misfire on cylinder 2 with check engine light');
    assert(procedural.probableCause.includes('Powertrain combustion instability'));
    assert.strictEqual(procedural.urgency, 'HIGH');
    assert(procedural.keywords.includes('engine misfire'));
    console.log('✅ Deterministic procedural fallback reliably generated.');

    // ------------------------------------------------------------------
    // Test 12: Missing OpenRouter Key Behavior
    // ------------------------------------------------------------------
    console.log('\n[12/17] Testing missing API key behavior...');
    const originalKey = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;

    const noKeyRes = await request('/api/problem-reports', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cust1.token}` },
      body: {
        vehicleId: v1.vehicleId,
        description: 'Battery terminal has blue corrosion and slow crank in the morning.'
      }
    });
    assert.strictEqual(noKeyRes.status, 201, 'Should seamlessly fallback to procedural synthesis');
    assert(noKeyRes.data.solution && noKeyRes.data.solution.probableCause.includes('Electrical starting & charging fault'));
    process.env.OPENROUTER_API_KEY = originalKey;
    console.log('✅ Graceful fallback verified when API key is unconfigured.');

    // ------------------------------------------------------------------
    // Test 13: Tenant Isolation (Workshop 1 vs Workshop 2)
    // ------------------------------------------------------------------
    console.log('\n[13/17] Testing multi-tenant isolation on problem report submission...');
    const ws2Res = await request('/api/auth/register/workshop', {
      method: 'POST',
      body: {
        workshopName: `Isolated Tenant 2 ${runId}`,
        workshopAddress: '200 Other City',
        accessCode: testAccessCode2,
        firstName: 'Owner',
        lastName: 'Two',
        email: `ws2_diag_${runId}@autocare.test`,
        password: 'Password123!'
      }
    });
    assert.strictEqual(ws2Res.status, 201, `Workshop 2 registration failed: ${JSON.stringify(ws2Res.data)}`);

    const cust2Res = await request('/api/auth/register/customer', {
      method: 'POST',
      body: {
        workshopAccessCode: testAccessCode2,
        firstName: 'Charlie',
        lastName: 'TenantTwo',
        email: `charlie_${runId}@autocare.test`,
        phone: '555-0202',
        password: 'Password123!'
      }
    });
    assert.strictEqual(cust2Res.status, 201, `Customer 2 registration failed: ${JSON.stringify(cust2Res.data)}`);
    const cust2Token = cust2Res.data.token;

    // Customer from Workshop 2 attempts to file report for Vehicle 1 (owned in Workshop 1)
    const crossTenantRes = await request('/api/problem-reports', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cust2Token}` },
      body: {
        vehicleId: v1.vehicleId,
        description: 'Unauthorized diagnostic probe attempt.'
      }
    });
    assert.strictEqual(crossTenantRes.status, 403, 'Cross-tenant diagnostic submission must be forbidden (403)');
    console.log('✅ Strict multi-tenant vehicle isolation verified.');

    // ------------------------------------------------------------------
    // Test 14: Vehicle with Zero Previous History
    // ------------------------------------------------------------------
    console.log('\n[14/17] Testing diagnostic context for brand new vehicle with zero history...');
    const v2History = await appointmentRepo.findCompletedByVehicleId(null, v2.vehicleId);
    const v2Reports = await problemReportRepo.findAllByVehicleId(null, v2.vehicleId);

    assert.strictEqual(v2History.length, 0, 'New vehicle should have 0 completed service history');
    assert.strictEqual(v2Reports.length, 0, 'New vehicle should have 0 previous problem reports');

    const v2Context = {
      vehicle: v2,
      currentProblem: { description: 'Tire pressure indicator came on.', createdAt: new Date().toISOString() },
      serviceHistory: [],
      previousReports: [],
      activeReminders: []
    };
    const v2Prompt = openRouterService.buildPrompt(v2Context);
    assert(v2Prompt.includes('No previous completed service history on record for this vehicle.'));
    assert(v2Prompt.includes('No previous problem reports on record for this vehicle.'));
    assert(v2Prompt.includes('No active maintenance reminders for this vehicle.'));
    console.log('✅ Clean vehicle history correctly acknowledged without hallucinating records.');

    // ------------------------------------------------------------------
    // Test 15: Prior AI Diagnosis Treated as Suggestion
    // ------------------------------------------------------------------
    console.log('\n[15/17] Verifying prior AI diagnosis is labeled as advisory suggestion...');
    assert(prompt.includes('Previous AI Suggestion:'));
    assert(prompt.includes('(Advisory Suggestion Only)'));
    console.log('✅ Prior AI assessments cleanly isolated from mechanical service records.');

    // ------------------------------------------------------------------
    // Test 16: Mechanic Verification / Status Review Flow
    // ------------------------------------------------------------------
    console.log('\n[16/17] Testing mechanic verification and problem report review...');
    const mechReviewRes = await request(`/api/problem-reports/${reportData.reportId}`, {
      headers: { Authorization: `Bearer ${mech1.token}` }
    });
    assert.strictEqual(mechReviewRes.status, 200);
    assert.strictEqual(mechReviewRes.data.reportId, reportData.reportId);
    assert(mechReviewRes.data.solution && mechReviewRes.data.solution.probableCause);
    assert(mechReviewRes.data.solution && mechReviewRes.data.solution.recommendedAction);
    console.log('✅ Certified mechanic successfully inspected diagnostic report.');

    // ------------------------------------------------------------------
    // Test 17: Duplicate Solution Report Prevention
    // ------------------------------------------------------------------
    console.log('\n[17/17] Testing 1:1 solution report integrity...');
    const [solCount] = await pool.query('SELECT COUNT(*) AS count FROM solution_report WHERE report_id = ?', [reportData.reportId]);
    assert.strictEqual(solCount[0].count, 1, 'Only one solution report can exist per problem report');
    console.log('✅ 1:1 relational constraint verified.');

    console.log('\n===================================================================');
    console.log('🎉 ALL 17 AI DIAGNOSTIC ASSISTANT TESTS PASSED SUCCESSFULLY!');
    console.log('===================================================================\n');

  } finally {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
