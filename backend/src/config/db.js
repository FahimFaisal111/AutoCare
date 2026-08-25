/**
 * AutoCare AI - Database Connection Pool & Transaction Manager
 * Strict Native Driver: mysql2/promise (Zero ORM)
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'autocare_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
  dateStrings: [
    'DATE',
    'DATETIME',
    'TIMESTAMP'
  ]
});

/**
 * Execute a single parameterized query using the pool.
 * @param {string} sql - Parameterized SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} [rows, fields]
 */
async function query(sql, params = []) {
  return pool.query(sql, params);
}

/**
 * Execute a callback within an explicit ACID transaction.
 * Automatically handles START TRANSACTION, COMMIT, and ROLLBACK.
 * @param {Function} callback - Async function receiving (connection)
 * @returns {Promise<any>} Result of callback
 */
async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('[DB] Rollback failed:', rollbackError);
    }
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Test database connectivity on application boot.
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT 1 AS healthCheck');
    connection.release();
    console.log('[DB] Successfully connected to MySQL database: ' + (process.env.DB_NAME || 'autocare_db'));
    return true;
  } catch (error) {
    console.error('[DB] Failed to connect to MySQL database:', error.message);
    throw error;
  }
}

module.exports = {
  pool,
  query,
  withTransaction,
  testConnection
};
