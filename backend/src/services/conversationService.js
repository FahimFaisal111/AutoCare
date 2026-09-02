/**
 * AutoCare AI - Conversation Service
 * Hero Feature 7: Customer-Mechanic Communication, scoped to one appointment.
 */

const conversationRepo = require('../repositories/conversationRepo');
const appointmentRepo = require('../repositories/appointmentRepo');
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError
} = require('../middleware/errorHandler');

class ConversationService {
  /*Comment : Shared guard used by both getMessages and sendMessage. Loads the appointment and confirms the caller is one of its two actual participants - the customer who owns its vehicle, or the mechanic assigned to it - never just "any customer/mechanic in the workshop". Matches the feature's own name: Customer-Mechanic Communication, not Workshop-Wide Communication. */
  async assertParticipant(appointmentId, userPrincipal) {
    const appointment = await appointmentRepo.findById(null, appointmentId);
    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    if (appointment.workshopId !== userPrincipal.workshopId) {
      throw new ForbiddenError('Unauthorized access to appointment outside your tenant.');
    }

    const isOwnerCustomer = userPrincipal.role === 'CUSTOMER' && appointment.ownerId === userPrincipal.userId;
    const isAssignedMechanic = userPrincipal.role === 'MECHANIC' && appointment.mechanicId === userPrincipal.userId;

    if (!isOwnerCustomer && !isAssignedMechanic) {
      throw new ForbiddenError('Only the customer and mechanic on this appointment can access its messages.');
    }

    return appointment;
  }

  /*Comment : Returns the full message thread for one appointment, oldest first (already sorted that way by the repo query) - exactly what the chat modal renders top-to-bottom. */
  async getMessages(appointmentId, userPrincipal) {
    await this.assertParticipant(appointmentId, userPrincipal);
    const rows = await conversationRepo.findAllByAppointmentId(null, appointmentId);
    return rows.map(r => this.formatMessageResponse(r));
  }

  /*Comment : Saves one new message on the thread and hands back the saved row (with sender name/role already joined) so the frontend can show it immediately without a second round trip. */
  async sendMessage(appointmentId, content, userPrincipal) {
    if (!content || !content.trim()) {
      throw new BadRequestError('Message content cannot be empty.');
    }

    await this.assertParticipant(appointmentId, userPrincipal);

    const conversationId = await conversationRepo.createMessage(null, {
      appointmentId,
      senderId: userPrincipal.userId,
      content: content.trim()
    });

    const created = await conversationRepo.findById(null, conversationId);
    return this.formatMessageResponse(created);
  }

  /*Comment : Powers the "new message" badges and sort-to-top ordering. Deliberately takes NO appointment ids from the caller - it derives the caller's own appointment set the exact same way appointmentService.getAppointments already does (by role), so there's no way to ask about someone else's thread by just passing a different id. Zero new tables/columns: this is one aggregate read against the existing conversation table. */
  async getLatestActivityForUser(userPrincipal) {
    let myAppointments;
    if (userPrincipal.role === 'CUSTOMER') {
      myAppointments = await appointmentRepo.findAllByCustomerId(null, userPrincipal.userId);
    } else if (userPrincipal.role === 'MECHANIC') {
      myAppointments = await appointmentRepo.findAllByMechanicId(null, userPrincipal.userId);
    } else {
      // Admins have no Messages entry point in the UI, so there's nothing
      // meaningful to report - return empty rather than erroring.
      return [];
    }

    const appointmentIds = myAppointments.map((a) => a.appointmentId);
    return conversationRepo.findLatestByAppointmentIds(null, appointmentIds);
  }

  /*Comment : Helper - reshapes the raw SQL row (snake_case-derived aliases) into the flat DTO shape the frontend's Message type expects, same pattern as appointmentService.formatAppointmentResponse. */
  formatMessageResponse(row) {
    return {
      conversationId: row.conversationId,
      appointmentId: row.appointmentId,
      senderId: row.senderId,
      senderName: row.senderName,
      senderRole: row.senderRole,
      content: row.content,
      sentAt: row.sentAt
    };
  }
}

module.exports = new ConversationService();
