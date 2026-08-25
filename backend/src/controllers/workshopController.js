/**
 * AutoCare AI - Workshop Administration Controller
 */

const workshopService = require('../services/workshopService');

class WorkshopController {
  async getStats(req, res, next) {
    try {
      const result = await workshopService.getWorkshopStats(req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getMechanics(req, res, next) {
    try {
      const result = await workshopService.getWorkshopMechanics(req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new WorkshopController();
