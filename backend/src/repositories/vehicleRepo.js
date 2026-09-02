/**
 * AutoCare AI - Vehicle Repository
 * Pure Raw Parameterized SQL (Zero ORM)
 */

const { pool } = require('../config/db');

class VehicleRepository {
  /**
   * Insert a new vehicle row.
   */
  async create(executor, { ownerId, vin, make, model, year, odometer }) {
    const db = executor || pool;
    const sql = `
      INSERT INTO vehicle (owner_id, vin, make, model, year, odometer)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    const [result] = await db.query(sql, [ownerId, vin, make, model, year, odometer]);
    return result.insertId;
  }

  /**
   * Find vehicle by ID with owner and tenant details.
   */
  async findById(executor, vehicleId) {
    const db = executor || pool;
    const sql = `
      SELECT 
        v.vehicle_id AS vehicleId,
        v.owner_id AS ownerId,
        CONCAT(u.first_name, ' ', u.last_name) AS ownerName,
        u.workshop_id AS workshopId,
        v.vin,
        v.make,
        v.model,
        v.year,
        v.odometer,
        v.created_at AS createdAt
      FROM vehicle v
      JOIN user u ON v.owner_id = u.user_id
      WHERE v.vehicle_id = ?;
    `;
    const [rows] = await db.query(sql, [vehicleId]);
    return rows[0] || null;
  }

  /**
   * Find vehicle by unique VIN.
   */
  async findByVin(executor, vin) {
    const db = executor || pool;
    const sql = `
      SELECT 
        v.vehicle_id AS vehicleId,
        v.owner_id AS ownerId,
        CONCAT(u.first_name, ' ', u.last_name) AS ownerName,
        u.workshop_id AS workshopId,
        v.vin,
        v.make,
        v.model,
        v.year,
        v.odometer,
        v.created_at AS createdAt
      FROM vehicle v
      JOIN user u ON v.owner_id = u.user_id
      WHERE v.vin = ?;
    `;
    const [rows] = await db.query(sql, [vin]);
    return rows[0] || null;
  }

  /**
   * Check if VIN already exists.
   */
  async existsByVin(executor, vin) {
    const db = executor || pool;
    const sql = `
      SELECT 1 FROM vehicle WHERE vin = ? LIMIT 1;
    `;
    const [rows] = await db.query(sql, [vin]);
    return rows.length > 0;
  }

  /**
   * Find all vehicles owned by a specific customer.
   */
  async findAllByOwnerId(executor, ownerId) {
    const db = executor || pool;
    const sql = `
      SELECT 
        v.vehicle_id AS vehicleId,
        v.owner_id AS ownerId,
        CONCAT(u.first_name, ' ', u.last_name) AS ownerName,
        v.vin,
        v.make,
        v.model,
        v.year,
        v.odometer,
        v.created_at AS createdAt
      FROM vehicle v
      JOIN user u ON v.owner_id = u.user_id
      WHERE v.owner_id = ?
      ORDER BY v.created_at DESC;
    `;
    const [rows] = await db.query(sql, [ownerId]);
    return rows;
  }

  /**
   * Find all vehicles across the workshop tenant (transitive join via owner).
   */
  async findAllByWorkshopId(executor, workshopId) {
    const db = executor || pool;
    const sql = `
      SELECT 
        v.vehicle_id AS vehicleId,
        v.owner_id AS ownerId,
        CONCAT(u.first_name, ' ', u.last_name) AS ownerName,
        v.vin,
        v.make,
        v.model,
        v.year,
        v.odometer,
        v.created_at AS createdAt
      FROM vehicle v
      JOIN user u ON v.owner_id = u.user_id
      WHERE u.workshop_id = ?
      ORDER BY v.created_at DESC;
    `;
    const [rows] = await db.query(sql, [workshopId]);
    return rows;
  }

  /**
   * Count all vehicles registered in a workshop tenant.
   */
  async countByWorkshopId(executor, workshopId) {
    const db = executor || pool;
    const sql = `
      SELECT COUNT(v.vehicle_id) AS count
      FROM vehicle v
      JOIN user u ON v.owner_id = u.user_id
      WHERE u.workshop_id = ?;
    `;
    const [rows] = await db.query(sql, [workshopId]);
    return parseInt(rows[0]?.count || 0, 10);
  }

  /**
   * Update vehicle current odometer reading.
   * Parameterized raw SQL, no schema changes.
   */
  async updateOdometer(executor, vehicleId, odometer) {
    const db = executor || pool;
    const sql = `
      UPDATE vehicle
      SET odometer = ?
      WHERE vehicle_id = ?;
    `;
    const [result] = await db.query(sql, [odometer, vehicleId]);
    return result.affectedRows > 0;
  }
}

module.exports = new VehicleRepository();
