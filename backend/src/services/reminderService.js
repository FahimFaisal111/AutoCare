/**
 * AutoCare AI - Predictive Maintenance Reminder Service
 */

const reminderRepo = require('../repositories/reminderRepo');

class ReminderService {
  /**
   * Fetch active predictive maintenance alerts.
   */
  async getReminders(userPrincipal) {
    let rows;
    if (userPrincipal.role === 'CUSTOMER') {
      rows = await reminderRepo.findAllByOwnerId(null, userPrincipal.userId);
    } else {
      rows = await reminderRepo.findAllByWorkshopId(null, userPrincipal.workshopId);
    }

    return rows.map(r => ({
      reminderId: r.reminderId,
      vehicleId: r.vehicleId,
      vehicleInfo: r.vehicleInfo,
      reminderType: r.reminderType,
      dueDate: r.dueDate,
      message: r.message,
      status: r.status
    }));
  }
}

module.exports = new ReminderService();
