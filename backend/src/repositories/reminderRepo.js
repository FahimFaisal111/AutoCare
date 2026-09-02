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
        v.vin,
        v.odometer AS currentOdometer,
        CONCAT(v.year, ' ', v.make, ' ', v.model) AS vehicleInfo,
        r.reminder_type AS reminderType,
        DATE_FORMAT(r.due_date, '%Y-%m-%d') AS dueDate,
        r.message,
        r.status,
        r.created_at AS createdAt
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
        v.vin,
        v.odometer AS currentOdometer,
        CONCAT(v.year, ' ', v.make, ' ', v.model) AS vehicleInfo,
        r.reminder_type AS reminderType,
        DATE_FORMAT(r.due_date, '%Y-%m-%d') AS dueDate,
        r.message,
        r.status,
        r.created_at AS createdAt
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
   * Find reminder by ID with vehicle and tenant details.
   */
  async findById(executor, reminderId) {
    const db = executor || pool;
    const sql = `
      SELECT 
        r.reminder_id AS reminderId,
        r.vehicle_id AS vehicleId,
        v.owner_id AS ownerId,
        u.workshop_id AS workshopId,
        v.vin,
        v.odometer AS currentOdometer,
        CONCAT(v.year, ' ', v.make, ' ', v.model) AS vehicleInfo,
        r.reminder_type AS reminderType,
        DATE_FORMAT(r.due_date, '%Y-%m-%d') AS dueDate,
        r.message,
        r.status,
        r.created_at AS createdAt
      FROM reminder r
      JOIN vehicle v ON r.vehicle_id = v.vehicle_id
      JOIN user u ON v.owner_id = u.user_id
      WHERE r.reminder_id = ?;
    `;
    const [rows] = await db.query(sql, [reminderId]);
    return rows[0] || null;
  }

  /**
   * Find all reminders for a specific vehicle.
   */
  async findAllByVehicleId(executor, vehicleId) {
    const db = executor || pool;
    const sql = `
      SELECT 
        r.reminder_id AS reminderId,
        r.vehicle_id AS vehicleId,
        v.vin,
        v.odometer AS currentOdometer,
        CONCAT(v.year, ' ', v.make, ' ', v.model) AS vehicleInfo,
        r.reminder_type AS reminderType,
        DATE_FORMAT(r.due_date, '%Y-%m-%d') AS dueDate,
        r.message,
        r.status,
        r.created_at AS createdAt
      FROM reminder r
      JOIN vehicle v ON r.vehicle_id = v.vehicle_id
      WHERE r.vehicle_id = ?
      ORDER BY r.due_date ASC;
    `;
    const [rows] = await db.query(sql, [vehicleId]);
    return rows;
  }

  /**
   * Find all active/due reminders for a specific vehicle.
   */
  async findActiveByVehicleId(executor, vehicleId) {
    const db = executor || pool;
    const sql = `
      SELECT 
        r.reminder_id AS reminderId,
        r.vehicle_id AS vehicleId,
        v.vin,
        v.odometer AS currentOdometer,
        CONCAT(v.year, ' ', v.make, ' ', v.model) AS vehicleInfo,
        r.reminder_type AS reminderType,
        DATE_FORMAT(r.due_date, '%Y-%m-%d') AS dueDate,
        r.message,
        r.status,
        r.created_at AS createdAt
      FROM reminder r
      JOIN vehicle v ON r.vehicle_id = v.vehicle_id
      WHERE r.vehicle_id = ? AND r.status IN ('ACTIVE', 'DUE')
      ORDER BY r.due_date ASC;
    `;
    const [rows] = await db.query(sql, [vehicleId]);
    return rows;
  }

  /**
   * Find active or due reminder by vehicle and reminder type (for duplicate prevention).
   */
  async findActiveByVehicleAndType(executor, vehicleId, reminderType) {
    const db = executor || pool;
    const sql = `
      SELECT 
        reminder_id AS reminderId,
        vehicle_id AS vehicleId,
        reminder_type AS reminderType,
        DATE_FORMAT(due_date, '%Y-%m-%d') AS dueDate,
        message,
        status
      FROM reminder
      WHERE vehicle_id = ? AND reminder_type = ? AND status IN ('ACTIVE', 'DUE')
      LIMIT 1;
    `;
    const [rows] = await db.query(sql, [vehicleId, reminderType]);
    return rows[0] || null;
  }

  /**
   * Update reminder status ('ACTIVE', 'DUE', 'COMPLETED', 'DISMISSED').
   */
  async updateStatus(executor, reminderId, status) {
    const db = executor || pool;
    const sql = `
      UPDATE reminder
      SET status = ?
      WHERE reminder_id = ?;
    `;
    const [result] = await db.query(sql, [status, reminderId]);
    return result.affectedRows > 0;
  }

  /**
   * Scheduled daily surface: mark ACTIVE reminders whose due_date <= today as 'DUE'.
   */
  async markPastDueAsDue(executor) {
    const db = executor || pool;
    const sql = `
      UPDATE reminder
      SET status = 'DUE'
      WHERE status = 'ACTIVE' AND due_date <= CURDATE();
    `;
    const [result] = await db.query(sql);
    return result.affectedRows;
  }
}

module.exports = new ReminderRepository();
