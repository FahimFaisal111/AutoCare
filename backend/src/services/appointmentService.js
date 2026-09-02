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
const reminderService = require('./reminderService');
const serviceEvents = require('../events/serviceEvents');
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError
} = require('../middleware/errorHandler');

// Wire in-process event listener for ServiceCompletedEvent
serviceEvents.onServiceCompleted(async (event) => {
  const { appointmentId, vehicleId, reportId, partsCost, laborCost, conn } = event;
  const finalParts = partsCost !== undefined ? parseFloat(partsCost) : 0;
  const finalLabor = laborCost !== undefined ? parseFloat(laborCost) : 0;
  const totalAmount = parseFloat((finalParts + finalLabor).toFixed(2));

  // 1. Generate/update invoice
  await invoiceRepo.upsertInvoice(conn, {
    appointmentId,
    totalAmount,
    status: 'PENDING'
  });

  // 2. Resolve linked problem report if present
  if (reportId) {
    await problemReportRepo.updateStatus(conn, reportId, 'RESOLVED');
  }

  // 3. Evaluate preventive maintenance rules and insert milestone/interval alerts
  await reminderService.evaluatePreventiveRulesForVehicle(vehicleId, conn);
});

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
    serviceDescription,
    odometer,
    currentOdometer
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

      // 2. If odometer is provided, update vehicle's current absolute odometer
      const rawOdo = odometer !== undefined ? odometer : currentOdometer;
      const finalOdo = rawOdo !== undefined && rawOdo !== null && !isNaN(parseInt(rawOdo, 10))
        ? parseInt(rawOdo, 10)
        : null;

      if (finalOdo !== null) {
        await vehicleRepo.updateOdometer(conn, current.vehicleId, finalOdo);
      }

      // 3. If COMPLETED, trigger ServiceCompletedEvent (Invoices, problem resolution, preventive maintenance rules)
      if (normalizedStatus === 'COMPLETED') {
        const finalParts = partsCost !== undefined ? parseFloat(partsCost) : current.partsCost;
        const finalLabor = laborCost !== undefined ? parseFloat(laborCost) : current.laborCost;

        await serviceEvents.emitServiceCompleted({
          appointmentId,
          vehicleId: current.vehicleId,
          workshopId: current.workshopId,
          reportId: current.reportId,
          partsCost: finalParts,
          laborCost: finalLabor,
          serviceDescription,
          odometer: finalOdo,
          conn
        });
      }

      // 4. Return updated appointment
      const updated = await appointmentRepo.findById(conn, appointmentId);
      return this.formatAppointmentResponse(updated);
    });
  }

  /**
   * Calculate real-time technician availability and conflict-free smart slot suggestions.
   * Pure advisory lookup - concurrency is enforced on booking via transactional range locking.
   */
  async getTechnicianAvailabilityAndSlots({ workshopId, targetDate, durationMinutes, targetDateTime }, userPrincipal) {
    const effectiveWorkshopId = workshopId || (userPrincipal ? userPrincipal.workshopId : null);
    if (!effectiveWorkshopId) {
      throw new BadRequestError('Workshop tenant identifier is required.');
    }

    const parsedDuration = durationMinutes ? parseInt(durationMinutes, 10) : 60;
    const SUPPORTED_DURATIONS = [30, 60, 90, 120];
    if (!SUPPORTED_DURATIONS.includes(parsedDuration)) {
      throw new BadRequestError('Invalid duration. Supported durations are 30, 60, 90, and 120 minutes.');
    }

    // Determine target date (YYYY-MM-DD)
    let effDate = targetDate;
    if (!effDate && targetDateTime) {
      effDate = targetDateTime.slice(0, 10);
    }
    if (!effDate) {
      const today = new Date();
      effDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(effDate)) {
      throw new BadRequestError('Invalid target date. Expected format: YYYY-MM-DD.');
    }

    const [yearStr, monthStr, dayStr] = effDate.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    if (isNaN(dateObj.getTime())) {
      throw new BadRequestError('Invalid target date provided.');
    }

    const dayOfWeek = dateObj.getUTCDay(); // 0 = Sunday

    // Fetch all mechanics in workshop
    const mechanics = await userRepo.findAllByWorkshopIdAndRole(null, effectiveWorkshopId, 'MECHANIC');

    // Sunday Check: Workshop is closed
    if (dayOfWeek === 0) {
      return {
        date: effDate,
        durationMinutes: parsedDuration,
        isClosed: true,
        message: 'Workshop is closed on Sundays.',
        workingHours: { open: '09:00', close: '21:00' },
        technicians: mechanics.map((m) => ({
          mechanicId: m.userId,
          name: `${m.firstName} ${m.lastName}`,
          role: m.role,
          employeeCode: m.employeeCode || undefined,
          status: 'Unavailable (Closed)',
          isAvailable: false,
          busyUntil: null,
          nextAvailableSlot: null,
          availableSlotsCount: 0,
          totalAppointmentsToday: 0
        })),
        recommendedSlots: []
      };
    }

    // Working hours 09:00 to 21:00
    const WORK_START_MIN = 9 * 60; // 540
    const WORK_END_MIN = 21 * 60;  // 1260
    const SLOT_STEP_MIN = 30;

    // Build candidate slot grid
    const candidateSlots = [];
    for (let startMin = WORK_START_MIN; startMin <= WORK_END_MIN - parsedDuration; startMin += SLOT_STEP_MIN) {
      const endMin = startMin + parsedDuration;
      const startHour = Math.floor(startMin / 60);
      const startMinute = startMin % 60;
      const endHour = Math.floor(endMin / 60);
      const endMinute = endMin % 60;

      const startIso = `${effDate}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`;
      const endIso = `${effDate}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00`;
      const slotMysqlStart = this.formatDateTime(startIso);
      const slotMysqlEnd = this.calculateEndTime(startIso, parsedDuration);
      const slotStartMs = new Date(slotMysqlStart).getTime();
      const slotEndMs = new Date(slotMysqlEnd).getTime();

      candidateSlots.push({
        startMin,
        endMin,
        startHour,
        startMinute,
        endHour,
        endMinute,
        startIso,
        endIso,
        slotStartMs,
        slotEndMs,
        displayTime: this.formatHourMinute12h(startHour, startMinute)
      });
    }

    // Fetch all overlapping appointments on targetDate
    const startWindow = this.formatDateTime(`${effDate}T00:00:00`);
    const endWindow = this.calculateEndTime(`${effDate}T23:59:59`, 0);
    const appointments = await appointmentRepo.findAppointmentsByWorkshopAndDateRange(null, {
      workshopId: effectiveWorkshopId,
      startWindow,
      endWindow
    });

    const nowMysql = this.formatDateTime(new Date());
    const nowMs = new Date(nowMysql).getTime();
    const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    const isToday = effDate === todayStr;

    const technicians = [];
    const allRecommendedSlots = [];

    for (const m of mechanics) {
      const mechAppts = appointments.filter((a) => a.mechanicId === m.userId);

      // Map existing appointments to timestamps
      const parsedAppts = mechAppts.map((a) => {
        const aStart = new Date(a.scheduledStart).getTime();
        const aEnd = aStart + a.durationMinutes * 60 * 1000;
        return {
          appointmentId: a.appointmentId,
          startMs: aStart,
          endMs: aEnd,
          durationMinutes: a.durationMinutes,
          rawStart: a.scheduledStart
        };
      });

      // Filter available candidate slots
      const availableSlots = [];
      for (const slot of candidateSlots) {
        // Overlap condition: slotStart < apptEnd AND slotEnd > apptStart
        const hasOverlap = parsedAppts.some((a) => slot.slotStartMs < a.endMs && slot.slotEndMs > a.startMs);

        if (!hasOverlap) {
          availableSlots.push(slot);
        }
      }

      // Compute mechanic status
      let status = 'Available';
      let isAvailable = true;
      let busyUntil = null;
      let nextAvailableSlot = null;

      if (isToday) {
        const activeAppt = parsedAppts.find((a) => a.startMs <= nowMs && a.endMs > nowMs);
        if (activeAppt) {
          const aEndDate = new Date(activeAppt.endMs);
          const busyFormatted = this.formatHourMinute12h(aEndDate.getUTCHours(), aEndDate.getUTCMinutes());
          status = `Busy until ${busyFormatted}`;
          isAvailable = false;
          busyUntil = busyFormatted;
        } else {
          const futureSlots = availableSlots.filter((s) => s.slotStartMs >= nowMs);
          if (futureSlots.length > 0) {
            status = 'Available now';
            isAvailable = true;
          } else if (availableSlots.length === 0) {
            status = 'Fully booked';
            isAvailable = false;
          } else {
            status = 'Available';
            isAvailable = true;
          }
        }

        const futureSlots = availableSlots.filter((s) => s.slotStartMs >= nowMs);
        if (futureSlots.length > 0) {
          nextAvailableSlot = futureSlots[0].startIso;
        } else if (availableSlots.length > 0) {
          nextAvailableSlot = availableSlots[0].startIso;
        }
      } else {
        if (availableSlots.length === 0) {
          status = 'Fully booked';
          isAvailable = false;
        } else {
          status = 'Available';
          isAvailable = true;
          nextAvailableSlot = availableSlots[0].startIso;
        }
      }

      technicians.push({
        mechanicId: m.userId,
        name: `${m.firstName} ${m.lastName}`,
        role: m.role,
        employeeCode: m.employeeCode || undefined,
        status,
        isAvailable,
        busyUntil,
        nextAvailableSlot,
        availableSlotsCount: availableSlots.length,
        totalAppointmentsToday: mechAppts.length
      });

      // Add to recommended slots pool
      for (const s of availableSlots) {
        if (!isToday || s.slotStartMs >= nowMs) {
          allRecommendedSlots.push({
            mechanicId: m.userId,
            mechanicName: `${m.firstName} ${m.lastName}`,
            scheduledStart: s.startIso,
            displayTime: s.displayTime,
            displayDate: isToday ? 'Today' : effDate,
            durationMinutes: parsedDuration,
            slotStartMs: s.slotStartMs
          });
        }
      }
    }

    // Sort recommended slots chronologically
    allRecommendedSlots.sort((a, b) => a.slotStartMs - b.slotStartMs);

    // Pick top recommended slots (up to 12)
    const recommendedSlots = allRecommendedSlots.slice(0, 12).map((s) => ({
      mechanicId: s.mechanicId,
      mechanicName: s.mechanicName,
      scheduledStart: s.scheduledStart,
      displayTime: s.displayTime,
      displayDate: s.displayDate,
      durationMinutes: s.durationMinutes
    }));

    return {
      date: effDate,
      durationMinutes: parsedDuration,
      isClosed: false,
      workingHours: { open: '09:00', close: '21:00' },
      technicians,
      recommendedSlots
    };
  }

  /**
   * Helper: Format hour and minute to 12-hour AM/PM representation
   */
  formatHourMinute12h(hour, minute) {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const displayMin = minute < 10 ? '0' + minute : minute;
    return `${displayHour}:${displayMin} ${ampm}`;
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
