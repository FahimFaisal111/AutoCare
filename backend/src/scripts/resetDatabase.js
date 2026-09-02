/**
 * AutoCare AI - Database Reinitialization Script
 * Re-runs sql/schema.sql to drop all tables and recreate the clean 3NF schema with 0 rows.
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function resetDatabase() {
  console.log('🔄 Connecting to MySQL...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  try {
    const schemaPath = path.resolve(__dirname, '../../../sql/schema.sql');
    console.log(`📖 Reading schema file from: ${schemaPath}`);
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('🧹 Executing DDL reset (dropping old tables & recreating all 12 tables)...');
    await connection.query(sql);

    console.log('\n✅ DATABASE REINITIALIZATION COMPLETE!');
    console.log('✨ All 12 tables (workshop, user, customer, mechanic, vehicle, reminder, problem_report, solution_report, solution_keyword, appointment, invoice, conversation) have been recreated fresh with 0 records.');
    console.log('🚀 You can now register fresh workshops, mechanics, and customers from the web UI.');
  } catch (error) {
    console.error('❌ Failed to reinitialize database:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

resetDatabase();
