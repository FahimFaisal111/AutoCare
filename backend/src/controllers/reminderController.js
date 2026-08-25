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
}

module.exports = new ReminderController();
