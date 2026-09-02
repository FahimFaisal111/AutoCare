/**
 * AutoCare AI - Problem Report Controller
 */

const problemReportService = require('../services/problemReportService');

class ProblemReportController {
  async createProblemReport(req, res, next) {
    try {
      const result = await problemReportService.createProblemReport(req.body, req.user);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getProblemReports(req, res, next) {
    try {
      const result = await problemReportService.getProblemReports(req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getProblemReportById(req, res, next) {
    try {
      const reportId = parseInt(req.params.id, 10);
      const result = await problemReportService.getProblemReportById(reportId, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async reviewReport(req, res, next) {
    try {
      const reportId = parseInt(req.params.id, 10);
      const result = await problemReportService.reviewReportByMechanic(reportId, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async requestAppointment(req, res, next) {
    try {
      const reportId = parseInt(req.params.id, 10);
      const result = await problemReportService.requestAppointmentReminder(reportId, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProblemReportController();
