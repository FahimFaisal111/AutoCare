/**
 * AutoCare AI - Appointment Controller
 */

const appointmentService = require('../services/appointmentService');

class AppointmentController {
  async createAppointment(req, res, next) {
    try {
      const result = await appointmentService.createAppointment(req.body, req.user);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getAppointments(req, res, next) {
    try {
      const result = await appointmentService.getAppointments(req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getAppointmentById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await appointmentService.getAppointmentById(id, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateAppointmentStatus(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await appointmentService.updateAppointmentStatus(id, req.body, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateInvoiceStatus(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const { status } = req.body;
      const result = await appointmentService.updateInvoiceStatus(id, status, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getTechnicianAvailability(req, res, next) {
    try {
      const { date, durationMinutes, targetDateTime } = req.query;
      const result = await appointmentService.getTechnicianAvailabilityAndSlots(
        {
          workshopId: req.user.workshopId,
          targetDate: date,
          durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : undefined,
          targetDateTime
        },
        req.user
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AppointmentController();
