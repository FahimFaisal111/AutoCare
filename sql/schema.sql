-- ============================================================================
-- AutoCare AI – Vehicle Service & Maintenance SaaS (V1)
-- Database Definition Script (DDL) - MySQL 8.0+ / 9.x
-- Normal Form: 3NF Compliant (Strict Relational Multi-Tenancy)
-- ============================================================================

-- Create database if it does not already exist
CREATE DATABASE IF NOT EXISTS autocare_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE autocare_db;

-- ----------------------------------------------------------------------------
-- Drop tables in reverse topological order (respecting foreign key dependencies)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS conversation;
DROP TABLE IF EXISTS invoice;
DROP TABLE IF EXISTS appointment;
DROP TABLE IF EXISTS solution_keyword;
DROP TABLE IF EXISTS solution_report;
DROP TABLE IF EXISTS problem_report;
DROP TABLE IF EXISTS reminder;
DROP TABLE IF EXISTS vehicle;
DROP TABLE IF EXISTS mechanic;
DROP TABLE IF EXISTS customer;
DROP TABLE IF EXISTS user;
DROP TABLE IF EXISTS workshop;

-- ============================================================================
-- 1. WORKSHOP (Root Tenant Organization)
-- ============================================================================
-- Role: Strong entity representing the automotive workshop (tenant boundary).
-- 3NF Justification: Stores workshop attributes without duplication across tables.
CREATE TABLE workshop (
    workshop_id INT AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(200) NULL,
    -- access_code: Unique token used by customers during onboarding to link to this workshop
    access_code VARCHAR(50) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_workshop PRIMARY KEY (workshop_id),
    CONSTRAINT uq_workshop_access_code UNIQUE (access_code)
) ENGINE=InnoDB;

