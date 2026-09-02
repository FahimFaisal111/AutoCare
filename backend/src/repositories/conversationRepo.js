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
   * Fetch a single message by its own id, with sender name/role joined -
   * used right after createMessage() so the API can hand back the exact
   * row it just inserted instead of re-fetching the whole thread.
   */
  async findById(executor, conversationId) {
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
      WHERE c.conversation_id = ?;
    `;
    const [rows] = await db.query(sql, [conversationId]);
    return rows[0] || null;
  }

  /**
   * For a given set of appointment ids, return each one's single latest
   * message (sent_at + sender_id) - used to power "new message" badges and
   * sort-to-top ordering without fetching every full thread. Appointments
   * with no messages at all simply don't appear in the result.
   */
  async findLatestByAppointmentIds(executor, appointmentIds) {
    if (!appointmentIds || appointmentIds.length === 0) {
      return [];
    }
    const db = executor || pool;
    const placeholders = appointmentIds.map(() => '?').join(', ');
    const sql = `
      SELECT
        c1.appointment_id AS appointmentId,
        c1.sent_at AS lastMessageAt,
        c1.sender_id AS lastSenderId
      FROM conversation c1
      INNER JOIN (
        SELECT appointment_id, MAX(sent_at) AS max_sent_at
        FROM conversation
        WHERE appointment_id IN (${placeholders})
        GROUP BY appointment_id
      ) latest
        ON c1.appointment_id = latest.appointment_id
       AND c1.sent_at = latest.max_sent_at;
    `;
    const [rows] = await db.query(sql, appointmentIds);
    return rows;
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
