import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, Preformatted
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        print(f"Total pages generated: {num_pages}")
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8.5)
        self.setFillColor(colors.HexColor("#6b7280"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, letter[1] - 36, "AutoCare AI – Vehicle Service & Maintenance SaaS (V1) | Technical Specification")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(54, letter[1] - 42, letter[0] - 54, letter[1] - 42)
        
        # Footer
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 54, 32, page_text)
        self.drawString(54, 32, "AutoCare AI – Workplan & Technical Specification (Raw SQL Architecture)")
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(54, 44, letter[0] - 54, 44)
        
        self.restoreState()

def create_code_box(text, code_style, width):
    t = Table([[Preformatted(text, code_style)]], colWidths=[width])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor("#cbd5e1")),
        ('PADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    return t

def build_pdf(filename="AutoCare ORM.pdf"):
    content_width = letter[0] - 108 # 504 pt

    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    dark_heading = colors.HexColor("#0056b3")
    text_color = colors.HexColor("#1f2937")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=dark_heading,
        spaceAfter=3
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#4b5563"),
        spaceAfter=10
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=dark_heading,
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.8,
        leading=13,
        textColor=text_color,
        spaceAfter=4
    )

    bullet_style = ParagraphStyle(
        'BulletDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.8,
        leading=13,
        textColor=text_color,
        leftIndent=12,
        firstLineIndent=-10,
        spaceAfter=3
    )

    code_style = ParagraphStyle(
        'CodeSnippet',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#0f172a")
    )

    story = []

    # ================= PAGE 1 =================
    story.append(Paragraph("AutoCare AI – Vehicle Service & Maintenance SaaS (V1)", title_style))
    story.append(Paragraph("Comprehensive Workplan &amp; Technical Specification Document", subtitle_style))

    # 1. Project Title
    story.append(Paragraph("1. Project Title", h1_style))
    story.append(Paragraph("AutoCare AI – Vehicle Service &amp; Maintenance SaaS (V1)", body_style))

    # 2. Refined Problem Statement
    story.append(Paragraph("2. Refined Problem Statement", h1_style))
    story.append(Paragraph(
        "Automotive workshops require an integrated digital platform to manage customer profiles, "
        "maintain historical vehicle records, schedule service bays, and deliver AI-assisted diagnostic "
        "recommendations. AutoCare AI (V1) is a multi-tenant SaaS application that allows workshops to onboard "
        "customers and vehicles, receive problem reports, generate AI-powered diagnostic insights, coordinate "
        "conflict-free service appointments, and generate itemized billing. The platform guarantees strict "
        "multi-tenant data isolation and enforces transactional appointment concurrency control.",
        body_style
    ))

    # 3. Project Overview
    story.append(Paragraph("3. Project Overview", h1_style))
    story.append(Paragraph(
        "AutoCare AI V1 is a multi-tenant web platform for automotive maintenance management. Each workshop (tenant) "
        "operates within an isolated workspace to manage staff (mechanics/admins) and customer accounts, maintain vehicle "
        "inventories, log customer issues, generate diagnostic reports via an integrated LLM, schedule service appointments, "
        "track parts and labor costs, and communicate via appointment-specific messaging threads. The customer-facing web "
        "interface (built with Next.js) allows vehicle owners to monitor vehicle health, review open diagnostic reports, "
        "schedule appointments, review maintenance logs, and inspect invoices.",
        body_style
    ))

    # 4. Revised Solution
    story.append(Paragraph("4. Revised Solution", h1_style))
    story.append(Paragraph(
        "&bull; <b>Multi-Tenant SaaS:</b> Workshops operate in logically isolated workspaces. Customers register and link to a workshop using a unique workshop access code. Multi-tenancy is anchored to the root user profile and enforced across all dependent entities without redundant key duplication.",
        bullet_style
    ))
    story.append(Paragraph(
        "&bull; <b>Diagnostic &amp; Service Pipeline:</b> A customer logs an issue report; the backend performs keyword retrieval against diagnostic procedures and queries an LLM to generate a structured <code>SOLUTION_REPORT</code> with linked keywords stored in <code>SOLUTION_KEYWORD</code>. The workshop reviews the solution report and books a service appointment. Upon completion, the mechanic logs work details, parts cost, and labor cost directly in the <code>APPOINTMENT</code> record, which triggers the generation of an <code>INVOICE</code>.",
        bullet_style
    ))
    story.append(Paragraph(
        "&bull; <b>Direct Communication:</b> Customers and mechanics communicate through an in-app chat tied directly to each appointment, implemented via a unified conversation message log.",
        bullet_style
    ))
    story.append(Paragraph(
        "&bull; <b>Predictive Maintenance Reminders:</b> The system creates rule-based reminders in the <code>REMINDER</code> table based on vehicle mileage thresholds and elapsed calendar intervals.",
        bullet_style
    ))

    # 5. Project Goals & Objectives
    story.append(Paragraph("5. Project Goals &amp; Objectives", h1_style))
    story.append(Paragraph("&bull; Deliver a fully functional MVP supporting all nine core hero features.", bullet_style))
    story.append(Paragraph("&bull; Implement a 3NF-compliant relational database schema within a strict 12-table budget.", bullet_style))
    story.append(Paragraph("&bull; Demonstrate advanced relational concepts: EER supertype/subtype specialization, transactional concurrency locking, and relational multi-tenancy.", bullet_style))
    story.append(PageBreak())

    # ================= PAGE 2 =================
    story.append(Paragraph("&bull; Integrate a retrieval-augmented LLM diagnostic pipeline with structured output persistence.", bullet_style))
    story.append(Paragraph("&bull; Implement an event-driven modular backend architecture using Node.js, Express.js (with raw SQL via mysql2 driver), and Next.js.", bullet_style))

    # 6. Hero Features (9)
    story.append(Paragraph("6. Hero Features (9)", h1_style))
    hero_features = [
        "<b>1. Workshop Dashboard (Tenant Management):</b> Workshop administrators manage shop profiles, staff accounts, customer rosters, and high-level shop metrics within their isolated tenant partition.",
        "<b>2. Role-Based Access &amp; Onboarding:</b> Secure authentication for Admins, Mechanics, and Customers. Customers join via workshop access codes; Admins create Mechanic accounts with unique employee codes.",
        "<b>3. Vehicle Health Dashboard:</b> Customers inspect vehicle profiles (make, model, year, VIN, odometer), historical service logs, active maintenance reminders, and open problem reports.",
        "<b>4. AI-Assisted Diagnostic Assistant:</b> Customer-submitted symptoms trigger procedural context retrieval and LLM processing to produce a <code>SOLUTION_REPORT</code> containing probable causes, recommended actions, urgency levels, and confidence scores, indexed via <code>SOLUTION_KEYWORD</code> entries.",
        "<b>5. Appointment Scheduling (Conflict-Free):</b> Service booking engine that prevents overlapping appointments for the same mechanic using transactional range checks.",
        "<b>6. Digital Service &amp; Maintenance History:</b> Detailed logs of completed maintenance capturing work descriptions, parts costs, and labor costs directly within appointment records, viewable chronologically.",
        "<b>7. Customer–Mechanic Communication:</b> Appointment-specific communication stream stored in a single <code>CONVERSATION</code> table where each record represents an individual message.",
        "<b>8. Simple Invoicing &amp; Payment Tracking:</b> Automatic generation of an <code>INVOICE</code> upon service completion to track total billing amounts and settlement status (Pending/Paid).",
        "<b>9. Maintenance Reminders &amp; Alerts:</b> Rule-based predictive notifications stored in the <code>REMINDER</code> table and triggered by mileage or calendar intervals."
    ]
    for hf in hero_features:
        story.append(Paragraph(hf, bullet_style))

    # 7. User Roles / Actors
    story.append(Paragraph("7. User Roles / Actors", h1_style))
    story.append(Paragraph("&bull; <b>Workshop Admin:</b> Manages workshop configuration, registers mechanic staff, and monitors operations.", bullet_style))
    story.append(Paragraph("&bull; <b>Mechanic / Staff:</b> Reviews assigned repair tickets, examines AI solution reports, records parts/labor costs upon completion, and chats with customers.", bullet_style))
    story.append(Paragraph("&bull; <b>Customer:</b> Registers via workshop access code, registers vehicles, submits problem reports, books appointments, and reviews service history and invoices.", bullet_style))
    story.append(Paragraph("&bull; <b>System / AI Diagnostic Bot:</b> Background service that executes retrieval and generates structured diagnostic solution records.", bullet_style))

    # 8. V1 Scope (Included)
    story.append(Paragraph("8. V1 Scope (Included)", h1_style))
    story.append(Paragraph("&bull; Single-workshop onboarding and strict relational multi-tenant isolation.", bullet_style))
    story.append(Paragraph("&bull; Modular monolithic architecture: Next.js frontend, Express.js (Node.js) backend with raw SQL driver (mysql2), MySQL 8.0 database.", bullet_style))
    story.append(Paragraph("&bull; 3NF schema containing exactly 11 core tables.", bullet_style))
    story.append(Paragraph("&bull; Google Gemini REST API integration for structured diagnostic report synthesis.", bullet_style))
    story.append(Paragraph("&bull; In-process Node.js asynchronous event dispatching for system alerts.", bullet_style))
    story.append(Paragraph("&bull; Containerized local development using Docker Compose and automated CI via GitHub Actions.", bullet_style))
    story.append(PageBreak())

    # ================= PAGE 3 =================
    # 9. Removed / Deferred Complexity
    story.append(Paragraph("9. Removed / Deferred Complexity", h1_style))
    story.append(Paragraph("&bull; No public multi-workshop marketplace or SaaS billing tiers.", bullet_style))
    story.append(Paragraph("&bull; No external vector database (retrieval uses internal keyword matching).", bullet_style))
    story.append(Paragraph("&bull; No multi-currency accounting engine or external payment gateway integrations (Stripe/PayPal deferred).", bullet_style))
    story.append(Paragraph("&bull; No third-party OAuth/SSO or MFA mechanisms (standard JWT authentication).", bullet_style))
    story.append(Paragraph("&bull; No distributed event broker (Kafka/RabbitMQ deferred; in-process Node.js events used).", bullet_style))

    # 10. Functional Requirements
    story.append(Paragraph("10. Functional Requirements", h1_style))
    fn_reqs = [
        "<b>Tenant Registration:</b> Workshop creates an access code for customer registration.",
        "<b>User Onboarding:</b> Users register as Customers via workshop access codes or are provisioned by Admins as Mechanics with employee codes.",
        "<b>Vehicle Registration:</b> Customers link multiple vehicles to their account.",
        "<b>Problem Reporting:</b> Customers submit symptom descriptions for a registered vehicle.",
        "<b>Diagnostic Generation:</b> Backend retrieves matching procedures, calls the LLM, and persists a structured <code>SOLUTION_REPORT</code> and associated <code>SOLUTION_KEYWORD</code> rows.",
        "<b>Appointment Scheduling:</b> Customers book appointments; the system transactionally validates that the assigned mechanic has no overlapping time ranges.",
        "<b>Service Completion:</b> Mechanics record work descriptions, parts cost, and labor cost on the <code>APPOINTMENT</code> record.",
        "<b>Invoicing:</b> Completing an appointment generates an <code>INVOICE</code> with the computed total amount.",
        "<b>Messaging:</b> Customers and mechanics exchange messages within an appointment chat thread stored in <code>CONVERSATION</code>.",
        "<b>Maintenance Reminders:</b> Automated engine schedules predictive service reminders in <code>REMINDER</code>."
    ]
    for req in fn_reqs:
        story.append(Paragraph(f"&bull; {req}", bullet_style))

    # 11. Non-Functional Requirements
    story.append(Paragraph("11. Non-Functional Requirements", h1_style))
    story.append(Paragraph("&bull; <b>Security:</b> Stateless JWT authentication, BCrypt password hashing, role-based authorization, and strict multi-tenant boundary checks.", bullet_style))
    story.append(Paragraph("&bull; <b>Reliability &amp; Concurrency:</b> ACID transactions and pessimistic locking on appointment range queries to prevent mechanic double-booking.", bullet_style))
    story.append(Paragraph("&bull; <b>Performance:</b> Lightweight schema indexes on all foreign keys, unique natural keys, and search keywords.", bullet_style))
    story.append(Paragraph("&bull; <b>Maintainability:</b> Layered architecture (Routes/Controllers, Services/Business Logic, Repositories/Data Access Layer with parameterized Raw SQL) with normalized schema models and zero ORM abstractions.", bullet_style))
    story.append(PageBreak())

    # ================= PAGE 4 =================
    # 12. Simplified System Architecture
    story.append(Paragraph("12. Simplified System Architecture", h1_style))
    arch_ascii = (
        "+-------------------------------------------------------------------------+\n"
        "|                        Next.js Frontend (React)                         |\n"
        "+-------------------------------------------------------------------------+\n"
        "                                     |\n"
        "                               REST API (JWT)\n"
        "                                     |\n"
        "+-------------------------------------------------------------------------+\n"
        "|                      Express.js (Node.js) Backend                       |\n"
        "|  [Controllers]  ->  [Services & Business Logic]  ->  [Raw SQL Repos]   |\n"
        "+-------------------------------------------------------------------------+\n"
        "               |                                         |\n"
        "     mysql2 (Raw SQL Driver)                          REST API\n"
        "               |                                         |\n"
        "+-----------------------------+           +-------------------------------+\n"
        "|      MySQL 8.0 Database     |           |        Google Gemini AI       |\n"
        "+-----------------------------+           +-------------------------------+"
    )
    story.append(create_code_box(arch_ascii, code_style, content_width))
    story.append(Spacer(1, 4))

    # 13. Complete Technology Stack
    story.append(Paragraph("13. Complete Technology Stack", h1_style))
    story.append(Paragraph("&bull; <b>Frontend:</b> Next.js (App Router), React, TypeScript, Tailwind CSS.", bullet_style))
    story.append(Paragraph("&bull; <b>Backend:</b> Node.js, Express.js, Raw SQL (<code>mysql2</code> driver with connection pooling &amp; transactions), jsonwebtoken (Stateless JWT), bcryptjs.", bullet_style))
    story.append(Paragraph("&bull; <b>Database:</b> MySQL 8.0.", bullet_style))
    story.append(Paragraph("&bull; <b>AI Engine:</b> Google Gemini REST API.", bullet_style))
    story.append(Paragraph("&bull; <b>Containerization &amp; CI/CD:</b> Docker, Docker Compose, GitHub Actions.", bullet_style))

    # 14. Technology Priority
    story.append(Paragraph("14. Technology Priority", h1_style))
    story.append(Paragraph("&bull; <b>Core (Mandatory):</b> Express.js backend (Raw SQL / mysql2), MySQL relational schema, Next.js interface, JWT security, Gemini AI diagnostic workflow, transactional booking lock.", bullet_style))
    story.append(Paragraph("&bull; <b>Secondary:</b> Docker Compose setup, Express health check endpoints, Tailwind UI styling.", bullet_style))
    story.append(Paragraph("&bull; <b>Deferred:</b> Redis caching, WebSockets, external payment gateways, distributed tracing.", bullet_style))

    # 15. Database-First Development Strategy
    story.append(Paragraph("15. Database-First Development Strategy", h1_style))
    story.append(Paragraph("&bull; Map all domain requirements into clean relational entities with surrogate primary keys.", bullet_style))
    story.append(Paragraph("&bull; Normalize all structures to 3NF, eliminating partial and transitive dependencies.", bullet_style))
    story.append(Paragraph("&bull; Implement database schema DDL with explicit foreign key constraints and cascade actions.", bullet_style))
    story.append(Paragraph("&bull; Build raw SQL repository data access modules (parameterized queries, transaction helpers) matching database tables and configure automated database integration tests.", bullet_style))

    # 16. ER/EER Design Preparation
    story.append(Paragraph("16. ER/EER Design Preparation", h1_style))
    story.append(Paragraph("&bull; <b>Surrogate Keys:</b> Standardize on integer auto-increment primary keys across all parent tables.", bullet_style))
    story.append(Paragraph("&bull; <b>Role Specialization:</b> Implement an EER supertype/subtype hierarchy where <code>USER</code> is the supertype and <code>CUSTOMER</code> and <code>MECHANIC</code> are subtype tables holding role-specific attributes.", bullet_style))
    story.append(Paragraph("&bull; <b>Atomic Decompositions:</b> Multi-valued symptom keywords are normalized into <code>SOLUTION_KEYWORD</code> (1NF).", bullet_style))
    story.append(Paragraph("&bull; <b>Elimination of Transitive Dependencies:</b> Child entities reference their direct parent only; tenant ownership is derived via the parent user's <code>workshop_id</code> (3NF).", bullet_style))

    # 17. Target Entity / Table Budget
    story.append(Paragraph("17. Target Entity / Table Budget", h1_style))
    story.append(Paragraph("The final normalized architecture consists of 11 tables (satisfying the &le; 12 table budget):", body_style))
    story.append(PageBreak())

    # ================= PAGE 5 =================
    tables_list = [
        "1. WORKSHOP (Tenant organization)",
        "2. USER (Supertype authentication and profile entity)",
        "3. CUSTOMER (Subtype table for customer-specific data)",
        "4. MECHANIC (Subtype table for mechanic-specific data)",
        "5. VEHICLE (Customer-owned vehicles)",
        "6. REMINDER (Predictive maintenance reminders)",
        "7. PROBLEM_REPORT (Customer-reported issues)",
        "8. SOLUTION_REPORT (AI-generated diagnostic solution reports)",
        "9. SOLUTION_KEYWORD (Normalized symptom keywords for diagnostic matching)",
        "10. APPOINTMENT (Service booking and completed maintenance log)",
        "11. INVOICE (Itemized billing and payment status)",
        "12. CONVERSATION (Single-table message repository for appointment chat)"
    ]
    for tbl in tables_list:
        story.append(Paragraph(tbl, bullet_style))

    # 18. Recommended Entity Structure
    story.append(Paragraph("18. Recommended Entity Structure", h1_style))
    entities_desc = [
        "&bull; <b>WORKSHOP (Strong):</b> The tenant entity; holds name, address, and unique access code.",
        "&bull; <b>USER (Strong / Supertype):</b> Base credentials, workshop foreign key, and role enumeration (ADMIN, CUSTOMER, MECHANIC).",
        "&bull; <b>CUSTOMER (Subtype of USER):</b> Contains customer-specific contact information (phone).",
        "&bull; <b>MECHANIC (Subtype of USER):</b> Contains mechanic-specific staff identification (employee_code).",
        "&bull; <b>VEHICLE (Strong):</b> Vehicle identity and odometer records linked to an owner USER.",
        "&bull; <b>REMINDER (Strong):</b> Automated service reminder linked to a VEHICLE.",
        "&bull; <b>PROBLEM_REPORT (Strong):</b> Raw customer symptom log linked to a VEHICLE and reporting USER.",
        "&bull; <b>SOLUTION_REPORT (Strong / Child of Problem Report):</b> AI-generated analysis (probable cause, recommended action, urgency, confidence score) linked 1:1 to a PROBLEM_REPORT.",
        "&bull; <b>SOLUTION_KEYWORD (Weak / Associative):</b> Atomic keywords linked to a SOLUTION_REPORT via composite PK (solution_id, symptom_keyword).",
        "&bull; <b>APPOINTMENT (Strong):</b> Service reservation and post-service log (work details, parts cost, labor cost) linked to VEHICLE, mechanic USER, and optional PROBLEM_REPORT.",
        "&bull; <b>INVOICE (Strong / Child of Appointment):</b> Billing record linked 1:1 to APPOINTMENT.",
        "&bull; <b>CONVERSATION (Strong):</b> Individual chat messages linked to APPOINTMENT and sender USER."
    ]
    for ed in entities_desc:
        story.append(Paragraph(ed, bullet_style))
    story.append(PageBreak())

    # ================= PAGE 6 =================
    # 19. Entity Details (Attributes & Data Types)
    story.append(Paragraph("19. Entity Details (Attributes &amp; Data Types)", h1_style))

    ddl_p1 = (
        "WORKSHOP\n"
        "workshop_id INT AUTO_INCREMENT (PK)\n"
        "name VARCHAR(100) NOT NULL\n"
        "address VARCHAR(200)\n"
        "access_code VARCHAR(50) UNIQUE NOT NULL\n\n"
        "USER\n"
        "user_id INT AUTO_INCREMENT (PK)\n"
        "workshop_id INT NOT NULL (FK -> WORKSHOP.workshop_id)\n"
        "first_name VARCHAR(50) NOT NULL\n"
        "last_name VARCHAR(50) NOT NULL\n"
        "email VARCHAR(100) UNIQUE NOT NULL\n"
        "password_hash VARCHAR(255) NOT NULL\n"
        "role ENUM('ADMIN', 'CUSTOMER', 'MECHANIC') NOT NULL\n\n"
        "CUSTOMER\n"
        "user_id INT (PK, FK -> USER.user_id ON DELETE CASCADE)\n"
        "phone VARCHAR(20)\n\n"
        "MECHANIC\n"
        "user_id INT (PK, FK -> USER.user_id ON DELETE CASCADE)\n"
        "employee_code VARCHAR(20) UNIQUE NOT NULL\n\n"
        "VEHICLE\n"
        "vehicle_id INT AUTO_INCREMENT (PK)\n"
        "owner_id INT NOT NULL (FK -> USER.user_id)\n"
        "vin VARCHAR(17) UNIQUE NOT NULL\n"
        "make VARCHAR(50) NOT NULL\n"
        "model VARCHAR(50) NOT NULL\n"
        "year INT NOT NULL\n"
        "odometer INT NOT NULL\n\n"
        "REMINDER\n"
        "reminder_id INT AUTO_INCREMENT (PK)\n"
        "vehicle_id INT NOT NULL (FK -> VEHICLE.vehicle_id ON DELETE CASCADE)\n"
        "reminder_type VARCHAR(50) NOT NULL\n"
        "due_date DATE NOT NULL\n"
        "message TEXT\n"
        "status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'\n"
        "created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n\n"
        "PROBLEM_REPORT\n"
        "report_id INT AUTO_INCREMENT (PK)\n"
        "customer_id INT NOT NULL (FK -> USER.user_id)\n"
        "vehicle_id INT NOT NULL (FK -> VEHICLE.vehicle_id ON DELETE CASCADE)\n"
        "description TEXT NOT NULL\n"
        "status VARCHAR(20) NOT NULL DEFAULT 'OPEN'\n"
        "created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n\n"
        "SOLUTION_REPORT\n"
        "solution_id INT AUTO_INCREMENT (PK)\n"
        "report_id INT NOT NULL UNIQUE (FK -> PROBLEM_REPORT.report_id ON DELETE CASCADE)\n"
        "description TEXT\n"
        "probable_cause TEXT NOT NULL\n"
        "recommended_action TEXT NOT NULL\n"
        "urgency VARCHAR(10) NOT NULL\n"
        "confidence_score DECIMAL(4,3)\n"
        "reviewed_by INT (FK -> USER.user_id ON DELETE SET NULL)\n"
        "created_at DATETIME DEFAULT CURRENT_TIMESTAMP"
    )
    story.append(create_code_box(ddl_p1, code_style, content_width))
    story.append(PageBreak())

    # ================= PAGE 7 =================
    ddl_p2 = (
        "SOLUTION_KEYWORD\n"
        "solution_id INT NOT NULL (PK, FK -> SOLUTION_REPORT.solution_id ON DELETE CASCADE)\n"
        "symptom_keyword VARCHAR(50) NOT NULL (PK)\n\n"
        "APPOINTMENT\n"
        "appointment_id INT AUTO_INCREMENT (PK)\n"
        "vehicle_id INT NOT NULL (FK -> VEHICLE.vehicle_id)\n"
        "mechanic_id INT NOT NULL (FK -> USER.user_id)\n"
        "report_id INT NULL (FK -> PROBLEM_REPORT.report_id ON DELETE SET NULL)\n"
        "scheduled_start DATETIME NOT NULL\n"
        "duration_minutes INT NOT NULL\n"
        "status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED'\n"
        "service_description TEXT\n"
        "parts_cost DECIMAL(10,2) DEFAULT 0.00\n"
        "labor_cost DECIMAL(10,2) DEFAULT 0.00\n\n"
        "INVOICE\n"
        "invoice_id INT AUTO_INCREMENT (PK)\n"
        "appointment_id INT NOT NULL UNIQUE (FK -> APPOINTMENT.appointment_id ON DELETE CASCADE)\n"
        "total_amount DECIMAL(10,2) NOT NULL\n"
        "status VARCHAR(20) NOT NULL DEFAULT 'PENDING'\n"
        "issued_at DATETIME DEFAULT CURRENT_TIMESTAMP\n\n"
        "CONVERSATION\n"
        "conversation_id INT AUTO_INCREMENT (PK)\n"
        "appointment_id INT NOT NULL (FK -> APPOINTMENT.appointment_id ON DELETE CASCADE)\n"
        "sender_id INT NOT NULL (FK -> USER.user_id)\n"
        "content TEXT NOT NULL\n"
        "sent_at DATETIME DEFAULT CURRENT_TIMESTAMP"
    )
    story.append(create_code_box(ddl_p2, code_style, content_width))
    story.append(Spacer(1, 3))

    # 20. Composite Attributes
    story.append(Paragraph("20. Composite Attributes", h1_style))
    story.append(Paragraph("Address fields are modeled as atomic text strings or broken into standard atomic fields (address) within <code>WORKSHOP</code>. User names are strictly decomposed into <code>first_name</code> and <code>last_name</code>.", body_style))

    # 21. Multivalued Attributes
    story.append(Paragraph("21. Multivalued Attributes", h1_style))
    story.append(Paragraph("Symptom keywords for AI solutions are normalized into individual rows within <code>SOLUTION_KEYWORD</code> (satisfying 1NF). User phone numbers are stored as atomic single attributes in <code>CUSTOMER</code>.", body_style))

    # 22. Derived Attributes
    story.append(Paragraph("22. Derived Attributes", h1_style))
    story.append(Paragraph("<code>total_amount</code> in <code>INVOICE</code> is computed at appointment completion from <code>parts_cost + labor_cost</code> and stored to preserve billing history. <code>full_name</code> is dynamically concatenated in the application layer and not stored. <code>vehicle_age</code> is calculated from <code>YEAR(CURDATE()) - year</code> and omitted from the database schema.", body_style))

    # 23. Primary Keys / Candidate Keys / Composite Keys
    story.append(Paragraph("23. Primary Keys / Candidate Keys / Composite Keys", h1_style))
    story.append(Paragraph("&bull; <b>Primary Keys:</b> Surrogate auto-increment keys for all primary entities.", bullet_style))
    story.append(Paragraph("&bull; <b>Composite Primary Key:</b> (solution_id, symptom_keyword) on <code>SOLUTION_KEYWORD</code>.", bullet_style))
    story.append(Paragraph("&bull; <b>Candidate / Unique Keys:</b> WORKSHOP.access_code, USER.email, MECHANIC.employee_code, VEHICLE.vin, SOLUTION_REPORT.report_id (1:1), INVOICE.appointment_id (1:1).", bullet_style))

    # 24. Foreign Keys & Integrity Constraints (first 2)
    story.append(Paragraph("24. Foreign Keys &amp; Integrity Constraints", h1_style))
    story.append(Paragraph("&bull; USER.workshop_id &rarr; WORKSHOP.workshop_id (ON DELETE RESTRICT)", bullet_style))
    story.append(Paragraph("&bull; CUSTOMER.user_id &rarr; USER.user_id (ON DELETE CASCADE)", bullet_style))
    story.append(PageBreak())

    # ================= PAGE 8 =================
    fks_p2 = [
        "MECHANIC.user_id &rarr; USER.user_id (ON DELETE CASCADE)",
        "VEHICLE.owner_id &rarr; USER.user_id (ON DELETE RESTRICT)",
        "REMINDER.vehicle_id &rarr; VEHICLE.vehicle_id (ON DELETE CASCADE)",
        "PROBLEM_REPORT.customer_id &rarr; USER.user_id (ON DELETE RESTRICT)",
        "PROBLEM_REPORT.vehicle_id &rarr; VEHICLE.vehicle_id (ON DELETE CASCADE)",
        "SOLUTION_REPORT.report_id &rarr; PROBLEM_REPORT.report_id (ON DELETE CASCADE)",
        "SOLUTION_REPORT.reviewed_by &rarr; USER.user_id (ON DELETE SET NULL)",
        "SOLUTION_KEYWORD.solution_id &rarr; SOLUTION_REPORT.solution_id (ON DELETE CASCADE)",
        "APPOINTMENT.vehicle_id &rarr; VEHICLE.vehicle_id (ON DELETE RESTRICT)",
        "APPOINTMENT.mechanic_id &rarr; USER.user_id (ON DELETE RESTRICT)",
        "APPOINTMENT.report_id &rarr; PROBLEM_REPORT.report_id (ON DELETE SET NULL)",
        "INVOICE.appointment_id &rarr; APPOINTMENT.appointment_id (ON DELETE CASCADE)",
        "CONVERSATION.appointment_id &rarr; APPOINTMENT.appointment_id (ON DELETE CASCADE)",
        "CONVERSATION.sender_id &rarr; USER.user_id (ON DELETE RESTRICT)"
    ]
    for fk in fks_p2:
        story.append(Paragraph(f"&bull; {fk}", bullet_style))

    # 25. Identifying Relationships (Weak Entities)
    story.append(Paragraph("25. Identifying Relationships (Weak Entities)", h1_style))
    story.append(Paragraph("<code>SOLUTION_KEYWORD</code> is an identifying weak entity dependent on <code>SOLUTION_REPORT</code>, utilizing <code>solution_id</code> as part of its composite primary key. <code>CUSTOMER</code> and <code>MECHANIC</code> are subtype entities that share their primary key with <code>USER.user_id</code>.", body_style))

    # 26. Recursive Relationships
    story.append(Paragraph("26. Recursive Relationships", h1_style))
    story.append(Paragraph("No recursive unary relationships exist in this schema version.", body_style))

    # 27. Generalization / Specialization (ISA)
    story.append(Paragraph("27. Generalization / Specialization (ISA)", h1_style))
    story.append(Paragraph("An EER supertype/subtype hierarchy is implemented: <code>USER</code> serves as the supertype containing shared authentication attributes (email, password_hash, first_name, last_name, role, workshop_id). <code>CUSTOMER</code> is a specialization containing customer-specific fields (phone). <code>MECHANIC</code> is a specialization containing staff-specific fields (employee_code).", body_style))
    story.append(PageBreak())

    # ================= PAGE 9 =================
    # 28. Relationship & Cardinality Table
    story.append(Paragraph("28. Relationship &amp; Cardinality Table", h1_style))
    
    table_data = [
        ["Entity A", "Entity B", "Cardinality", "Participation", "Description", "Associative\nEntity?"],
        ["WORKSHOP", "USER", "1:N", "Workshop (1,1),\nUser (1,1)", "Workshop employs staff and onboards customers", "No"],
        ["USER", "CUSTOMER", "1:1", "User (0,1),\nCustomer (1,1)", "Customer subtype specialization", "No"],
        ["USER", "MECHANIC", "1:1", "User (0,1),\nMechanic (1,1)", "Mechanic subtype specialization", "No"],
        ["USER (Customer)", "VEHICLE", "1:N", "User (1,1),\nVehicle (1,1)", "Customer owns one or more vehicles", "No"],
        ["VEHICLE", "REMINDER", "1:N", "Vehicle (1,1),\nReminder (0,*)", "Vehicle has scheduled service reminders", "No"],
        ["VEHICLE", "PROBLEM_REPORT", "1:N", "Vehicle (1,1),\nReport (0,*)", "Issues reported against a vehicle", "No"],
        ["PROBLEM_REPORT", "SOLUTION_REPORT", "1:1", "Report (1,1),\nSolution (0,1)", "AI-generated diagnostic report for an issue", "No"],
        ["SOLUTION_REPORT", "SOLUTION_KEYWORD", "1:N", "Solution (1,1),\nKeyword (1,*)", "Normalized search keywords for solution", "Yes\n(Identifying)"],
        ["VEHICLE", "APPOINTMENT", "1:N", "Vehicle (1,1),\nAppt (0,*)", "Vehicle booked for maintenance", "No"],
        ["USER (Mechanic)", "APPOINTMENT", "1:N", "User (1,1),\nAppt (0,*)", "Mechanic assigned to service appointment", "No"],
        ["APPOINTMENT", "INVOICE", "1:1", "Appt (1,1),\nInvoice (0,1)", "Invoice generated upon service completion", "No"],
        ["APPOINTMENT", "CONVERSATION", "1:N", "Appt (1,1),\nMessage (0,*)", "Messages exchanged regarding appointment", "No"]
    ]

    cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=11,
        textColor=text_color
    )
    cell_header = ParagraphStyle(
        'TableHead',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.2,
        leading=11,
        textColor=colors.HexColor("#0f4c81")
    )

    formatted_table = []
    for r_idx, row in enumerate(table_data):
        formatted_row = []
        for c in row:
            if r_idx == 0:
                formatted_row.append(Paragraph(c.replace('\n', '<br/>'), cell_header))
            else:
                formatted_row.append(Paragraph(c.replace('\n', '<br/>'), cell_style))
        formatted_table.append(formatted_row)

    t_rel = Table(formatted_table, colWidths=[82, 96, 56, 76, 140, 54])
    t_rel.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_rel)
    story.append(PageBreak())

    # ================= PAGE 10 =================
    # 29. Tenant Ownership / Isolation Map
    story.append(Paragraph("29. Tenant Ownership / Isolation Map", h1_style))
    story.append(Paragraph(
        "Multi-tenancy is enforced through the root foreign key <code>USER.workshop_id</code>. No child tables store "
        "redundant <code>workshop_id</code> columns, eliminating transitive functional dependencies and ensuring 3NF "
        "compliance. Tenant data isolation is enforced at runtime by resolving the authenticated user's "
        "<code>workshop_id</code> in the application service layer and joining across direct relational foreign keys.",
        body_style
    ))

    # 30. Appointment & Concurrency Modeling
    story.append(Paragraph("30. Appointment &amp; Concurrency Modeling", h1_style))
    story.append(Paragraph(
        "<code>APPOINTMENT</code> stores <code>scheduled_start</code> (DATETIME) and <code>duration_minutes</code> (INT). "
        "Database unique constraints on (mechanic_id, scheduled_start) cannot prevent overlapping ranges. Concurrency is "
        "enforced via transactional checks using pessimistic locking (<code>SELECT ... FOR UPDATE</code>):",
        body_style
    ))
    sql_lock = (
        "SELECT COUNT(*) FROM APPOINTMENT\n"
        "WHERE mechanic_id = :mechanicId\n"
        "  AND status != 'CANCELLED'\n"
        "  AND scheduled_start < :newEndTime\n"
        "  AND DATE_ADD(scheduled_start, INTERVAL duration_minutes MINUTE) > :newStartTime;"
    )
    story.append(create_code_box(sql_lock, code_style, content_width))
    story.append(Spacer(1, 2))
    story.append(Paragraph("If the count exceeds zero, the transaction rolls back and the booking request is rejected.", body_style))

    # 31. AI / RAG Architecture
    story.append(Paragraph("31. AI / RAG Architecture", h1_style))
    story.append(Paragraph(
        "Customer logs a problem in <code>PROBLEM_REPORT</code>. Backend extracts symptom tokens, retrieves matching "
        "procedural templates from internal static catalogs, and constructs a structured prompt. Google Gemini LLM "
        "processes the prompt and returns a structured JSON payload containing: <code>probable_cause</code>, "
        "<code>recommended_action</code>, <code>urgency</code>, and <code>confidence_score</code>. The backend persists the "
        "output in <code>SOLUTION_REPORT</code> and inserts associated search tokens into <code>SOLUTION_KEYWORD</code>.",
        body_style
    ))

    # 32. Event-Driven Architecture
    story.append(Paragraph("32. Event-Driven Architecture", h1_style))
    story.append(Paragraph(
        "In-process Node.js EventEmitter manage domain side-effects without table bloat: "
        "<code>ProblemReportedEvent</code> (dispatches async AI diagnostic processing), "
        "<code>AppointmentBookedEvent</code> (sends booking confirmations), and "
        "<code>ServiceCompletedEvent</code> (automatically triggers <code>INVOICE</code> record creation).",
        body_style
    ))

    # 33. Backend Architecture
    story.append(Paragraph("33. Backend Architecture", h1_style))
    story.append(Paragraph("&bull; <b>Route / Controller Layer:</b> Exposes REST endpoints (Express router), validates request payloads/DTOs, and handles HTTP response mapping.", bullet_style))
    story.append(Paragraph("&bull; <b>Authentication / Authorization Middleware:</b> Intercepts requests, validates JWT claims, and injects authenticated user context (user_id, workshop_id, role).", bullet_style))
    story.append(Paragraph("&bull; <b>Service Layer:</b> Executes transactional business logic, coordinates LLM API calls, and enforces concurrency locks via explicit SQL transaction management.", bullet_style))
    story.append(Paragraph("&bull; <b>Data Access / Repository Layer:</b> Raw SQL repository modules executing parameterized SQL statements directly via mysql2 connection pool (without ORM).", bullet_style))

    # 34. Frontend Architecture
    story.append(Paragraph("34. Frontend Architecture", h1_style))
    story.append(Paragraph(
        "Workshop Dashboard (admin portal), Vehicle Portal (customer garage view), Diagnostic Console (issue submission "
        "&amp; solution report viewer), Booking Scheduler (conflict-aware slot calendar), and Appointment Hub (integrated "
        "view containing appointment status, service history details, invoice summaries, and chat interface).",
        body_style
    ))

    # 35. Phase-by-Phase Implementation Workflow (Part 1)
    story.append(Paragraph("35. Phase-by-Phase Implementation Workflow", h1_style))
    story.append(Paragraph("&bull; <b>Phase 0 – Planning &amp; Architecture (Week 1):</b> Finalize 3NF schema, approve EER specialization, and configure repository.", bullet_style))
    story.append(Paragraph("&bull; <b>Phase 1 – Database Deployment (Week 2):</b> Execute DDL scripts, configure foreign key constraints, insert seed data, and verify relational joins.", bullet_style))
    story.append(PageBreak())

    # ================= PAGE 11 =================
    phases_p2 = [
        "<b>Phase 2 – Core Backend &amp; Security (Week 3):</b> Bootstrap Node.js / Express.js, configure JWT authentication middleware &amp; BCrypt password hashing, establish mysql2 connection pool, and implement raw SQL user/auth repository modules.",
        "<b>Phase 3 – Vehicle &amp; Issue Subsystem (Week 4):</b> Build vehicle management APIs, problem report endpoints, and reminder cron jobs.",
        "<b>Phase 4 – AI Diagnostic Integration (Week 5):</b> Integrate Gemini REST API, build JSON parser, and implement <code>SOLUTION_REPORT</code> and <code>SOLUTION_KEYWORD</code> persistence.",
        "<b>Phase 5 – Appointment &amp; Concurrency Engine (Week 6):</b> Build booking engine with pessimistic range-locking transactions (<code>SELECT ... FOR UPDATE</code>) and mechanic slot calculators.",
        "<b>Phase 6 – Messaging &amp; Billing Subsystem (Week 7):</b> Implement single-table <code>CONVERSATION</code> chat APIs and automatic <code>INVOICE</code> generation upon appointment completion.",
        "<b>Phase 7 – Frontend Assembly (Week 8):</b> Build Next.js dashboards, booking UI, chat components, and vehicle health views.",
        "<b>Phase 8 – Testing, Validation &amp; CI/CD (Week 9):</b> Execute parallel concurrency tests, mock AI responses, build Docker Compose manifests, and deploy via GitHub Actions."
    ]
    for p in phases_p2:
        story.append(Paragraph(f"&bull; {p}", bullet_style))

    # 36. Testing Strategy
    story.append(Paragraph("36. Testing Strategy", h1_style))
    story.append(Paragraph("&bull; <b>Unit Testing:</b> Jest / Vitest and Supertest for service-layer business rules, controllers, and input validation.", bullet_style))
    story.append(Paragraph("&bull; <b>Database Integration Testing:</b> Integration test suite executing against MySQL 8.0 instance to validate raw SQL queries, foreign key cascades, constraints, and ACID transactions.", bullet_style))
    story.append(Paragraph("&bull; <b>Concurrency Testing:</b> Multi-threaded / concurrent async worker tests simulating simultaneous booking requests for identical mechanic slots to verify transactional locking.", bullet_style))
    story.append(Paragraph("&bull; <b>AI Mock Testing:</b> Mock simulations of Gemini API payloads to verify robust error handling and parsing.", bullet_style))

    # 37. Docker & Deployment Configuration
    story.append(Paragraph("37. Docker &amp; Deployment Configuration", h1_style))
    story.append(Paragraph(
        "<code>docker-compose.yml</code> orchestrates: <code>mysql-db</code> (MySQL 8.0 container with persistent health checks), "
        "<code>backend-api</code> (Node.js/Express.js container), and <code>frontend-ui</code> (Next.js production build container).",
        body_style
    ))

    # 38. CI/CD Pipeline
    story.append(Paragraph("38. CI/CD Pipeline", h1_style))
    story.append(Paragraph(
        "GitHub Actions workflow triggers on push to main: lint and compile Next.js frontend, run backend test suite "
        "against containerized MySQL, and build/verify Docker images.",
        body_style
    ))

    # 39. Monitoring & Logging
    story.append(Paragraph("39. Monitoring &amp; Logging", h1_style))
    story.append(Paragraph(
        "Express health probe endpoints (<code>/api/health</code>, <code>/api/ready</code>). Structured JSON logging "
        "(via Winston / Pino) capturing appointment events, authentication attempts, database query execution, and AI execution latency.",
        body_style
    ))

    # 40. Documentation Deliverables
    story.append(Paragraph("40. Documentation Deliverables", h1_style))
    story.append(Paragraph("&bull; Complete MySQL DDL scripts with constraints and indexes.", bullet_style))
    story.append(Paragraph("&bull; OpenAPI / Swagger REST API specifications.", bullet_style))
    story.append(Paragraph("&bull; EER schema diagram illustrating supertype/subtype hierarchy and cardinalities.", bullet_style))
    story.append(Paragraph("&bull; 3NF Normalization mathematical proofs.", bullet_style))
    story.append(PageBreak())

    # ================= PAGE 12 =================
    # 41. Timeline / Milestones
    story.append(Paragraph("41. Timeline / Milestones", h1_style))
    timeline_ascii = (
        "+-----------------------------------------------------------------------------------------+\n"
        "| W1: DB Design  ->  W2: Schema DDL  ->  W3: Auth / Raw SQL  ->  W4: Vehicles / Reports    |\n"
        "| W5: AI Diagnostics  ->  W6: Concurrency Booking  ->  W7: Chat & Invoicing               |\n"
        "| W8: Frontend UI  ->  W9: Testing, Docker & Final Release                                |\n"
        "+-----------------------------------------------------------------------------------------+"
    )
    story.append(create_code_box(timeline_ascii, code_style, content_width))
    story.append(Spacer(1, 4))

    # 42. Final Deliverables
    story.append(Paragraph("42. Final Deliverables", h1_style))
    story.append(Paragraph("&bull; Production-grade MySQL DDL script implementing the 11-table schema.", bullet_style))
    story.append(Paragraph("&bull; Express.js (Node.js) backend source code with Raw SQL repositories and concurrency controls.", bullet_style))
    story.append(Paragraph("&bull; Next.js frontend application with Tailwind UI components.", bullet_style))
    story.append(Paragraph("&bull; Docker Compose configuration for one-command local orchestration.", bullet_style))
    story.append(Paragraph("&bull; Comprehensive automated test suite covering concurrency, security, and schema integrity.", bullet_style))

    # 43. Final Architecture Summary
    story.append(Paragraph("43. Final Architecture Summary", h1_style))
    story.append(Paragraph(
        "AutoCare AI (V1) is engineered around a clean, 3NF-compliant relational schema consisting of 11 core tables. "
        "The design decouples diagnostic outputs into <code>SOLUTION_REPORT</code>, normalizes keywords into <code>SOLUTION_KEYWORD</code>, "
        "optimizes real-time messaging into a single <code>CONVERSATION</code> table, and models user roles via clean supertype/subtype "
        "specialization (<code>USER</code>, <code>CUSTOMER</code>, <code>MECHANIC</code>). Multi-tenancy is enforced through the root "
        "user workshop link without transitive key duplication, while appointment booking integrity is protected via transactional range locking.",
        body_style
    ))

    # Itemized Change Ledger
    story.append(Spacer(1, 4))
    story.append(Paragraph("Itemized Change Ledger (Modifications Applied)", h1_style))
    changes = [
        "<b>Separated AI Diagnostic Outputs:</b> Removed probable_cause, urgency, recommended_action, and confidence_score from PROBLEM_REPORT. Created SOLUTION_REPORT linked 1:1 with PROBLEM_REPORT and added reviewed_by tracking.",
        "<b>Normalized Symptom Keywords:</b> Added the SOLUTION_KEYWORD composite-key table (solution_id, symptom_keyword) to satisfy 1NF.",
        "<b>Streamlined Chat Architecture:</b> Replaced the two-table Conversation and Message model with a single CONVERSATION table where each row stores an individual message linked to appointment_id.",
        "<b>Implemented Role Subtyping:</b> Updated USER into a supertype entity with CUSTOMER (storing phone) and MECHANIC (storing employee_code) subtype tables.",
        "<b>Refactored Multi-Tenancy:</b> Removed redundant workshop_id foreign keys from downstream entities (VEHICLE, APPOINTMENT, PROBLEM_REPORT) to eliminate transitive dependencies and ensure 3NF compliance.",
        "<b>Updated Concurrency Strategy:</b> Replaced simple unique index assumptions with transactional range checks (SELECT ... FOR UPDATE) to prevent overlapping appointment intervals.",
        "<b>Normalized Service Details:</b> Added service_description, parts_cost, and labor_cost directly to APPOINTMENT and eliminated redundant stored derived totals.",
        "<b>Integrated Reminders Entity:</b> Formalized the REMINDER table to support predictive maintenance schedules.",
        "<b>Shifted to Pure Raw SQL (Non-ORM) Architecture:</b> Replaced Spring Data JPA/Hibernate ORM with a Node.js/Express.js backend utilizing direct <code>mysql2</code> driver parameterized queries and explicit SQL transaction management, fully adhering to the strict requirement of zero ORM usage."
    ]
    for chg in changes:
        story.append(Paragraph(f"&bull; {chg}", bullet_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully built: {filename}")

if __name__ == "__main__":
    build_pdf("AutoCare ORM.pdf")
