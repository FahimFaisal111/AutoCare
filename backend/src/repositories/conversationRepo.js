/**
 * AutoCare AI - Conversation Repository
 * Pure Raw Parameterized SQL (Zero ORM)
 */

const { pool } = require('../config/db');

class ConversationRepository {
  /**
   * Insert a chat message in an appointment message stream.
   */
  async createMessage(executor, { appointmentId, senderId, content }) {
    const db = executor || pool;
    const sql = `
      INSERT INTO conversation (appointment_id, sender_id, content)
      VALUES (?, ?, ?);
    `;
    const [result] = await db.query(sql, [appointmentId, senderId, content]);
    return result.insertId;
  }

  /**
   * Fetch chronological message stream for an appointment.
   */
  async findAllByAppointmentId(executor, appointmentId) {
    const db = executor || pool;
    const sql = `
      SELECT 
        c.conversation_id AS conversationId,
        c.appointment_id AS appointmentId,
        c.sender_id AS senderId,
        CONCAT(u.first_name, ' ', u.last_name) AS senderName,
        u.role AS senderRole,
        c.content,
        c.sent_at AS sentAt
      FROM conversation c
      JOIN user u ON c.sender_id = u.user_id
      WHERE c.appointment_id = ?
      ORDER BY c.sent_at ASC;
    `;
    const [rows] = await db.query(sql, [appointmentId]);
    return rows;
  }
}

module.exports = new ConversationRepository();
