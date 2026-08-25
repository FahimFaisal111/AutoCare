/**
 * AutoCare AI - User Repository (EER Supertype/Subtype)
 * Pure Raw Parameterized SQL (Zero ORM)
 */

const { pool } = require('../config/db');

class UserRepository {
  /**
   * Insert base user record (Supertype table: user)
   */
  async createUser(executor, { workshopId, firstName, lastName, email, passwordHash, role }) {
    const db = executor || pool;
    const sql = `
      INSERT INTO user (workshop_id, first_name, last_name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    const [result] = await db.query(sql, [workshopId, firstName, lastName, email, passwordHash, role]);
    return result.insertId;
  }

  /**
   * Insert customer subtype record (Subtype table: customer)
   */
  async createCustomer(executor, { userId, phone }) {
    const db = executor || pool;
    const sql = `
      INSERT INTO customer (user_id, phone)
      VALUES (?, ?);
    `;
    const [result] = await db.query(sql, [userId, phone || null]);
    return result.affectedRows > 0;
  }

  /**
   * Insert mechanic subtype record (Subtype table: mechanic)
   */
  async createMechanic(executor, { userId, employeeCode }) {
    const db = executor || pool;
    const sql = `
      INSERT INTO mechanic (user_id, employee_code)
      VALUES (?, ?);
    `;
    const [result] = await db.query(sql, [userId, employeeCode]);
    return result.affectedRows > 0;
  }

  /**
   * Find user by email for authentication. Eagerly joins workshop name.
   */
  async findByEmail(executor, email) {
    const db = executor || pool;
    const sql = `
      SELECT 
        u.user_id AS userId,
        u.workshop_id AS workshopId,
        u.first_name AS firstName,
        u.last_name AS lastName,
        u.email,
        u.password_hash AS passwordHash,
        u.role,
        u.created_at AS createdAt,
        w.name AS workshopName
      FROM user u
      JOIN workshop w ON u.workshop_id = w.workshop_id
      WHERE u.email = ?;
    `;
    const [rows] = await db.query(sql, [email]);
    return rows[0] || null;
  }

  /**
   * Find user by primary key ID.
   */
  async findById(executor, userId) {
    const db = executor || pool;
    const sql = `
      SELECT 
        u.user_id AS userId,
        u.workshop_id AS workshopId,
        u.first_name AS firstName,
        u.last_name AS lastName,
        u.email,
        u.password_hash AS passwordHash,
        u.role,
        u.created_at AS createdAt,
        w.name AS workshopName
      FROM user u
      JOIN workshop w ON u.workshop_id = w.workshop_id
      WHERE u.user_id = ?;
    `;
    const [rows] = await db.query(sql, [userId]);
    return rows[0] || null;
  }

  /**
   * Retrieve full polymorphic user profile (joined with customer phone & mechanic code).
   */
  async findProfileById(executor, userId) {
    const db = executor || pool;
    const sql = `
      SELECT 
        u.user_id AS userId,
        u.workshop_id AS workshopId,
        w.name AS workshopName,
        u.email,
        u.first_name AS firstName,
        u.last_name AS lastName,
        u.role,
        c.phone,
        m.employee_code AS employeeCode
      FROM user u
      JOIN workshop w ON u.workshop_id = w.workshop_id
      LEFT JOIN customer c ON u.user_id = c.user_id
      LEFT JOIN mechanic m ON u.user_id = m.user_id
      WHERE u.user_id = ?;
    `;
    const [rows] = await db.query(sql, [userId]);
    return rows[0] || null;
  }

  /**
   * Find all users belonging to a workshop tenant filtered by role.
   */
  async findAllByWorkshopIdAndRole(executor, workshopId, role) {
    const db = executor || pool;
    const sql = `
      SELECT 
        u.user_id AS userId,
        u.workshop_id AS workshopId,
        w.name AS workshopName,
        u.email,
        u.first_name AS firstName,
        u.last_name AS lastName,
        u.role,
        c.phone,
        m.employee_code AS employeeCode
      FROM user u
      JOIN workshop w ON u.workshop_id = w.workshop_id
      LEFT JOIN customer c ON u.user_id = c.user_id
      LEFT JOIN mechanic m ON u.user_id = m.user_id
      WHERE u.workshop_id = ? AND u.role = ?
      ORDER BY u.first_name ASC, u.last_name ASC;
    `;
    const [rows] = await db.query(sql, [workshopId, role]);
    return rows;
  }

  /**
   * Count users in a workshop tenant by role.
   */
  async countByWorkshopIdAndRole(executor, workshopId, role) {
    const db = executor || pool;
    const sql = `
      SELECT COUNT(*) AS count
      FROM user
      WHERE workshop_id = ? AND role = ?;
    `;
    const [rows] = await db.query(sql, [workshopId, role]);
    return parseInt(rows[0]?.count || 0, 10);
  }

  /**
   * Check if email already exists globally.
   */
  async existsByEmail(executor, email) {
    const db = executor || pool;
    const sql = `
      SELECT 1 FROM user WHERE email = ? LIMIT 1;
    `;
    const [rows] = await db.query(sql, [email]);
    return rows.length > 0;
  }

  /**
   * Check if mechanic employee code already exists.
   */
  async existsByEmployeeCode(executor, employeeCode) {
    const db = executor || pool;
    const sql = `
      SELECT 1 FROM mechanic WHERE employee_code = ? LIMIT 1;
    `;
    const [rows] = await db.query(sql, [employeeCode]);
    return rows.length > 0;
  }

  /**
   * Update password hash for user account.
   */
  async updatePasswordHash(executor, userId, passwordHash) {
    const db = executor || pool;
    const sql = `
      UPDATE user
      SET password_hash = ?
      WHERE user_id = ?;
    `;
    const [result] = await db.query(sql, [passwordHash, userId]);
    return result.affectedRows > 0;
  }
}

module.exports = new UserRepository();
