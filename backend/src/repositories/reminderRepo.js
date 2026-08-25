/**
 * AutoCare AI - Predictive Reminder Repository
 * Pure Raw Parameterized SQL (Zero ORM)
 */

const { pool } = require('../config/db');

class ReminderRepository {
  /**
   * Insert predictive maintenance reminder.
   */
  async create(executor, { vehicleId, reminderType, dueDate, message = null, status = 'ACTIVE' }) {
    const db = executor || pool;
    const sql = `
      INSERT INTO reminder (vehicle_id, reminder_type, due_date, message, status)
      VALUES (?, ?, ?, ?, ?);
    `;
    const [result] = await db.query(sql, [vehicleId, reminderType, dueDate, message, status]);
    return result.insertId;
  }

  /**
   * Find all reminders for vehicles owned by a specific customer.
   */
  async findAllByOwnerId(executor, ownerId) {
    const db = executor || pool;
    const sql = `
      SELECT 
        r.reminder_id AS reminderId,
        r.vehicle_id AS vehicleId,
        CONCAT(v.year, ' ', v.make, ' ', v.model) AS vehicleInfo,
        r.reminder_type AS reminderType,
        r.due_date AS dueDate,
        r.message,
        r.status
      FROM reminder r
      JOIN vehicle v ON r.vehicle_id = v.vehicle_id
      WHERE v.owner_id = ?
      ORDER BY r.due_date ASC;
    `;
    const [rows] = await db.query(sql, [ownerId]);
    return rows;
  }

  /**
   * Find all reminders across workshop tenant.
   */
  async findAllByWorkshopId(executor, workshopId) {
    const db = executor || pool;
    const sql = `
      SELECT 
        r.reminder_id AS reminderId,
        r.vehicle_id AS vehicleId,
        CONCAT(v.year, ' ', v.make, ' ', v.model) AS vehicleInfo,
        r.reminder_type AS reminderType,
        r.due_date AS dueDate,
        r.message,
        r.status
      FROM reminder r
      JOIN vehicle v ON r.vehicle_id = v.vehicle_id
      JOIN user u ON v.owner_id = u.user_id
      WHERE u.workshop_id = ?
      ORDER BY r.due_date ASC;
    `;
    const [rows] = await db.query(sql, [workshopId]);
    return rows;
  }

  /**
   * Find all reminders in the entire system.
   */
  async findAll(executor) {
    const db = executor || pool;
    const sql = `
      SELECT 
        r.reminder_id AS reminderId,
        r.vehicle_id AS vehicleId,
        CONCAT(v.year, ' ', v.make, ' ', v.model) AS vehicleInfo,
        r.reminder_type AS reminderType,
        r.due_date AS dueDate,
        r.message,
        r.status
      FROM reminder r
      JOIN vehicle v ON r.vehicle_id = v.vehicle_id
      ORDER BY r.due_date ASC;
    `;
    const [rows] = await db.query(sql);
    return rows;
  }
}

module.exports = new ReminderRepository();
