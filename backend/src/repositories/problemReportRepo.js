/**
 * AutoCare AI - Problem Report Repository
 * Pure Raw Parameterized SQL (Zero ORM)
 */

const { pool } = require('../config/db');

class ProblemReportRepository {
  /**
   * Insert a new problem report.
   */
  async create(executor, { customerId, vehicleId, description, status = 'OPEN' }) {
    const db = executor || pool;
    const sql = `
      INSERT INTO problem_report (customer_id, vehicle_id, description, status)
      VALUES (?, ?, ?, ?);
    `;
    const [result] = await db.query(sql, [customerId, vehicleId, description, status]);
    return result.insertId;
  }

  /**
   * Find problem report by primary key ID.
   */
  async findById(executor, reportId) {
    const db = executor || pool;
    const sql = `
      SELECT 
        pr.report_id AS reportId,
        pr.customer_id AS customerId,
        CONCAT(c.first_name, ' ', c.last_name) AS customerName,
        c.workshop_id AS workshopId,
        pr.vehicle_id AS vehicleId,
        CONCAT(v.year, ' ', v.make, ' ', v.model, ' (', v.vin, ')') AS vehicleInfo,
        pr.description,
        pr.status,
        pr.created_at AS createdAt,
        sr.solution_id AS solutionId,
        sr.description AS solutionDescription,
        sr.probable_cause AS probableCause,
        sr.recommended_action AS recommendedAction,
        sr.urgency,
        sr.confidence_score AS confidenceScore,
        sr.reviewed_by AS reviewedBy,
        CONCAT(rev.first_name, ' ', rev.last_name) AS reviewerName
      FROM problem_report pr
      JOIN user c ON pr.customer_id = c.user_id
      JOIN vehicle v ON pr.vehicle_id = v.vehicle_id
      LEFT JOIN solution_report sr ON pr.report_id = sr.report_id
      LEFT JOIN user rev ON sr.reviewed_by = rev.user_id
      WHERE pr.report_id = ?;
    `;
    const [rows] = await db.query(sql, [reportId]);
    return rows[0] || null;
  }

  /**
   * Find all problem reports filed by a specific customer.
   */
  async findAllByCustomerId(executor, customerId) {
    const db = executor || pool;
    const sql = `
      SELECT 
        pr.report_id AS reportId,
        pr.customer_id AS customerId,
        CONCAT(c.first_name, ' ', c.last_name) AS customerName,
        c.workshop_id AS workshopId,
        pr.vehicle_id AS vehicleId,
        CONCAT(v.year, ' ', v.make, ' ', v.model, ' (', v.vin, ')') AS vehicleInfo,
        pr.description,
        pr.status,
        pr.created_at AS createdAt,
        sr.solution_id AS solutionId,
        sr.description AS solutionDescription,
        sr.probable_cause AS probableCause,
        sr.recommended_action AS recommendedAction,
        sr.urgency,
        sr.confidence_score AS confidenceScore,
        sr.reviewed_by AS reviewedBy,
        CONCAT(rev.first_name, ' ', rev.last_name) AS reviewerName
      FROM problem_report pr
      JOIN user c ON pr.customer_id = c.user_id
      JOIN vehicle v ON pr.vehicle_id = v.vehicle_id
      LEFT JOIN solution_report sr ON pr.report_id = sr.report_id
      LEFT JOIN user rev ON sr.reviewed_by = rev.user_id
      WHERE pr.customer_id = ?
      ORDER BY pr.created_at DESC;
    `;
    const [rows] = await db.query(sql, [customerId]);
    return rows;
  }

  /**
   * Find all problem reports in a workshop tenant.
   */
  async findAllByWorkshopId(executor, workshopId) {
    const db = executor || pool;
    const sql = `
      SELECT 
        pr.report_id AS reportId,
        pr.customer_id AS customerId,
        CONCAT(c.first_name, ' ', c.last_name) AS customerName,
        c.workshop_id AS workshopId,
        pr.vehicle_id AS vehicleId,
        CONCAT(v.year, ' ', v.make, ' ', v.model, ' (', v.vin, ')') AS vehicleInfo,
        pr.description,
        pr.status,
        pr.created_at AS createdAt,
        sr.solution_id AS solutionId,
        sr.description AS solutionDescription,
        sr.probable_cause AS probableCause,
        sr.recommended_action AS recommendedAction,
        sr.urgency,
        sr.confidence_score AS confidenceScore,
        sr.reviewed_by AS reviewedBy,
        CONCAT(rev.first_name, ' ', rev.last_name) AS reviewerName
      FROM problem_report pr
      JOIN user c ON pr.customer_id = c.user_id
      JOIN vehicle v ON pr.vehicle_id = v.vehicle_id
      LEFT JOIN solution_report sr ON pr.report_id = sr.report_id
      LEFT JOIN user rev ON sr.reviewed_by = rev.user_id
      WHERE c.workshop_id = ?
      ORDER BY pr.created_at DESC;
    `;
    const [rows] = await db.query(sql, [workshopId]);
    return rows;
  }

  /**
   * Update status of a problem report (e.g. 'OPEN' -> 'RESOLVED').
   */
  async updateStatus(executor, reportId, status) {
    const db = executor || pool;
    const sql = `
      UPDATE problem_report
      SET status = ?
      WHERE report_id = ?;
    `;
    const [result] = await db.query(sql, [status, reportId]);
    return result.affectedRows > 0;
  }

  /**
   * Find all historical problem reports and associated solutions for a specific vehicle.
   */
  async findAllByVehicleId(executor, vehicleId) {
    const db = executor || pool;
    const sql = `
      SELECT 
        pr.report_id AS reportId,
        pr.customer_id AS customerId,
        pr.vehicle_id AS vehicleId,
        pr.description,
        pr.status,
        pr.created_at AS createdAt,
        sr.solution_id AS solutionId,
        sr.description AS solutionDescription,
        sr.probable_cause AS probableCause,
        sr.recommended_action AS recommendedAction,
        sr.urgency,
        sr.confidence_score AS confidenceScore,
        sr.created_at AS solutionCreatedAt
      FROM problem_report pr
      LEFT JOIN solution_report sr ON pr.report_id = sr.report_id
      WHERE pr.vehicle_id = ?
      ORDER BY pr.created_at DESC;
    `;
    const [rows] = await db.query(sql, [vehicleId]);
    return rows;
  }
}

module.exports = new ProblemReportRepository();
