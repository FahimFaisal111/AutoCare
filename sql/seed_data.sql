-- ============================================================================
-- AutoCare AI - Production & Cloud Seed Data Script
-- Initializes Apex Performance Auto workshop with clean verified accounts:
-- 1. Admin: admin@apex.com (password: password123)
-- 2. Customer C: customer@c.com (password: password123, 2 cars in garage)
-- 3. Customer G: customer@g.com (password: password123, 0 cars, fresh account)
-- 4. Mechanic M: mechanic@m.com (password: password123, 100% free schedule)
-- 5. Mechanic N: mechanic@n.com (password: password123, 100% free schedule)
-- ============================================================================

USE autocare_db;

-- Temporarily disable foreign key checks to safely clean existing records
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE conversation;
TRUNCATE TABLE invoice;
TRUNCATE TABLE appointment;
TRUNCATE TABLE solution_keyword;
TRUNCATE TABLE solution_report;
TRUNCATE TABLE problem_report;
TRUNCATE TABLE reminder;
TRUNCATE TABLE vehicle;
TRUNCATE TABLE mechanic;
TRUNCATE TABLE customer;
TRUNCATE TABLE user;
TRUNCATE TABLE workshop;

SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- 1. WORKSHOP (Tenant Root)
-- ----------------------------------------------------------------------------
INSERT INTO workshop (workshop_id, name, address, access_code, created_at)
VALUES (
    1,
    'Apex Performance Auto',
    '742 Evergreen Terrace, Springfield',
    'APEX-2026',
    NOW()
);

-- ----------------------------------------------------------------------------
-- 2. USERS (Shared Credentials: password123)
-- Password hash generated with bcryptjs (10 salt rounds):
-- $2b$10$c6RTjZZJBNMB3ZU8aymCPeeRkmxtRiMPokeeevUNsyY7RneSed7U.
-- ----------------------------------------------------------------------------
INSERT INTO user (user_id, workshop_id, first_name, last_name, email, password_hash, role, created_at)
VALUES 
  (1, 1, 'Admin', 'Apex', 'admin@apex.com', '$2b$10$c6RTjZZJBNMB3ZU8aymCPeeRkmxtRiMPokeeevUNsyY7RneSed7U.', 'ADMIN', NOW()),
  (2, 1, 'customer', 'c', 'customer@c.com', '$2b$10$c6RTjZZJBNMB3ZU8aymCPeeRkmxtRiMPokeeevUNsyY7RneSed7U.', 'CUSTOMER', NOW()),
  (3, 1, 'mechanic', 'm', 'mechanic@m.com', '$2b$10$c6RTjZZJBNMB3ZU8aymCPeeRkmxtRiMPokeeevUNsyY7RneSed7U.', 'MECHANIC', NOW()),
  (4, 1, 'mechanic', 'n', 'mechanic@n.com', '$2b$10$c6RTjZZJBNMB3ZU8aymCPeeRkmxtRiMPokeeevUNsyY7RneSed7U.', 'MECHANIC', NOW()),
  (5, 1, 'customer', 'g', 'customer@g.com', '$2b$10$c6RTjZZJBNMB3ZU8aymCPeeRkmxtRiMPokeeevUNsyY7RneSed7U.', 'CUSTOMER', NOW());

-- ----------------------------------------------------------------------------
-- 3. CUSTOMER SUBTYPES
-- ----------------------------------------------------------------------------
INSERT INTO customer (user_id)
VALUES 
  (2),  -- Customer C
  (5);  -- Customer G (has 0 vehicles, 0 appointments)

-- ----------------------------------------------------------------------------
-- 4. MECHANIC SUBTYPES
-- ----------------------------------------------------------------------------
INSERT INTO mechanic (user_id, employee_code)
VALUES 
  (3, 'TECH-001'),  -- Mechanic M (completely free schedule)
  (4, 'TECH-002');  -- Mechanic N (completely free schedule)

-- ----------------------------------------------------------------------------
-- 5. VEHICLES (Customer C has 2 vehicles; Customer G has 0)
-- ----------------------------------------------------------------------------
INSERT INTO vehicle (vehicle_id, owner_id, vin, make, model, year, odometer, created_at)
VALUES 
  (1, 2, '1HGCR2F83HA001234', 'Toyota', 'Camry', 2026, 15200, NOW()),
  (2, 2, '2T1BURHE9KC005678', 'Honda', 'Civic', 2024, 24500, NOW());

-- ----------------------------------------------------------------------------
-- 6. INITIAL PREVENTIVE MAINTENANCE REMINDERS (For Customer C's 2 vehicles)
-- ----------------------------------------------------------------------------
INSERT INTO reminder (vehicle_id, reminder_type, due_date, message, status, created_at)
VALUES 
  (1, 'Routine Inspection & Diagnostics', DATE_ADD(CURDATE(), INTERVAL 3 MONTH), 'Quarterly multi-point vehicle inspection and fluid level check.', 'ACTIVE', NOW()),
  (2, 'Routine Inspection & Diagnostics', DATE_ADD(CURDATE(), INTERVAL 3 MONTH), 'Quarterly multi-point vehicle inspection and fluid level check.', 'ACTIVE', NOW());

-- APPOINTMENTS: 0 rows (Mechanic M & Mechanic N have completely open schedules)
