/**
 * AutoCare AI - Database Seed Runner
 * Applies sql/seed_data.sql to set up:
 * - Workshop: Apex Performance Auto (APEX-2026)
 * - Admin: admin@apex.com (password123)
 * - Customer C: customer@c.com (password123, 2 cars)
 * - Customer G: customer@g.com (password123, 0 cars)
 * - Mechanic M: mechanic@m.com (password123, free schedule)
 * - Mechanic N: mechanic@n.com (password123, free schedule)
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function seedData() {
  console.log('🔄 Connecting to MySQL database...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'autocare_db',
    multipleStatements: true
  });

  try {
    const seedPath = path.resolve(__dirname, '../../../sql/seed_data.sql');
    console.log(`📖 Loading seed script from: ${seedPath}`);
    const sql = fs.readFileSync(seedPath, 'utf8');

    console.log('🌱 Seeding database...');
    await connection.query(sql);

    console.log('\n=======================================================');
    console.log('🎉 DATABASE SEEDED SUCCESSFULLY!');
    console.log('=======================================================');
    console.log('🏢 Workshop: Apex Performance Auto (Access Code: APEX-2026)');
    console.log('👑 Admin: admin@apex.com (password123)');
    console.log('🚗 Customer C: customer@c.com (password123) -> 2 Cars: 2026 Toyota Camry & 2024 Honda Civic');
    console.log('👤 Customer G: customer@g.com (password123) -> 0 Cars (Fresh Account)');
    console.log('🔧 Mechanic M: mechanic@m.com (password123) -> 100% Free Schedule');
    console.log('🔧 Mechanic N: mechanic@n.com (password123) -> 100% Free Schedule');
    console.log('=======================================================\n');
  } catch (error) {
    console.error('❌ Failed to seed database:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedData();
