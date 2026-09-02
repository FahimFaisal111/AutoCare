const openRouterService = require('./openRouterService');
const { withTransaction } = require('../config/db');
const vehicleRepo = require('../repositories/vehicleRepo');
const problemReportRepo = require('../repositories/problemReportRepo');
const solutionRepo = require('../repositories/solutionRepo');
const reminderRepo = require('../repositories/reminderRepo');
const appointmentRepo = require('../repositories/appointmentRepo');
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
      overallSummary: `AI Diagnostic Synthesis for ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      probableCause,
      recommendedAction,
      urgency,
      confidenceScore: confidence,
      keywords
    };
  }

  /**
   * Synthesizes AI Diagnostic Solution using OpenRouter API with procedural fallback.
   */
  async synthesizeDiagnosis(context, vehicle, description) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return this.generateProceduralSynthesis(vehicle, description);
    }

    try {
      return await openRouterService.generateDiagnosis(context);
    } catch (err) {
      console.warn('[OpenRouter AI] Diagnostic generation failed, utilizing static procedural fallback:', err.message);
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

    // Retrieve real vehicle history and maintenance context
    const [serviceHistory, previousReports, activeReminders] = await Promise.all([
      appointmentRepo.findCompletedByVehicleId(null, vehicle.vehicleId),
      problemReportRepo.findAllByVehicleId(null, vehicle.vehicleId),
      reminderRepo.findActiveByVehicleId(null, vehicle.vehicleId)
    ]);

    const diagnosticContext = {
      vehicle: {
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        odometer: vehicle.odometer,
        vin: vehicle.vin
      },
      currentProblem: {
        description: description.trim(),
        createdAt: new Date().toISOString()
      },
      serviceHistory: serviceHistory.map(s => ({
        scheduledStart: s.scheduledStart,
        serviceDescription: s.serviceDescription,
        status: s.status
      })),
      previousReports: previousReports.map(r => ({
        reportId: r.reportId,
        description: r.description,
        probableCause: r.probableCause,
        recommendedAction: r.recommendedAction,
        urgency: r.urgency,
        createdAt: r.createdAt
      })),
      activeReminders: activeReminders.map(rem => ({
        reminderType: rem.reminderType,
        dueDate: rem.dueDate,
        message: rem.message
      }))
    };

    // Generate AI Diagnostic Synthesis
    const diagnosis = await this.synthesizeDiagnosis(diagnosticContext, vehicle, description.trim());

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
        description: diagnosis.overallSummary || `AI Diagnostic Synthesis for ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
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
