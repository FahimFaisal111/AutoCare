/**
 * AutoCare AI - Problem Report & AI Diagnostic Service
 * Synthesizes root-cause analysis via Google Gemini API with static procedural fallback
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { withTransaction } = require('../config/db');
const vehicleRepo = require('../repositories/vehicleRepo');
const problemReportRepo = require('../repositories/problemReportRepo');
const solutionRepo = require('../repositories/solutionRepo');
const reminderRepo = require('../repositories/reminderRepo');
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError
} = require('../middleware/errorHandler');

class ProblemReportService {
  /**
   * Procedural Fallback Engine: Generates deterministic diagnostic synthesis
   */
  generateProceduralSynthesis(vehicle, description) {
    const lowerDesc = description.toLowerCase();
    let probableCause;
    let recommendedAction;
    let urgency;
    let confidence;
    const keywords = [];

    if (lowerDesc.includes('brake') || lowerDesc.includes('squeak') || lowerDesc.includes('grind') || lowerDesc.includes('stopping')) {
      probableCause = 'Friction assembly degradation: Pad lining thickness below minimum safety spec or rotor glazing causing resonant friction.';
      recommendedAction = 'Inspect front and rear brake pads, verify rotor runout and thickness, replace with OEM ceramic pads and bleed brake lines.';
      urgency = 'MEDIUM';
      confidence = 0.925;
      keywords.push('brake pads', 'rotor friction', 'wear indicator', 'stopping distance');
    } else if (lowerDesc.includes('engine') || lowerDesc.includes('misfire') || lowerDesc.includes('check engine') || lowerDesc.includes('shudder') || lowerDesc.includes('stall')) {
      probableCause = 'Powertrain combustion instability: Potential ignition coil breakdown, fouled spark plug, or mass airflow sensor drift.';
      recommendedAction = 'Run comprehensive OBD-II live diagnostic scan, perform cylinder misfire count test, inspect ignition coils and spark plug gap.';
      urgency = 'HIGH';
      confidence = 0.940;
      keywords.push('engine misfire', 'check engine', 'ignition coil', 'spark plugs');
    } else if (lowerDesc.includes('battery') || lowerDesc.includes('start') || lowerDesc.includes('crank') || lowerDesc.includes('alternator') || lowerDesc.includes('electric')) {
      probableCause = 'Electrical starting & charging fault: 12V lead-acid battery terminal sulfation or degraded cold-cranking amps (CCA).';
      recommendedAction = 'Perform load test on 12V battery, check alternator charging voltage (spec 13.8V-14.4V), clean terminal posts.';
      urgency = 'MEDIUM';
      confidence = 0.890;
      keywords.push('battery test', 'alternator charging', 'starter draw', 'cca capacity');
    } else if (lowerDesc.includes('ac') || lowerDesc.includes('air') || lowerDesc.includes('heat') || lowerDesc.includes('cold') || lowerDesc.includes('climate')) {
      probableCause = 'HVAC thermal regulation fault: Low refrigerant charge due to service port micro-leak or blend door actuator failure.';
      recommendedAction = 'Recover refrigerant, pressure test HVAC loop with nitrogen dye, replace Schrader seals and recharge to factory weight specification.';
      urgency = 'LOW';
      confidence = 0.865;
      keywords.push('hvac pressure', 'refrigerant leak', 'compressor clutch', 'blend door');
    } else if (lowerDesc.includes('tire') || lowerDesc.includes('vibration') || lowerDesc.includes('shake') || lowerDesc.includes('steering') || lowerDesc.includes('alignment')) {
      probableCause = 'Chassis dynamics variance: Dynamic wheel imbalance, uneven tread feathering, or tie rod / ball joint play.';
      recommendedAction = 'Perform 4-wheel computerized laser alignment check, dynamically balance all four tires, and inspect steering linkage torque.';
      urgency = 'MEDIUM';
      confidence = 0.910;
      keywords.push('wheel balance', 'laser alignment', 'tire wear', 'steering tie-rod');
    } else {
      probableCause = 'General mechanical symptom detected: Subsystem requires physical inspection by a certified service technician.';
      recommendedAction = 'Perform comprehensive multi-point vehicle diagnostic sweep, check OBD-II fault codes, and road test under matching load conditions.';
      urgency = 'MEDIUM';
      confidence = 0.815;
      keywords.push('diagnostic inspection', 'obd scan', 'physical road test');
    }

    return {
      description: `AI Diagnostic Synthesis for ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      probableCause,
      recommendedAction,
      urgency,
      confidenceScore: confidence,
      keywords
    };
  }

  /**
   * Synthesizes AI Diagnostic Solution using Google Gemini API with procedural fallback.
   */
  async synthesizeDiagnosis(vehicle, description) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return this.generateProceduralSynthesis(vehicle, description);
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
You are an expert master automotive diagnostic AI. Analyze the following vehicle symptom report:
Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model} (VIN: ${vehicle.vin}, Odometer: ${vehicle.odometer} miles)
Symptom Description: "${description}"

Respond with ONLY a raw valid JSON object with NO markdown formatting or code fences. Format:
{
  "probableCause": "Precise mechanical/electrical root cause hypothesis",
  "recommendedAction": "Actionable technical repair and diagnostic steps",
  "urgency": "HIGH" | "MEDIUM" | "LOW",
  "confidenceScore": 0.92,
  "keywords": ["keyword 1", "keyword 2", "keyword 3", "keyword 4"]
}
`;
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        description: `AI Diagnostic Synthesis for ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        probableCause: parsed.probableCause || 'Mechanical inspection required.',
        recommendedAction: parsed.recommendedAction || 'Perform standard multi-point inspection.',
        urgency: ['HIGH', 'MEDIUM', 'LOW'].includes(parsed.urgency?.toUpperCase()) ? parsed.urgency.toUpperCase() : 'MEDIUM',
        confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 0.90,
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map(k => String(k).toLowerCase().trim()) : ['diagnostic inspection']
      };
    } catch (err) {
      console.warn('[Gemini AI] AI call failed or timed out, using static fallback:', err.message);
      return this.generateProceduralSynthesis(vehicle, description);
    }
  }

  /**
   * File a problem report and synthesize AI diagnostic solution.
   */
  async createProblemReport({ vehicleId, description }, userPrincipal) {
    if (!vehicleId || !description || !description.trim()) {
      throw new BadRequestError('Vehicle ID and problem description are required.');
    }

    const vehicle = await vehicleRepo.findById(null, vehicleId);
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    if (vehicle.workshopId !== userPrincipal.workshopId) {
      throw new ForbiddenError('Vehicle belongs to another workshop tenant.');
    }

    if (userPrincipal.role === 'CUSTOMER' && vehicle.ownerId !== userPrincipal.userId) {
      throw new ForbiddenError('You can only report issues for your own vehicles.');
    }

    // Generate AI Diagnostic Synthesis
    const diagnosis = await this.synthesizeDiagnosis(vehicle, description.trim());

    return withTransaction(async (conn) => {
      // 1. Create problem report row
      const reportId = await problemReportRepo.create(conn, {
        customerId: userPrincipal.userId,
        vehicleId: vehicle.vehicleId,
        description: description.trim(),
        status: 'OPEN'
      });

      // 2. Create solution report row
      const solutionId = await solutionRepo.createSolutionReport(conn, {
        reportId,
        description: diagnosis.description,
        probableCause: diagnosis.probableCause,
        recommendedAction: diagnosis.recommendedAction,
        urgency: diagnosis.urgency,
        confidenceScore: diagnosis.confidenceScore,
        reviewedBy: null
      });

      // 3. Batch insert keywords
      await solutionRepo.batchInsertKeywords(conn, solutionId, diagnosis.keywords);

      // 4. Return assembled report object
      const report = await problemReportRepo.findById(conn, reportId);
      return this.formatReportResponse(report, diagnosis.keywords);
    });
  }

  /**
   * Retrieve problem reports accessible to authenticated user.
   */
  async getProblemReports(userPrincipal) {
    let reports;
    if (userPrincipal.role === 'CUSTOMER') {
      reports = await problemReportRepo.findAllByCustomerId(null, userPrincipal.userId);
    } else {
      reports = await problemReportRepo.findAllByWorkshopId(null, userPrincipal.workshopId);
    }

    const solutionIds = reports.map(r => r.solutionId).filter(Boolean);
    const keywordsMap = await solutionRepo.findKeywordsBySolutionIds(null, solutionIds);

    return reports.map(r => this.formatReportResponse(r, keywordsMap[r.solutionId] || []));
  }

  /**
   * Retrieve single problem report by ID with tenant checks.
   */
  async getProblemReportById(reportId, userPrincipal) {
    const report = await problemReportRepo.findById(null, reportId);
    if (!report) {
      throw new NotFoundError('Problem report not found');
    }

    if (report.workshopId !== userPrincipal.workshopId) {
      throw new ForbiddenError('Unauthorized access to report outside your workshop tenant.');
    }

    if (userPrincipal.role === 'CUSTOMER' && report.customerId !== userPrincipal.userId) {
      throw new ForbiddenError('Unauthorized access to report filed by another customer.');
    }

    const keywords = report.solutionId ? await solutionRepo.findKeywordsBySolutionId(null, report.solutionId) : [];
    return this.formatReportResponse(report, keywords);
  }

  /**
   * Certified Mechanic or Workshop Admin reviews diagnostic solution.
   */
  async reviewReportByMechanic(reportId, userPrincipal) {
    if (userPrincipal.role !== 'MECHANIC' && userPrincipal.role !== 'ADMIN') {
      throw new ForbiddenError('Only certified mechanics or workshop managers can review diagnostic solutions.');
    }

    const report = await problemReportRepo.findById(null, reportId);
    if (!report) {
      throw new NotFoundError('Problem report not found');
    }

    if (report.workshopId !== userPrincipal.workshopId) {
      throw new ForbiddenError('Unauthorized access to report outside your workshop tenant.');
    }

    if (report.solutionId) {
      await solutionRepo.updateReviewedBy(null, reportId, userPrincipal.userId);
    }

    return this.getProblemReportById(reportId, userPrincipal);
  }

  /*Comment : Replaces the earlier "chat about an unbooked diagnosis" idea, which hit a hard wall (chat needs an appointment that doesn't exist yet). This is the one-click "automatic reply" instead - a real REMINDER row on the customer's vehicle, reusing the existing REMINDER table (zero schema change), which already surfaces on the customer's dashboard under Predictive Maintenance Alerts. Not a fake confirmation toast - the customer genuinely sees this appear. */
  async requestAppointmentReminder(reportId, userPrincipal) {
    if (userPrincipal.role !== 'MECHANIC' && userPrincipal.role !== 'ADMIN') {
      throw new ForbiddenError('Only certified mechanics or workshop managers can request an appointment.');
    }

    const report = await problemReportRepo.findById(null, reportId);
    if (!report) {
      throw new NotFoundError('Problem report not found');
    }
    if (report.workshopId !== userPrincipal.workshopId) {
      throw new ForbiddenError('Unauthorized access to report outside your workshop tenant.');
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const dueDateStr = dueDate.toISOString().slice(0, 10);

    const summary = report.description.length > 80 ? `${report.description.slice(0, 80)}...` : report.description;
    const message = `Your mechanic reviewed your reported issue ("${summary}") and recommends booking a service appointment. Enter code ${reportId} as the AI Diagnosis Code when booking to link it to this diagnosis.`;

    await reminderRepo.create(null, {
      vehicleId: report.vehicleId,
      reminderType: 'Appointment Requested',
      dueDate: dueDateStr,
      message,
      status: 'ACTIVE'
    });

    return this.getProblemReportById(reportId, userPrincipal);
  }

  /**
   * Helper: Format database join into expected ProblemReport DTO response
   */
  formatReportResponse(row, keywords = []) {
    let solution = null;
    if (row.solutionId) {
      solution = {
        solutionId: row.solutionId,
        description: row.solutionDescription,
        probableCause: row.probableCause,
        recommendedAction: row.recommendedAction,
        urgency: row.urgency,
        confidenceScore: parseFloat(row.confidenceScore),
        reviewedBy: row.reviewedBy || undefined,
        reviewerName: row.reviewerName || undefined,
        keywords: keywords || []
      };
    }

    return {
      reportId: row.reportId,
      customerId: row.customerId,
      customerName: row.customerName,
      vehicleId: row.vehicleId,
      vehicleInfo: row.vehicleInfo,
      description: row.description,
      status: row.status,
      createdAt: row.createdAt,
      solution: solution || undefined
    };
  }
}

module.exports = new ProblemReportService();
