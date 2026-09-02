# AutoCare AI - Project Progress & Handoff Log

**Last Updated:** August 26, 2026  
**Repository Branch:** `main` (Synchronized with `origin/main` & `ImtiazIftii/AutoCare`)  
**Latest Commit:** `523226d`  

---

## 1. Project Architecture & Rules

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS + Lucide Icons (`frontend/`, runs on port `3000`)
- **Backend:** Node.js + Express.js (`backend/`, runs on port `8080`)
- **Database:** MySQL 8/9 using native `mysql2/promise` connection pool
- **CRITICAL CONSTRAINT - Zero ORM:** 100% pure raw parameterized SQL with `?` placeholders across all repositories in `backend/src/repositories/`. No Prisma, Sequelize, TypeORM, Mongoose, or Knex.
- **Git Push Policy:** Never run `git push` without explicit user permission.

---

## 2. Status of Required Features

### Feature 1: Workshop Dashboard (Tenant Management)
- **Status:** `COMPLETED`
- **Backend:** 
  - [`backend/src/services/workshopService.js`](backend/src/services/workshopService.js)
  - [`backend/src/repositories/workshopRepo.js`](backend/src/repositories/workshopRepo.js)
  - [`backend/src/repositories/userRepo.js`](backend/src/repositories/userRepo.js)
- **Capabilities:**
  - Multi-tenant isolation partitioned by `workshop_id` from the JWT token.
  - Workshop profile management and tenant access code (`APEX-2026`) for linking customers and mechanics.
  - Aggregated shop telemetry: Active customers, vehicle fleet volume, mechanic staff roster, active queues, finished repairs, and revenue.
- **Frontend:** [`frontend/src/components/dashboard/AdminDashboard.tsx`](frontend/src/components/dashboard/AdminDashboard.tsx)

---

### Feature 5: Appointment Scheduling (Conflict-Free)
- **Status:** `COMPLETED`
- **Backend:**
  - [`backend/src/services/appointmentService.js`](backend/src/services/appointmentService.js)
  - [`backend/src/repositories/appointmentRepo.js`](backend/src/repositories/appointmentRepo.js)
- **Capabilities:**
  - ACID transaction with MySQL pessimistic row locking (`SELECT ... FOR UPDATE`).
  - Mathematical interval range check:
    ```sql
    WHERE mechanic_id = ?
      AND status != 'CANCELLED'
      AND scheduled_start < ?
      AND DATE_ADD(scheduled_start, INTERVAL duration_minutes MINUTE) > ?
    FOR UPDATE;
    ```
  - Prevents overlapping bookings for the same technician, throwing `409 ConflictError` on collision while permitting exact back-to-back appointments.
- **Frontend:** Booking modal in [`CustomerDashboard.tsx`](frontend/src/components/dashboard/CustomerDashboard.tsx) and ledger in [`AdminDashboard.tsx`](frontend/src/components/dashboard/AdminDashboard.tsx).

---

### Feature 8: Simple Invoicing & Payment Tracking
- **Status:** `COMPLETED`
- **Backend:**
  - [`backend/src/repositories/invoiceRepo.js`](backend/src/repositories/invoiceRepo.js)
  - [`backend/src/services/appointmentService.js`](backend/src/services/appointmentService.js)
- **Capabilities:**
  - Automatic idempotent invoice provisioning via raw SQL `upsertInvoice` when an appointment is updated to `COMPLETED`:
    ```sql
    INSERT INTO invoice (appointment_id, total_amount, status)
    VALUES (?, ?, 'PENDING')
    ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount), status = VALUES(status);
    ```
  - Calculates `totalAmount = partsCost + laborCost`.
  - Settlement tracking (`PENDING` / `PAID`).
  - Aggregated revenue calculated dynamically: `SELECT COALESCE(SUM(total_amount), 0) FROM invoice ...`.
- **Frontend:** 
  - Invoiced amount and `PAID` / `PENDING` status badges in the work order table.
  - Interactive [`InvoiceModal.tsx`](frontend/src/components/InvoiceModal.tsx) with itemized breakdown and printable PDF receipt format.

---

## 3. Quick Start & Credentials

### Instant Admin Login (No need to register every time)
- **URL:** `http://localhost:3000/login`
- **Username:** `admin` (or `admin@autocare.com`)
- **Password:** `admin123`
- Session is persisted in browser `localStorage` (`autocare_token` & `autocare_user`).

### Running Locally
1. **Frontend:**
   ```bash
   cd frontend
   npm run dev
   # Runs on http://localhost:3000
   ```
2. **Backend:**
   ```bash
   cd backend
   npm start
   # Runs on http://localhost:8080
   ```

---

## 4. Key Files Map

```
/
├── backend/
│   ├── src/
│   │   ├── config/db.js               # mysql2/promise connection pool & transaction manager
│   │   ├── controllers/               # Express request handlers
│   │   ├── middleware/                # JWT auth, tenant guard, error handler
│   │   ├── repositories/              # 100% Pure Raw SQL Queries (Zero ORM)
│   │   │   ├── appointmentRepo.js     # Concurrency lock & overlap check
│   │   │   ├── invoiceRepo.js         # Invoicing & revenue aggregation
│   │   │   ├── userRepo.js            # EER Supertype/Subtype user management
│   │   │   └── workshopRepo.js        # Tenant management & access codes
│   │   ├── routes/                    # Express REST endpoints (/api/auth, /api/appointments, etc.)
│   │   └── services/                  # Business logic (auth, scheduling, invoicing, telemetry)
│   └── server.js                      # Express app bootstrapper
│
├── frontend/
│   ├── src/
│   │   ├── app/                       # Next.js App Router pages
│   │   │   ├── layout.tsx             # Root layout with dark theme & navbar
│   │   │   ├── page.tsx               # Dynamic role router (Customer / Mechanic / Admin)
│   │   │   ├── login/page.tsx         # Login form (accepts username/email with noValidate)
│   │   │   └── register/              # Workshop, Customer, Mechanic registration
│   │   ├── components/
│   │   │   ├── InvoiceModal.tsx       # Printable tax invoice receipt modal
│   │   │   ├── Navbar.tsx             # Responsive brand navbar
│   │   │   └── dashboard/
│   │   │       ├── AdminDashboard.tsx # Feature 1 & 8 UI
│   │   │       └── CustomerDashboard.tsx # Feature 5 UI
│   │   ├── context/AuthContext.tsx    # Auth state & localStorage session persistence
│   │   └── lib/api.ts                 # REST API client with offline resilience
│   └── tailwind.config.ts             # Tailwind CSS dark theme tokens
│
└── LOG.md                             # This session handoff & state log
```

---

## 5. Next Steps / Future Roadmap

When resuming work, here are natural next steps if desired:
1. **Live MySQL Integration Testing:** Verify backend routes against a live MySQL schema migration script (`autocare_db`).
2. **Mechanic Dashboard Polish:** Complete technician-specific work order status transitions (`SCHEDULED` -> `IN_PROGRESS` -> `COMPLETED`) with parts/labor input modal.
3. **Customer Payment Simulation:** Add a "Pay Invoice" button on the customer portal to transition invoice status from `PENDING` to `PAID`.
