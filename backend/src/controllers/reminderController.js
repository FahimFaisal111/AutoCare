/**
 * AutoCare AI - Reminder Controller
 */

const reminderService = require('../services/reminderService');

class ReminderController {
  async getReminders(req, res, next) {
    try {
      const result = await reminderService.getReminders(req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async createReminder(req, res, next) {
    try {
      const { vehicleId, reminderType, dueDate, message } = req.body;
      const result = await reminderService.createManualReminder(
        { vehicleId: parseInt(vehicleId, 10), reminderType, dueDate, message },
        req.user
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateReminderStatus(req, res, next) {
    try {
      const reminderId = parseInt(req.params.id, 10);
      const { status } = req.body;
      const result = await reminderService.updateReminderStatus(reminderId, status, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReminderController();
