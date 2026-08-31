/**
 * AutoCare AI - Appointment Service
 * Concurrency-safe scheduling with pessimistic range locks and automatic invoice generation
 */

const { withTransaction } = require('../config/db');
const appointmentRepo = require('../repositories/appointmentRepo');
const vehicleRepo = require('../repositories/vehicleRepo');
const userRepo = require('../repositories/userRepo');
const invoiceRepo = require('../repositories/invoiceRepo');
const problemReportRepo = require('../repositories/problemReportRepo');
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError
} = require('../middleware/errorHandler');

class AppointmentService {
  /**
   * Helper: Calculate end time based on start time string (ISO / DATETIME) and duration in minutes
   */
  calculateEndTime(scheduledStart, durationMinutes) {
    const start = new Date(scheduledStart);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    // Format to YYYY-MM-DD HH:mm:ss for MySQL comparison
    return end.toISOString().slice(0, 19).replace('T', ' ');
  }

  /**
   * Helper: Format Date / ISO to MySQL DATETIME string
   */
  formatDateTime(dateTimeStr) {
    const d = new Date(dateTimeStr);
    return d.toISOString().slice(0, 19).replace('T', ' ');
  }

  /**
   * Book a new conflict-free appointment with pessimistic locking.
   */
  async createAppointment({
    vehicleId,
    mechanicId,
    reportId = null,
    scheduledStart,
    durationMinutes,
    serviceDescription = null
  }, userPrincipal) {
    if (!vehicleId || !mechanicId || !scheduledStart || !durationMinutes) {
      throw new BadRequestError('Vehicle, assigned mechanic, scheduled start time, and duration are required.');
    }

    const vehicle = await vehicleRepo.findById(null, vehicleId);
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    if (vehicle.workshopId !== userPrincipal.workshopId) {
      throw new ForbiddenError('Vehicle belongs to another workshop tenant.');
    }

    if (userPrincipal.role === 'CUSTOMER' && vehicle.ownerId !== userPrincipal.userId) {
      throw new ForbiddenError('You can only book appointments for your own vehicles.');
    }

    const mechanic = await userRepo.findById(null, mechanicId);
    if (!mechanic) {
      throw new NotFoundError('Mechanic not found');
    }

    if (mechanic.workshopId !== userPrincipal.workshopId) {
      throw new ForbiddenError('Mechanic belongs to another workshop.');
    }

    if (mechanic.role !== 'MECHANIC') {
      throw new ConflictError('Selected staff member is not a certified mechanic.');
    }

    /*Comment : Validates the optional AI-diagnosis code the customer typed into the booking form. This field used to be dead code (nothing in the UI ever set it), so it was never actually exercised by real user input before - now that a customer types a raw report id by hand, it has to be checked properly: does a report with that id even exist, is it in this workshop, and (for a customer booking their own appointment) does it actually belong to THEM. Without this, a typo or someone else's number would silently link the appointment to the wrong diagnosis. */
    let verifiedReportId = null;
    if (reportId) {
      const report = await problemReportRepo.findById(null, reportId);
      if (!report) {
        throw new NotFoundError('That AI Diagnosis code was not found. Double-check the code and try again.');
      }
      if (report.workshopId !== userPrincipal.workshopId) {
        throw new ForbiddenError('That AI Diagnosis code does not belong to your workshop.');
      }
      if (userPrincipal.role === 'CUSTOMER' && report.customerId !== userPrincipal.userId) {
        throw new ForbiddenError('That AI Diagnosis code does not belong to one of your own reports.');
      }
      verifiedReportId = parseInt(reportId, 10);
    }

    const mysqlStart = this.formatDateTime(scheduledStart);
    const mysqlEnd = this.calculateEndTime(scheduledStart, durationMinutes);

    return withTransaction(async (conn) => {
      // 1. Pessimistic Overlap Query
      const overlaps = await appointmentRepo.countOverlappingAppointments(conn, {
        mechanicId,
        startTime: mysqlStart,
        endTime: mysqlEnd
      });

      if (overlaps > 0) {
        throw new ConflictError(
          `Technician ${mechanic.firstName} ${mechanic.lastName} is already booked during this time window. Please choose another slot or mechanic.`
        );
      }

      // 2. Insert Appointment
      const appointmentId = await appointmentRepo.create(conn, {
        vehicleId,
        mechanicId,
        reportId: verifiedReportId,
        scheduledStart: mysqlStart,
        durationMinutes: parseInt(durationMinutes, 10),
        status: 'SCHEDULED',
        serviceDescription: serviceDescription ? serviceDescription.trim() : null,
        partsCost: 0,
        laborCost: 0
      });

      // 3. Return formatted appointment
      const row = await appointmentRepo.findById(conn, appointmentId);
      return this.formatAppointmentResponse(row);
    });
  }

