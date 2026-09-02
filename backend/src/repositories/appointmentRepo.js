/**
 * AutoCare AI - Appointment Repository
 * Pure Raw Parameterized SQL (Zero ORM) with Pessimistic Concurrency Locking
 */

const { pool } = require('../config/db');

class AppointmentRepository {
  /**
   * Concurrency Safe: Count overlapping appointments for a mechanic in target window with pessimistic lock.
   */
  async countOverlappingAppointments(executor, { mechanicId, startTime, endTime }) {
    const db = executor || pool;
    const sql = `
      SELECT COUNT(*) AS count
      FROM appointment
      WHERE mechanic_id = ?
        AND status != 'CANCELLED'
        AND scheduled_start < ?
        AND DATE_ADD(scheduled_start, INTERVAL duration_minutes MINUTE) > ?
      FOR UPDATE;
    `;
    const [rows] = await db.query(sql, [mechanicId, endTime, startTime]);
    return parseInt(rows[0]?.count || 0, 10);
  }

  /**
   * Insert a new appointment row.
   */
  async create(executor, {
    vehicleId,
    mechanicId,
    reportId = null,
    scheduledStart,
    durationMinutes,
    status = 'SCHEDULED',
    serviceDescription = null,
    partsCost = 0,
    laborCost = 0
  }) {
    const db = executor || pool;
    const sql = `
      INSERT INTO appointment (
        vehicle_id, mechanic_id, report_id, scheduled_start, duration_minutes,
        status, service_description, parts_cost, labor_cost
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const [result] = await db.query(sql, [
      vehicleId,
      mechanicId,
      reportId || null,
      scheduledStart,
      durationMinutes,
      status,
      serviceDescription || null,
      partsCost,
      laborCost
    ]);
    return result.insertId;
  }

  /**
   * Find appointment by ID with vehicle, owner, mechanic, and invoice details.
   */
  async findById(executor, appointmentId) {
    const db = executor || pool;
    const sql = `
      SELECT 
        a.appointment_id AS appointmentId,
        a.vehicle_id AS vehicleId,
        CONCAT(v.year, ' ', v.make, ' ', v.model, ' (', v.vin, ')') AS vehicleInfo,
        v.owner_id AS ownerId,
        CONCAT(o.first_name, ' ', o.last_name) AS ownerName,
        o.workshop_id AS workshopId,
        a.mechanic_id AS mechanicId,
        CONCAT(m.first_name, ' ', m.last_name) AS mechanicName,
        a.report_id AS reportId,
        a.scheduled_start AS scheduledStart,
        a.duration_minutes AS durationMinutes,
        a.status,
        a.service_description AS serviceDescription,
        a.parts_cost AS partsCost,
        a.labor_cost AS laborCost,
        (COALESCE(a.parts_cost, 0) + COALESCE(a.labor_cost, 0)) AS totalAmount,
        inv.status AS invoiceStatus,
        a.created_at AS createdAt
      FROM appointment a
      JOIN vehicle v ON a.vehicle_id = v.vehicle_id
      JOIN user o ON v.owner_id = o.user_id
      JOIN user m ON a.mechanic_id = m.user_id
      LEFT JOIN invoice inv ON a.appointment_id = inv.appointment_id
      WHERE a.appointment_id = ?;
    `;
    const [rows] = await db.query(sql, [appointmentId]);
    return rows[0] || null;
  }

  /**
   * Find all appointments in a workshop tenant.
   */
  async findAllByWorkshopId(executor, workshopId) {
    const db = executor || pool;
    const sql = `
      SELECT 
        a.appointment_id AS appointmentId,
        a.vehicle_id AS vehicleId,
        CONCAT(v.year, ' ', v.make, ' ', v.model, ' (', v.vin, ')') AS vehicleInfo,
        v.owner_id AS ownerId,
        CONCAT(o.first_name, ' ', o.last_name) AS ownerName,
        o.workshop_id AS workshopId,
        a.mechanic_id AS mechanicId,
        CONCAT(m.first_name, ' ', m.last_name) AS mechanicName,
        a.report_id AS reportId,
        a.scheduled_start AS scheduledStart,
        a.duration_minutes AS durationMinutes,
        a.status,
        a.service_description AS serviceDescription,
        a.parts_cost AS partsCost,
        a.labor_cost AS laborCost,
        (COALESCE(a.parts_cost, 0) + COALESCE(a.labor_cost, 0)) AS totalAmount,
        inv.status AS invoiceStatus,
        a.created_at AS createdAt
      FROM appointment a
      JOIN vehicle v ON a.vehicle_id = v.vehicle_id
      JOIN user o ON v.owner_id = o.user_id
      JOIN user m ON a.mechanic_id = m.user_id
      LEFT JOIN invoice inv ON a.appointment_id = inv.appointment_id
      WHERE m.workshop_id = ?
      ORDER BY a.scheduled_start DESC;
    `;
    const [rows] = await db.query(sql, [workshopId]);
    return rows;
  }

  /**
   * Find all appointments for a specific customer.
   */
  async findAllByCustomerId(executor, customerId) {
    const db = executor || pool;
    const sql = `
      SELECT 
        a.appointment_id AS appointmentId,
        a.vehicle_id AS vehicleId,
        CONCAT(v.year, ' ', v.make, ' ', v.model, ' (', v.vin, ')') AS vehicleInfo,
        v.owner_id AS ownerId,
        CONCAT(o.first_name, ' ', o.last_name) AS ownerName,
        o.workshop_id AS workshopId,
        a.mechanic_id AS mechanicId,
        CONCAT(m.first_name, ' ', m.last_name) AS mechanicName,
        a.report_id AS reportId,
        a.scheduled_start AS scheduledStart,
        a.duration_minutes AS durationMinutes,
        a.status,
        a.service_description AS serviceDescription,
        a.parts_cost AS partsCost,
        a.labor_cost AS laborCost,
        (COALESCE(a.parts_cost, 0) + COALESCE(a.labor_cost, 0)) AS totalAmount,
        inv.status AS invoiceStatus,
        a.created_at AS createdAt
      FROM appointment a
      JOIN vehicle v ON a.vehicle_id = v.vehicle_id
      JOIN user o ON v.owner_id = o.user_id
      JOIN user m ON a.mechanic_id = m.user_id
      LEFT JOIN invoice inv ON a.appointment_id = inv.appointment_id
      WHERE v.owner_id = ?
      ORDER BY a.scheduled_start DESC;
    `;
    const [rows] = await db.query(sql, [customerId]);
    return rows;
  }

  /**
   * Find all appointments assigned to a specific mechanic.
   */
  async findAllByMechanicId(executor, mechanicId) {
    const db = executor || pool;
    const sql = `
      SELECT 
        a.appointment_id AS appointmentId,
        a.vehicle_id AS vehicleId,
        CONCAT(v.year, ' ', v.make, ' ', v.model, ' (', v.vin, ')') AS vehicleInfo,
        v.owner_id AS ownerId,
        CONCAT(o.first_name, ' ', o.last_name) AS ownerName,
        o.workshop_id AS workshopId,
        a.mechanic_id AS mechanicId,
        CONCAT(m.first_name, ' ', m.last_name) AS mechanicName,
        a.report_id AS reportId,
        a.scheduled_start AS scheduledStart,
        a.duration_minutes AS durationMinutes,
        a.status,
        a.service_description AS serviceDescription,
        a.parts_cost AS partsCost,
        a.labor_cost AS laborCost,
        (COALESCE(a.parts_cost, 0) + COALESCE(a.labor_cost, 0)) AS totalAmount,
        inv.status AS invoiceStatus,
        a.created_at AS createdAt
      FROM appointment a
      JOIN vehicle v ON a.vehicle_id = v.vehicle_id
      JOIN user o ON v.owner_id = o.user_id
      JOIN user m ON a.mechanic_id = m.user_id
      LEFT JOIN invoice inv ON a.appointment_id = inv.appointment_id
      WHERE a.mechanic_id = ?
      ORDER BY a.scheduled_start DESC;
    `;
    const [rows] = await db.query(sql, [mechanicId]);
    return rows;
  }

  /**
   * Update status, costs, and service description for an appointment.
   */
  async updateStatusAndCosts(executor, appointmentId, { status, partsCost, laborCost, serviceDescription }) {
    const db = executor || pool;
    const updates = ['status = ?'];
    const params = [status];

    if (partsCost !== undefined && partsCost !== null) {
      updates.push('parts_cost = ?');
      params.push(partsCost);
    }
    if (laborCost !== undefined && laborCost !== null) {
      updates.push('labor_cost = ?');
      params.push(laborCost);
    }
    if (serviceDescription !== undefined && serviceDescription !== null) {
      updates.push('service_description = ?');
      params.push(serviceDescription);
    }

    params.push(appointmentId);
    const sql = `
      UPDATE appointment
      SET ${updates.join(', ')}
      WHERE appointment_id = ?;
    `;
    const [result] = await db.query(sql, params);
    return result.affectedRows > 0;
  }

  /**
   * Count appointments in a workshop tenant filtered by status.
   */
  async countByWorkshopIdAndStatus(executor, workshopId, status) {
    const db = executor || pool;
    const sql = `
      SELECT COUNT(a.appointment_id) AS count
      FROM appointment a
      JOIN user m ON a.mechanic_id = m.user_id
      WHERE m.workshop_id = ? AND a.status = ?;
    `;
    const [rows] = await db.query(sql, [workshopId, status]);
    return parseInt(rows[0]?.count || 0, 10);
  }

  /**
   * Advisory Query: Find appointments for mechanics in a workshop that overlap a time window.
   * Excludes CANCELLED appointments.
   * Parameterized raw SQL ensuring multi-tenant isolation.
   */
  async findAppointmentsByWorkshopAndDateRange(executor, { workshopId, startWindow, endWindow }) {
    const db = executor || pool;
    const sql = `
      SELECT 
        a.appointment_id AS appointmentId,
        a.mechanic_id AS mechanicId,
        CONCAT(m.first_name, ' ', m.last_name) AS mechanicName,
        a.scheduled_start AS scheduledStart,
        a.duration_minutes AS durationMinutes,
        a.status
      FROM appointment a
      JOIN user m ON a.mechanic_id = m.user_id
      WHERE m.workshop_id = ?
        AND a.status != 'CANCELLED'
        AND a.scheduled_start < ?
        AND DATE_ADD(a.scheduled_start, INTERVAL a.duration_minutes MINUTE) > ?
      ORDER BY a.scheduled_start ASC;
    `;
    const [rows] = await db.query(sql, [workshopId, endWindow, startWindow]);
    return rows;
  }

  /**
   * Find completed service appointments for a vehicle to build diagnostic historical context.
   */
  async findCompletedByVehicleId(executor, vehicleId) {
    const db = executor || pool;
    const sql = `
      SELECT 
        a.appointment_id AS appointmentId,
        a.vehicle_id AS vehicleId,
        a.mechanic_id AS mechanicId,
        CONCAT(m.first_name, ' ', m.last_name) AS mechanicName,
        a.scheduled_start AS scheduledStart,
        a.duration_minutes AS durationMinutes,
        a.status,
        a.service_description AS serviceDescription,
        a.parts_cost AS partsCost,
        a.labor_cost AS laborCost,
        a.created_at AS createdAt
      FROM appointment a
      JOIN user m ON a.mechanic_id = m.user_id
      WHERE a.vehicle_id = ? AND a.status = 'COMPLETED'
      ORDER BY a.scheduled_start DESC
      LIMIT 10;
    `;
    const [rows] = await db.query(sql, [vehicleId]);
    return rows;
  }
}

module.exports = new AppointmentRepository();
