/**
 * AutoCare AI - Predictive Maintenance Reminder Service
 * Pure Raw Parameterized SQL (Zero ORM)
 * 
 * Default Preventive-Maintenance Rules:
 * Note: These are in-code default preventive-maintenance rules provided as operational guidelines,
 * not manufacturer-specific guarantees.
 */

const reminderRepo = require('../repositories/reminderRepo');
const vehicleRepo = require('../repositories/vehicleRepo');
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError
} = require('../middleware/errorHandler');

/**
 * In-code default preventive-maintenance rules (Not a DB table)
 */
const DEFAULT_MAINTENANCE_RULES = [
  {
    reminderType: 'OIL_SERVICE',
    ruleType: 'mileage',
    interval: 3000,
    label: 'Oil & Filter Service',
    description: 'Default preventive-maintenance rule: Engine oil and filter replacement every 3,000 km.'
  },
  {
    reminderType: 'TIRE_ROTATION',
    ruleType: 'mileage',
    interval: 5000,
    label: 'Tire Rotation & Balance',
    description: 'Default preventive-maintenance rule: Tire rotation and tread wear inspection every 5,000 km.'
  },
  {
    reminderType: 'BRAKE_INSPECTION',
    ruleType: 'time',
    intervalMonths: 6,
    label: 'Brake System Inspection',
    description: 'Default preventive-maintenance rule: Multi-point brake pad, rotor, and fluid inspection every 6 months.'
  },
  {
    reminderType: 'COOLANT_SERVICE',
    ruleType: 'time',
    intervalMonths: 24,
    label: 'Coolant Flush & Cooling Check',
    description: 'Default preventive-maintenance rule: Radiator coolant exchange and cooling system pressure test every 2 years.'
  }
];

class ReminderService {
  /**
   * Helper: Add months to current date formatted as YYYY-MM-DD
   */
  getFutureDate(months) {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  }

  /**
   * Helper: Extract mileage milestone from reminder message text
   * Format matches: "Target milestone: 51000 km" or "due around 51,000 km"
   */
  extractMilestoneKm(message) {
    if (!message) return null;
    const match = message.match(/(?:Target milestone:\s*|due around\s*)([\d,]+)\s*km/i);
    if (match) {
      return parseInt(match[1].replace(/,/g, ''), 10);
    }
    return null;
  }

  /**
   * Enrich reminder row with live computed due flags.
   */
  enrichReminder(r) {
    const todayStr = new Date().toISOString().split('T')[0];
    const milestoneKm = this.extractMilestoneKm(r.message);
    const currentOdo = r.currentOdometer !== undefined && r.currentOdometer !== null ? Number(r.currentOdometer) : null;

    let isDue = false;
    let dueReason = 'UPCOMING';

    // 1. Calendar due check
    if (r.dueDate && r.dueDate <= todayStr) {
      isDue = true;
      dueReason = 'CALENDAR_DUE';
    }

    // 2. Mileage milestone check
    if (milestoneKm !== null && currentOdo !== null && currentOdo >= milestoneKm) {
      isDue = true;
      dueReason = 'MILEAGE_DUE';
    }

    // 3. Status override
    if (r.status === 'DUE') {
      isDue = true;
      if (dueReason === 'UPCOMING') {
        dueReason = 'CALENDAR_DUE';
      }
    }

    return {
      reminderId: r.reminderId,
      vehicleId: r.vehicleId,
      vehicleInfo: r.vehicleInfo,
      vin: r.vin,
      currentOdometer: currentOdo,
      reminderType: r.reminderType,
      dueDate: r.dueDate,
      message: r.message,
      status: r.status,
      isDue,
      dueReason,
      milestoneKm,
      createdAt: r.createdAt
    };
  }

  /**
   * Evaluates the 4 default preventive-maintenance rules for a vehicle and inserts missing active reminders.
   * Triggered automatically on ServiceCompletedEvent or vehicle initialization.
   */
  async evaluatePreventiveRulesForVehicle(vehicleId, executor = null) {
    const vehicle = await vehicleRepo.findById(executor, vehicleId);
    if (!vehicle) return [];

    const currentOdometer = parseInt(vehicle.odometer || 0, 10);
    const createdReminders = [];

    for (const rule of DEFAULT_MAINTENANCE_RULES) {
      // Check if an ACTIVE or DUE reminder for this rule already exists
      const existing = await reminderRepo.findActiveByVehicleAndType(executor, vehicleId, rule.reminderType);
      if (existing) {
        continue;
      }

      if (rule.ruleType === 'mileage') {
        // Milestone = next multiple of interval strictly above current odometer
        const milestone = (Math.floor(currentOdometer / rule.interval) + 1) * rule.interval;
        
        // Estimated placeholder due date (approx 3-4 months out)
        const dueDate = this.getFutureDate(4);
        const message = `Default preventive-maintenance rule: ${rule.label} due around ${milestone.toLocaleString()} km (Target milestone: ${milestone} km).`;
        const initialStatus = currentOdometer >= milestone ? 'DUE' : 'ACTIVE';

        const reminderId = await reminderRepo.create(executor, {
          vehicleId,
          reminderType: rule.reminderType,
          dueDate,
          message,
          status: initialStatus
        });
        createdReminders.push({ reminderId, reminderType: rule.reminderType, milestone });
      } else if (rule.ruleType === 'time') {
        const dueDate = this.getFutureDate(rule.intervalMonths);
        const message = `Default preventive-maintenance rule: ${rule.label} due every ${rule.intervalMonths} months.`;

        const reminderId = await reminderRepo.create(executor, {
          vehicleId,
          reminderType: rule.reminderType,
          dueDate,
          message,
          status: 'ACTIVE'
        });
        createdReminders.push({ reminderId, reminderType: rule.reminderType, dueDate });
      }
    }

    return createdReminders;
  }