  /**
   * Fetch appointments filtered by user role.
   */
  async getAppointments(userPrincipal) {
    let rows;
    if (userPrincipal.role === 'CUSTOMER') {
      rows = await appointmentRepo.findAllByCustomerId(null, userPrincipal.userId);
    } else if (userPrincipal.role === 'MECHANIC') {
      rows = await appointmentRepo.findAllByMechanicId(null, userPrincipal.userId);
    } else {
      rows = await appointmentRepo.findAllByWorkshopId(null, userPrincipal.workshopId);
    }

    return rows.map(r => this.formatAppointmentResponse(r));
  }

  /**
   * Fetch single appointment by ID with tenant checks.
   */
  async getAppointmentById(id, userPrincipal) {
    const row = await appointmentRepo.findById(null, id);
    if (!row) {
      throw new NotFoundError('Appointment not found');
    }

    if (row.workshopId !== userPrincipal.workshopId) {
      throw new ForbiddenError('Unauthorized access to appointment outside your tenant.');
    }

    return this.formatAppointmentResponse(row);
  }

  /**
   * Update appointment status, costs, and trigger automatic billing settlement.
   */
  async updateAppointmentStatus(appointmentId, {
    status,
    partsCost,
    laborCost,
    serviceDescription
  }, userPrincipal) {
    if (userPrincipal.role === 'CUSTOMER') {
      throw new ForbiddenError('Customers cannot modify service work order statuses.');
    }

    const current = await appointmentRepo.findById(null, appointmentId);
    if (!current) {
      throw new NotFoundError('Appointment not found');
    }

    if (current.workshopId !== userPrincipal.workshopId) {
      throw new ForbiddenError('Unauthorized access to appointment outside your tenant.');
    }

    const normalizedStatus = status.toUpperCase();

    return withTransaction(async (conn) => {
      // 1. Update appointment work log
      await appointmentRepo.updateStatusAndCosts(conn, appointmentId, {
        status: normalizedStatus,
        partsCost: partsCost !== undefined ? parseFloat(partsCost) : current.partsCost,
        laborCost: laborCost !== undefined ? parseFloat(laborCost) : current.laborCost,
        serviceDescription: serviceDescription !== undefined ? serviceDescription : current.serviceDescription
      });

      // 2. If COMPLETED, generate/update Invoice & mark Problem Report as RESOLVED
      if (normalizedStatus === 'COMPLETED') {
        const finalParts = partsCost !== undefined ? parseFloat(partsCost) : current.partsCost;
        const finalLabor = laborCost !== undefined ? parseFloat(laborCost) : current.laborCost;
        const totalAmount = parseFloat((finalParts + finalLabor).toFixed(2));

        await invoiceRepo.upsertInvoice(conn, {
          appointmentId,
          totalAmount,
          status: 'PENDING'
        });

        if (current.reportId) {
          await problemReportRepo.updateStatus(conn, current.reportId, 'RESOLVED');
        }
      }

      // 3. Return updated appointment
      const updated = await appointmentRepo.findById(conn, appointmentId);
      return this.formatAppointmentResponse(updated);
    });
  }

  /**
   * Helper: Format database join into expected Appointment DTO response
   */
  formatAppointmentResponse(row) {
    const partsCost = parseFloat(row.partsCost || 0);
    const laborCost = parseFloat(row.laborCost || 0);
    const totalAmount = parseFloat((partsCost + laborCost).toFixed(2));

    return {
      appointmentId: row.appointmentId,
      vehicleId: row.vehicleId,
      vehicleInfo: row.vehicleInfo,
      ownerId: row.ownerId,
      ownerName: row.ownerName,
      mechanicId: row.mechanicId,
      mechanicName: row.mechanicName,
      reportId: row.reportId || undefined,
      scheduledStart: row.scheduledStart,
      durationMinutes: row.durationMinutes,
      status: row.status,
      serviceDescription: row.serviceDescription || undefined,
      partsCost,
      laborCost,
      totalAmount,
      invoiceStatus: row.invoiceStatus || undefined,
      createdAt: row.createdAt
    };
  }
}

module.exports = new AppointmentService();
