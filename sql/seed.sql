-- ============================================================================
-- AutoCare AI – Vehicle Service & Maintenance SaaS (V1)
-- Seed Data Script
-- Populates 2 Workshops with realistic multi-tenant data
-- ============================================================================

USE autocare_db;

-- Clear previous data in correct topological order to avoid foreign key violations
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

-- ============================================================================
-- 1. SEED WORKSHOPS (2 Distinct Tenants)
-- ============================================================================
INSERT INTO workshop (workshop_id, name, address, access_code) VALUES
(1, 'Downtown AutoCare & Tuning', '101 Main Street, Metro City, CA 90210', 'DT-CARE-2026'),
(2, 'Uptown Motors Service Center', '450 Highland Blvd, Northbay, WA 98004', 'UP-MTR-2026');

-- ============================================================================
-- 2. SEED USERS (Supertype Table)
-- Passwords below are standard bcrypt hashes for 'Password123!'
-- $2a$10$pT0nL9fcRk.uMFRKirBI/ORbVWqlIbSTT2Peb//aUd6AbqSre3vDW
-- ============================================================================
INSERT INTO user (user_id, workshop_id, first_name, last_name, email, password_hash, role) VALUES
-- Workshop 1 Users (Downtown AutoCare)
(1, 1, 'Alice', 'Vance', 'alice@downtownautocare.com', '$2a$10$pT0nL9fcRk.uMFRKirBI/ORbVWqlIbSTT2Peb//aUd6AbqSre3vDW', 'ADMIN'),
(2, 1, 'Bob', 'Miller', 'bob.miller@downtownautocare.com', '$2a$10$pT0nL9fcRk.uMFRKirBI/ORbVWqlIbSTT2Peb//aUd6AbqSre3vDW', 'MECHANIC'),
(3, 1, 'Charlie', 'Davis', 'charlie.davis@gmail.com', '$2a$10$pT0nL9fcRk.uMFRKirBI/ORbVWqlIbSTT2Peb//aUd6AbqSre3vDW', 'CUSTOMER'),
(4, 1, 'Diana', 'Prince', 'diana.prince@outlook.com', '$2a$10$pT0nL9fcRk.uMFRKirBI/ORbVWqlIbSTT2Peb//aUd6AbqSre3vDW', 'CUSTOMER'),

-- Workshop 2 Users (Uptown Motors)
(5, 2, 'Edward', 'Norton', 'edward@uptownmotors.com', '$2a$10$pT0nL9fcRk.uMFRKirBI/ORbVWqlIbSTT2Peb//aUd6AbqSre3vDW', 'ADMIN'),
(6, 2, 'Fiona', 'Gallagher', 'fiona.g@uptownmotors.com', '$2a$10$pT0nL9fcRk.uMFRKirBI/ORbVWqlIbSTT2Peb//aUd6AbqSre3vDW', 'MECHANIC'),
(7, 2, 'George', 'Clark', 'george.clark@yahoo.com', '$2a$10$pT0nL9fcRk.uMFRKirBI/ORbVWqlIbSTT2Peb//aUd6AbqSre3vDW', 'CUSTOMER'),
(8, 2, 'Hannah', 'Abbott', 'hannah.a@gmail.com', '$2a$10$pT0nL9fcRk.uMFRKirBI/ORbVWqlIbSTT2Peb//aUd6AbqSre3vDW', 'CUSTOMER');

-- ============================================================================
-- 3. SEED CUSTOMERS (Subtype Table for Customers)
-- ============================================================================
INSERT INTO customer (user_id, phone) VALUES
(3, '+1-555-010-1234'),
(4, '+1-555-010-5678'),
(8, '+1-555-020-9988');

-- ============================================================================
-- 4. SEED MECHANICS (Subtype Table for Mechanics)
-- ============================================================================
INSERT INTO mechanic (user_id, employee_code) VALUES
(2, 'EMP-DT-001'),
(6, 'EMP-UP-001'),
(7, 'EMP-UP-002');

-- ============================================================================
-- 5. SEED VEHICLES
-- ============================================================================
INSERT INTO vehicle (vehicle_id, owner_id, vin, make, model, year, odometer) VALUES
(1, 3, '2T3F1RFV7MC123456', 'Toyota', 'RAV4 Hybrid', 2021, 45200),
(2, 3, '1HGFC2F69JE654321', 'Honda', 'Civic EX', 2018, 82450),
(3, 4, '1FTFW1ED4NFA98765', 'Ford', 'F-150 Lariat', 2022, 31500),
(4, 8, 'WBA5R7C58LA112233', 'BMW', '330i xDrive', 2020, 38900),
(5, 8, '5YJ3E1EA7KF445566', 'Tesla', 'Model 3 Long Range', 2019, 54120);

-- ============================================================================
-- 6. SEED REMINDERS (Rule-based maintenance tracking)
-- ============================================================================
INSERT INTO reminder (reminder_id, vehicle_id, reminder_type, due_date, message, status) VALUES
(1, 1, 'Oil & Filter Change', DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'Scheduled 50,000-mile synthetic 0W-16 engine oil and filter replacement.', 'ACTIVE'),
(2, 3, 'Brake Fluid Flush', DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'Brake fluid hygroscopic moisture check due (2-year interval).', 'ACTIVE'),
(3, 4, 'Tire Rotation & Balance', DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'Recommended rotation and dynamic balancing at 40,000 miles.', 'ACTIVE');

