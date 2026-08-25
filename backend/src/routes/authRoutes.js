/**
 * AutoCare AI - Auth Routes (/api/auth)
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/register/customer', (req, res, next) => authController.registerCustomer(req, res, next));
router.post('/register/mechanic', (req, res, next) => authController.registerMechanic(req, res, next));
router.post('/register/workshop', (req, res, next) => authController.registerWorkshop(req, res, next));
router.get('/workshops', (req, res, next) => authController.getWorkshops(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/forgot-password', (req, res, next) => authController.forgotPassword(req, res, next));
router.post('/reset-password', (req, res, next) => authController.resetPassword(req, res, next));
router.get('/me', authenticateToken, (req, res, next) => authController.getCurrentUser(req, res, next));

module.exports = router;
