/**
 * AutoCare AI - Conversation Controller
 * Hero Feature 7: Customer-Mechanic Communication (nested under /api/appointments/:id/messages)
 */

const conversationService = require('../services/conversationService');

class ConversationController {
  /*Comment : GET /api/appointments/:id/messages - loads the thread for one appointment. Also the endpoint the frontend's background poll hits every ~1.5s while a chat modal is open. */
  async getMessages(req, res, next) {
    try {
      const appointmentId = parseInt(req.params.id, 10);
      const result = await conversationService.getMessages(appointmentId, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /*Comment : POST /api/appointments/:id/messages - sends one message onto the thread. Body is just { content }; sender is always taken from the authenticated token, never from the request body, so nobody can post as someone else. */
  async sendMessage(req, res, next) {
    try {
      const appointmentId = parseInt(req.params.id, 10);
      const result = await conversationService.sendMessage(appointmentId, req.body.content, req.user);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  /*Comment : GET /api/appointments/messages/latest - one row per appointment the caller is party to that has at least one message, with just its latest sent_at + sender. The dashboards poll this occasionally to know which "Messages" buttons deserve a new-message badge and which appointments should sort to the top of their group. */
  async getLatestActivity(req, res, next) {
    try {
      const result = await conversationService.getLatestActivityForUser(req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ConversationController();
