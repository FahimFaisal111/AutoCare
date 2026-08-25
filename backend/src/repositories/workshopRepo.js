/**
 * AutoCare AI - Workshop Repository
 * Pure Raw Parameterized SQL (Zero ORM)
 */

const { pool } = require('../config/db');

class WorkshopRepository {
  /**
   * Insert a new Workshop tenant row.
   */
  async create(executor, { name, address, accessCode }) {
    const db = executor || pool;
    const sql = `
      INSERT INTO workshop (name, address, access_code)
      VALUES (?, ?, ?);
    `;
    const [result] = await db.query(sql, [name, address || null, accessCode]);
    return result.insertId;
  }

  /**
   * Find workshop by unique access code.
   */
  async findByAccessCode(executor, accessCode) {
    const db = executor || pool;
    const sql = `
      SELECT workshop_id AS workshopId, name, address, access_code AS accessCode, created_at AS createdAt
      FROM workshop
      WHERE access_code = ?;
    `;
    const [rows] = await db.query(sql, [accessCode]);
    return rows[0] || null;
  }

  /**
   * Find workshop by primary key ID.
   */
  async findById(executor, workshopId) {
    const db = executor || pool;
    const sql = `
      SELECT workshop_id AS workshopId, name, address, access_code AS accessCode, created_at AS createdAt
      FROM workshop
      WHERE workshop_id = ?;
    `;
    const [rows] = await db.query(sql, [workshopId]);
    return rows[0] || null;
  }

  /**
   * Find all workshops for public registration listing.
   */
  async findAll(executor) {
    const db = executor || pool;
    const sql = `
      SELECT workshop_id AS workshopId, name, address, access_code AS accessCode
      FROM workshop
      ORDER BY name ASC;
    `;
    const [rows] = await db.query(sql);
    return rows;
  }
}

module.exports = new WorkshopRepository();