-- ============================================================================
-- 2. USER (EER Supertype: Shared Authentication & Identity)
-- ============================================================================
-- Role: Base table for all humans in the system (Admins, Mechanics, Customers).
-- Multi-tenancy: workshop_id is anchored here. Every user belongs to one workshop.
-- 3NF Justification: Email is unique globally. Credentials and names are non-redundant.
CREATE TABLE user (
    user_id INT AUTO_INCREMENT,
    workshop_id INT NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'CUSTOMER', 'MECHANIC') NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_user PRIMARY KEY (user_id),
    CONSTRAINT uq_user_email UNIQUE (email),
    -- RESTRICT: A workshop cannot be dropped if active users exist (tenant safety)
    CONSTRAINT fk_user_workshop FOREIGN KEY (workshop_id)
        REFERENCES workshop (workshop_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Index to optimize tenant-wide user queries and role filtering
CREATE INDEX idx_user_workshop_role ON user (workshop_id, role);

-- ============================================================================
-- 3. CUSTOMER (EER Subtype of USER)
-- ============================================================================
-- Role: Holds customer-specific attributes not applicable to Mechanics/Admins.
-- PK/FK: user_id is simultaneously Primary Key and Foreign Key to user.user_id.
CREATE TABLE customer (
    user_id INT NOT NULL,
    phone VARCHAR(20) NULL,

    CONSTRAINT pk_customer PRIMARY KEY (user_id),
    -- CASCADE: If base user record is deleted, delete the customer profile automatically
    CONSTRAINT fk_customer_user FOREIGN KEY (user_id)
        REFERENCES user (user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 4. MECHANIC (EER Subtype of USER)
-- ============================================================================
-- Role: Holds mechanic-specific attributes (employee badge code).
CREATE TABLE mechanic (
    user_id INT NOT NULL,
    employee_code VARCHAR(20) NOT NULL,

    CONSTRAINT pk_mechanic PRIMARY KEY (user_id),
    CONSTRAINT uq_mechanic_employee_code UNIQUE (employee_code),
    -- CASCADE: If base user record is deleted, delete the mechanic profile automatically
    CONSTRAINT fk_mechanic_user FOREIGN KEY (user_id)
        REFERENCES user (user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 5. VEHICLE (Customer-Owned Assets)
-- ============================================================================
-- Role: Represents vehicles serviced by the workshop.
-- Multi-Tenancy Note: workshop_id is NOT duplicated here. It is transitively
-- resolved via owner_id -> user.workshop_id, satisfying 3NF.
CREATE TABLE vehicle (
    vehicle_id INT AUTO_INCREMENT,
    owner_id INT NOT NULL,
    vin VARCHAR(17) NOT NULL,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    odometer INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_vehicle PRIMARY KEY (vehicle_id),
    CONSTRAINT uq_vehicle_vin UNIQUE (vin),
    -- RESTRICT: Cannot delete a user if they own vehicles registered in the system
    CONSTRAINT fk_vehicle_owner FOREIGN KEY (owner_id)
        REFERENCES user (user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Index to quickly look up all vehicles owned by a customer
CREATE INDEX idx_vehicle_owner ON vehicle (owner_id);

-- ============================================================================
-- 6. REMINDER (Predictive Maintenance Alerts)
-- ============================================================================
-- Role: Time/mileage-based notifications for upcoming oil changes, inspections, etc.
CREATE TABLE reminder (
    reminder_id INT AUTO_INCREMENT,
    vehicle_id INT NOT NULL,
    reminder_type VARCHAR(50) NOT NULL,
    due_date DATE NOT NULL,
    message TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_reminder PRIMARY KEY (reminder_id),
    -- CASCADE: If vehicle record is removed, its pending reminders are removed too
    CONSTRAINT fk_reminder_vehicle FOREIGN KEY (vehicle_id)
        REFERENCES vehicle (vehicle_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Index for cron jobs querying upcoming reminders by due_date and status
CREATE INDEX idx_reminder_due_status ON reminder (due_date, status);

-- ============================================================================
-- 7. PROBLEM_REPORT (Customer-Reported Symptoms / Issues)
-- ============================================================================
-- Role: Raw symptom logs filed by customers before AI diagnostic synthesis.
CREATE TABLE problem_report (
    report_id INT AUTO_INCREMENT,
    customer_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_problem_report PRIMARY KEY (report_id),
    -- RESTRICT: Keep customer history intact; cannot delete customer with active reports
    CONSTRAINT fk_problem_customer FOREIGN KEY (customer_id)
        REFERENCES user (user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    -- CASCADE: If a vehicle is decommissioned/deleted, remove its problem reports
    CONSTRAINT fk_problem_vehicle FOREIGN KEY (vehicle_id)
        REFERENCES vehicle (vehicle_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_problem_vehicle ON problem_report (vehicle_id);
CREATE INDEX idx_problem_customer ON problem_report (customer_id);

-- ============================================================================
-- 8. SOLUTION_REPORT (AI-Generated Diagnostic Synthesis)
-- ============================================================================
-- Role: 1:1 Diagnostic solution output generated by Gemini AI for a problem_report.
-- 3NF Justification: Separated from PROBLEM_REPORT to decouple customer input from AI output.
CREATE TABLE solution_report (
    solution_id INT AUTO_INCREMENT,
    report_id INT NOT NULL,
    description TEXT NULL,
    probable_cause TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    urgency VARCHAR(10) NOT NULL,
    confidence_score DECIMAL(4,3) NULL,
    reviewed_by INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_solution_report PRIMARY KEY (solution_id),
    -- 1:1 Relationship constraint: each problem report has exactly ONE diagnostic solution
    CONSTRAINT uq_solution_report_id UNIQUE (report_id),
    -- CASCADE: If the problem report is removed, remove the associated AI solution
    CONSTRAINT fk_solution_report_problem FOREIGN KEY (report_id)
        REFERENCES problem_report (report_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    -- SET NULL: If the reviewing mechanic account is deleted, keep the report but clear the reviewer ID
    CONSTRAINT fk_solution_reviewed_by FOREIGN KEY (reviewed_by)
        REFERENCES user (user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 9. SOLUTION_KEYWORD (Normalized Multi-Valued Symptom Tokens)
-- ============================================================================
-- Role: 1NF normalization for multi-valued diagnostic keywords (e.g. 'brake squeal', 'fluid leak').
-- Identifying Weak Entity: Key is composite (solution_id, symptom_keyword).
CREATE TABLE solution_keyword (
    solution_id INT NOT NULL,
    symptom_keyword VARCHAR(50) NOT NULL,

    CONSTRAINT pk_solution_keyword PRIMARY KEY (solution_id, symptom_keyword),
    CONSTRAINT fk_keyword_solution FOREIGN KEY (solution_id)
        REFERENCES solution_report (solution_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Index to allow rapid reverse keyword lookups across diagnostic cases
CREATE INDEX idx_keyword_search ON solution_keyword (symptom_keyword);

-- ============================================================================
-- 10. APPOINTMENT (Service Scheduling & Completed Work Logs)
-- ============================================================================
-- Role: Core transactional entity representing workshop bay reservations and completed repairs.
-- Concurrency Note: Range overlap checks must be performed in application transactions.
CREATE TABLE appointment (
    appointment_id INT AUTO_INCREMENT,
    vehicle_id INT NOT NULL,
    mechanic_id INT NOT NULL,
    report_id INT NULL,
    scheduled_start DATETIME NOT NULL,
    duration_minutes INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    service_description TEXT NULL,
    parts_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    labor_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_appointment PRIMARY KEY (appointment_id),
    -- RESTRICT: Vehicle cannot be deleted if active service appointments exist
    CONSTRAINT fk_appointment_vehicle FOREIGN KEY (vehicle_id)
        REFERENCES vehicle (vehicle_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    -- RESTRICT: Mechanic cannot be deleted if assigned to appointments
    CONSTRAINT fk_appointment_mechanic FOREIGN KEY (mechanic_id)
        REFERENCES user (user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    -- SET NULL: If problem report is deleted, appointment remains with report_id set to NULL
    CONSTRAINT fk_appointment_report FOREIGN KEY (report_id)
        REFERENCES problem_report (report_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- B-Tree Composite Index for conflict-free range query scans:
-- (mechanic_id, scheduled_start, status) allows the query planner to quickly isolate
-- appointments belonging to a mechanic within the target date window.
CREATE INDEX idx_appointment_schedule ON appointment (mechanic_id, scheduled_start, status);
CREATE INDEX idx_appointment_vehicle ON appointment (vehicle_id);

-- ============================================================================
-- 11. INVOICE (Itemized Billing & Financial Settlement)
-- ============================================================================
-- Role: 1:1 Child of completed APPOINTMENT.
-- 3NF Justification: total_amount is stored statically at invoice issuance time
-- to preserve historical financial records even if parts/labor pricing rules change later.
CREATE TABLE invoice (
    invoice_id INT AUTO_INCREMENT,
    appointment_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_invoice PRIMARY KEY (invoice_id),
    -- 1:1 Relationship constraint: an appointment can produce at most ONE invoice
    CONSTRAINT uq_invoice_appointment UNIQUE (appointment_id),
    -- CASCADE: If appointment is deleted, remove the linked invoice record
    CONSTRAINT fk_invoice_appointment FOREIGN KEY (appointment_id)
        REFERENCES appointment (appointment_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Index to quickly filter unpaid or overdue invoices
CREATE INDEX idx_invoice_status ON invoice (status);

-- ============================================================================
-- 12. CONVERSATION (Unified Message Stream for Appointment Threads)
-- ============================================================================
-- Role: Streamlined single-table chat log between customer and assigned mechanic.
CREATE TABLE conversation (
    conversation_id INT AUTO_INCREMENT,
    appointment_id INT NOT NULL,
    sender_id INT NOT NULL,
    content TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_conversation PRIMARY KEY (conversation_id),
    -- CASCADE: Deleting an appointment removes its messaging history
    CONSTRAINT fk_conversation_appointment FOREIGN KEY (appointment_id)
        REFERENCES appointment (appointment_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    -- RESTRICT: Cannot delete a user while they have messages in the audit trail
    CONSTRAINT fk_conversation_sender FOREIGN KEY (sender_id)
        REFERENCES user (user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Index for retrieving appointment message stream chronologically
CREATE INDEX idx_conversation_thread ON conversation (appointment_id, sent_at);