  /**
   * Fetch reminders accessible to the authenticated user.
   * Customer sees only their owned vehicles' reminders.
   * Mechanics/Admins see all reminders within their workshop tenant.
   */
  async getReminders(userPrincipal) {
    let rows;
    if (userPrincipal.role === 'CUSTOMER') {
      rows = await reminderRepo.findAllByOwnerId(null, userPrincipal.userId);
    } else {
      rows = await reminderRepo.findAllByWorkshopId(null, userPrincipal.workshopId);
    }

    const enriched = rows.map(r => this.enrichReminder(r));

    // Sort: Due items first, then by due date ascending
    return enriched.sort((a, b) => {
      if (a.isDue && !b.isDue) return -1;
      if (!a.isDue && b.isDue) return 1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  }

  /**
   * Fetch reminders for a specific vehicle with tenant & ownership validation.
   */
  async getRemindersForVehicle(vehicleId, userPrincipal) {
    const vehicle = await vehicleRepo.findById(null, vehicleId);
    if (!vehicle) {
      throw new NotFoundError(`Vehicle not found with ID: ${vehicleId}`);
    }

    if (vehicle.workshopId !== userPrincipal.workshopId) {
      throw new ForbiddenError('Unauthorized access to vehicle outside your workshop tenant.');
    }

    if (userPrincipal.role === 'CUSTOMER' && vehicle.ownerId !== userPrincipal.userId) {
      throw new ForbiddenError('Unauthorized access to vehicle owned by another user.');
    }

    const rows = await reminderRepo.findAllByVehicleId(null, vehicleId);
    const enriched = rows.map(r => this.enrichReminder(r));

    return enriched.sort((a, b) => {
      if (a.isDue && !b.isDue) return -1;
      if (!a.isDue && b.isDue) return 1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  }

  /**
   * Mechanic-created manual calendar reminder.
   */
  async createManualReminder({ vehicleId, reminderType, dueDate, message }, userPrincipal) {
    if (userPrincipal.role !== 'MECHANIC' && userPrincipal.role !== 'ADMIN') {
      throw new ForbiddenError('Only certified mechanics or workshop managers can schedule maintenance reminders.');
    }

    if (!vehicleId || !reminderType || !dueDate) {
      throw new BadRequestError('Vehicle ID, reminder type, and due date are required.');
    }

    const vehicle = await vehicleRepo.findById(null, vehicleId);
    if (!vehicle) {
      throw new NotFoundError(`Vehicle not found with ID: ${vehicleId}`);
    }

    if (vehicle.workshopId !== userPrincipal.workshopId) {
      throw new ForbiddenError('Unauthorized access to vehicle outside your workshop tenant.');
    }

    // Format and validate due date
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dueDate) || isNaN(Date.parse(dueDate))) {
      throw new BadRequestError('Invalid due date format. Expected YYYY-MM-DD.');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const initialStatus = dueDate <= todayStr ? 'DUE' : 'ACTIVE';

    const reminderId = await reminderRepo.create(null, {
      vehicleId,
      reminderType: reminderType.trim(),
      dueDate,
      message: message ? message.trim() : `Manual maintenance reminder scheduled by technician for ${dueDate}.`,
      status: initialStatus
    });

    const created = await reminderRepo.findById(null, reminderId);
    return this.enrichReminder(created);
  }

  /**
   * Update reminder status (e.g. mark COMPLETED or DISMISSED).
   */
  async updateReminderStatus(reminderId, status, userPrincipal) {
    const reminder = await reminderRepo.findById(null, reminderId);
    if (!reminder) {
      throw new NotFoundError(`Reminder not found with ID: ${reminderId}`);
    }

    if (reminder.workshopId !== userPrincipal.workshopId) {
      throw new ForbiddenError('Unauthorized access to reminder outside your workshop tenant.');
    }

    if (userPrincipal.role === 'CUSTOMER' && reminder.ownerId !== userPrincipal.userId) {
      throw new ForbiddenError('Unauthorized access to reminder for another customer vehicle.');
    }

    const normalizedStatus = status.toUpperCase();
    const VALID_STATUSES = ['ACTIVE', 'DUE', 'COMPLETED', 'DISMISSED'];
    if (!VALID_STATUSES.includes(normalizedStatus)) {
      throw new BadRequestError(`Invalid status. Supported statuses: ${VALID_STATUSES.join(', ')}`);
    }

    await reminderRepo.updateStatus(null, reminderId, normalizedStatus);
    const updated = await reminderRepo.findById(null, reminderId);
    return this.enrichReminder(updated);
  }
}

module.exports = new ReminderService();
