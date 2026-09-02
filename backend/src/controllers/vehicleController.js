/**
 * AutoCare AI - Vehicle Controller
 */

const vehicleService = require('../services/vehicleService');
const reminderService = require('../services/reminderService');

class VehicleController {
  async registerVehicle(req, res, next) {
    try {
      const result = await vehicleService.registerVehicle(req.body, req.user);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getVehicles(req, res, next) {
    try {
      const result = await vehicleService.getVehicles(req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getVehicleById(req, res, next) {
    try {
      const vehicleId = parseInt(req.params.id, 10);
      const result = await vehicleService.getVehicleById(vehicleId, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getVehicleReminders(req, res, next) {
    try {
      const vehicleId = parseInt(req.params.id, 10);
      const result = await reminderService.getRemindersForVehicle(vehicleId, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async createVehicleReminder(req, res, next) {
    try {
      const vehicleId = parseInt(req.params.id, 10);
      const { reminderType, dueDate, message } = req.body;
      const result = await reminderService.createManualReminder(
        { vehicleId, reminderType, dueDate, message },
        req.user
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new VehicleController();
