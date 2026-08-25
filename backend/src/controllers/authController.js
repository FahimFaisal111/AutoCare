/**
 * AutoCare AI - Auth Controller
 */

const authService = require('../services/authService');

class AuthController {
  async registerCustomer(req, res, next) {
    try {
      const result = await authService.registerCustomer(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async registerMechanic(req, res, next) {
    try {
      const result = await authService.registerMechanic(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async registerWorkshop(req, res, next) {
    try {
      const result = await authService.registerWorkshop(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getWorkshops(req, res, next) {
    try {
      const result = await authService.getPublicWorkshops();
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const result = await authService.forgotPassword(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const result = await authService.resetPassword(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getCurrentUser(req, res, next) {
    try {
      const result = await authService.getCurrentUserProfile(req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
