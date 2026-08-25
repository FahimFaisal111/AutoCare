/**
 * AutoCare AI - Solution Report & Keywords Repository
 * Pure Raw Parameterized SQL (Zero ORM)
 */

const { pool } = require('../config/db');

class SolutionRepository {
  /**
   * Insert 1:1 diagnostic solution report for a problem report.
   */
  async createSolutionReport(executor, { reportId, description, probableCause, recommendedAction, urgency, confidenceScore, reviewedBy }) {
    const db = executor || pool;
    const sql = `
      INSERT INTO solution_report (
        report_id, description, probable_cause, recommended_action, urgency, confidence_score, reviewed_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `;
    const [result] = await db.query(sql, [
      reportId,
      description || null,
      probableCause,
      recommendedAction,
      urgency,
      confidenceScore !== undefined ? confidenceScore : null,
      reviewedBy || null
    ]);
    return result.insertId;
  }

  /**
   * Find solution report by reportId.
   */
  async findByReportId(executor, reportId) {
    const db = executor || pool;
    const sql = `
      SELECT 
        sr.solution_id AS solutionId,
        sr.report_id AS reportId,
        sr.description,
        sr.probable_cause AS probableCause,
        sr.recommended_action AS recommendedAction,
        sr.urgency,
        sr.confidence_score AS confidenceScore,
        sr.reviewed_by AS reviewedBy,
        CONCAT(u.first_name, ' ', u.last_name) AS reviewerName,
        sr.created_at AS createdAt
      FROM solution_report sr
      LEFT JOIN user u ON sr.reviewed_by = u.user_id
      WHERE sr.report_id = ?;
    `;
    const [rows] = await db.query(sql, [reportId]);
    return rows[0] || null;
  }

  /**
   * Update reviewer user ID for diagnostic solution.
   */
  async updateReviewedBy(executor, reportId, reviewedBy) {
    const db = executor || pool;
    const sql = `
      UPDATE solution_report
      SET reviewed_by = ?
      WHERE report_id = ?;
    `;
    const [result] = await db.query(sql, [reviewedBy, reportId]);
    return result.affectedRows > 0;
  }

  /**
   * Batch insert normalized symptom keywords into solution_keyword table.
   */
  async batchInsertKeywords(executor, solutionId, keywords) {
    if (!keywords || keywords.length === 0) return true;
    const db = executor || pool;
    const values = keywords.map(kw => [solutionId, kw.trim()]);
    const sql = `
      INSERT IGNORE INTO solution_keyword (solution_id, symptom_keyword)
      VALUES ?;
    `;
    const [result] = await db.query(sql, [values]);
    return result.affectedRows;
  }

  /**
   * Fetch keywords for a single solution ID.
   */
  async findKeywordsBySolutionId(executor, solutionId) {
    const db = executor || pool;
    const sql = `
      SELECT symptom_keyword AS keyword
      FROM solution_keyword
      WHERE solution_id = ?;
    `;
    const [rows] = await db.query(sql, [solutionId]);
    return rows.map(r => r.keyword);
  }

  /**
   * Fetch keywords for multiple solution IDs (batch lookup).
   */
  async findKeywordsBySolutionIds(executor, solutionIds) {
    if (!solutionIds || solutionIds.length === 0) return {};
    const db = executor || pool;
    const sql = `
      SELECT solution_id AS solutionId, symptom_keyword AS keyword
      FROM solution_keyword
      WHERE solution_id IN (?);
    `;
    const [rows] = await db.query(sql, [solutionIds]);
    const map = {};
    for (const row of rows) {
      if (!map[row.solutionId]) map[row.solutionId] = [];
      map[row.solutionId].push(row.keyword);
    }
    return map;
  }
}

module.exports = new SolutionRepository();