-- ============================================================================
-- 7. SEED PROBLEM REPORTS (Customer-submitted symptoms)
-- ============================================================================
INSERT INTO problem_report (report_id, customer_id, vehicle_id, description, status) VALUES
(1, 3, 1, 'High-pitched metal squeaking noise coming from front wheels when lightly braking at low speeds.', 'RESOLVED'),
(2, 4, 3, 'Check engine light flashing on highway on-ramp with noticeable engine shudder during cold start.', 'OPEN'),
(3, 8, 4, 'Climate control intermittently blows ambient/warm air when idling at red lights in hot weather.', 'RESOLVED');

-- ============================================================================
-- 8. SEED SOLUTION REPORTS (AI Synthesis output)
-- ============================================================================
INSERT INTO solution_report (solution_id, report_id, description, probable_cause, recommended_action, urgency, confidence_score, reviewed_by) VALUES
(1, 1, 'Front friction assembly diagnostic summary.', 
 'Front ceramic brake pad wear indicator contacting rotor face due to lining thickness below 2mm.', 
 'Replace front brake pads with OEM ceramic set, inspect rotor thickness, and machine/replace if grooved.', 
 'MEDIUM', 0.935, 2),

(2, 2, 'Ignition and powertrain diagnosis.', 
 'OBD-II Code P0303 - Cylinder 3 misfire detected, likely caused by degraded ignition coil pack or fouled iridium spark plug.', 
 'Perform primary/secondary ignition coil resistance test, swap coil 3 with coil 1 to confirm fault movement, replace plug set.', 
 'HIGH', 0.885, 2),

(3, 3, 'HVAC refrigeration cycle diagnostic.', 
 'Low R-1234yf refrigerant pressure triggered by minor Schrader valve or condenser connection micro-leak.', 
 'Recover existing refrigerant, inject UV dye, pressure test with nitrogen to 150 PSI, replace sealing O-ring and recharge to 550g spec.', 
 'LOW', 0.840, 6);

-- ============================================================================
-- 9. SEED SOLUTION KEYWORDS (1NF Normalized Symptom Search Tokens)
-- ============================================================================
INSERT INTO solution_keyword (solution_id, symptom_keyword) VALUES
(1, 'brake squeak'),
(1, 'front pads'),
(1, 'rotor glaze'),
(1, 'brake wear indicator'),

(2, 'engine misfire'),
(2, 'rough idle'),
(2, 'p0303'),
(2, 'ignition coil'),
(2, 'check engine'),

(3, 'ac warm air'),
(3, 'refrigerant leak'),
(3, 'condenser'),
(3, 'hvac pressure');

-- ============================================================================
-- 10. SEED APPOINTMENTS (Booking & Service Execution Logs)
-- ============================================================================
INSERT INTO appointment (appointment_id, vehicle_id, mechanic_id, report_id, scheduled_start, duration_minutes, status, service_description, parts_cost, labor_cost) VALUES
-- Past completed appointment for Charlie's RAV4 with Mechanic Bob
(1, 1, 2, 1, DATE_SUB(NOW(), INTERVAL 3 DAY), 90, 'COMPLETED', 
 'Installed new front ceramic brake pads, resurfaced front rotors, cleaned calipers, and road-tested braking performance.', 
 145.00, 120.00),

-- Upcoming scheduled appointment for Diana's F-150 with Mechanic Bob
(2, 3, 2, 2, DATE_ADD(NOW(), INTERVAL 1 DAY), 120, 'SCHEDULED', 
 'Comprehensive multi-cylinder ignition scan, swap coil pack test, and spark plug inspection.', 
 0.00, 0.00),

-- Past completed appointment for Henry's BMW with Mechanic Frank
(3, 4, 6, 3, DATE_SUB(NOW(), INTERVAL 2 DAY), 60, 'COMPLETED', 
 'Replaced high-pressure service port valve, vacuum evacuated A/C system for 30 mins, recharged 550g R-1234yf.', 
 85.00, 150.00);

-- ============================================================================
-- 11. SEED INVOICES (1:1 Billing for Completed Appointments)
-- ============================================================================
INSERT INTO invoice (invoice_id, appointment_id, total_amount, status, issued_at) VALUES
-- Total: $145.00 parts + $120.00 labor = $265.00 (PAID)
(1, 1, 265.00, 'PAID', DATE_SUB(NOW(), INTERVAL 3 DAY)),
-- Total: $85.00 parts + $150.00 labor = $235.00 (PENDING payment)
(2, 3, 235.00, 'PENDING', DATE_SUB(NOW(), INTERVAL 2 DAY));

-- ============================================================================
-- 12. SEED CONVERSATION (In-App Chat Messaging Threads)
-- ============================================================================
INSERT INTO conversation (conversation_id, appointment_id, sender_id, content, sent_at) VALUES
-- Thread for Appointment 1 (Charlie & Bob)
(1, 1, 3, 'Hi Bob, will you be installing genuine OEM Toyota ceramic pads for this repair?', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(2, 1, 2, 'Hi Charlie! Yes, we have authentic OEM Toyota front pads and hardware shims in stock.', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(3, 1, 3, 'Perfect! Looking forward to picking it up once ready.', DATE_SUB(NOW(), INTERVAL 4 DAY)),

-- Thread for Appointment 2 (Diana & Bob)
(4, 2, 4, 'Hello! I left the keys in the overnight dropbox near Bay 3.', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(5, 2, 2, 'Thanks Diana! Got the keys. We will pull the truck in first thing tomorrow morning.', DATE_SUB(NOW(), INTERVAL 1 HOUR));
