/**
 * AutoCare AI - Invoice Repository
 * Pure Raw Parameterized SQL (Zero ORM)
 */

const { pool } = require('../config/db');

class InvoiceRepository {
  /**
   * Insert new invoice or update total_amount if already issued.
   */
  async upsertInvoice(executor, { appointmentId, totalAmount, status = 'PENDING' }) {
    const db = executor || pool;
    const sql = `
      INSERT INTO invoice (appointment_id, total_amount, status)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        total_amount = VALUES(total_amount),
        status = VALUES(status);
    `;
    const [result] = await db.query(sql, [appointmentId, totalAmount, status]);
    return result.insertId || result.affectedRows > 0;
  }

  /**
   * Find invoice by appointment ID.
   */
  async findByAppointmentId(executor, appointmentId) {
    const db = executor || pool;
    const sql = `
      SELECT 
        invoice_id AS invoiceId,
        appointment_id AS appointmentId,
        total_amount AS totalAmount,
        status,
        issued_at AS issuedAt
      FROM invoice
      WHERE appointment_id = ?;
    `;
    const [rows] = await db.query(sql, [appointmentId]);
    return rows[0] || null;
  }

  /**
   * Calculate aggregated sum of total revenue for a workshop tenant.
   */
  async sumTotalRevenueByWorkshopId(executor, workshopId) {
    const db = executor || pool;
    const sql = `
      SELECT COALESCE(SUM(i.total_amount), 0) AS totalRevenue
      FROM invoice i
      JOIN appointment a ON i.appointment_id = a.appointment_id
      JOIN user m ON a.mechanic_id = m.user_id
      WHERE m.workshop_id = ?;
    `;
    const [rows] = await db.query(sql, [workshopId]);
    return parseFloat(rows[0]?.totalRevenue || 0);
  }
}

module.exports = new InvoiceRepository();
