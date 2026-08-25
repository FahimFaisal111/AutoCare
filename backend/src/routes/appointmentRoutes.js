/**
 * AutoCare AI - Appointment Routes (/api/appointments)
 */

const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/', (req, res, next) => appointmentController.createAppointment(req, res, next));
router.get('/', (req, res, next) => appointmentController.getAppointments(req, res, next));
router.get('/:id', (req, res, next) => appointmentController.getAppointmentById(req, res, next));
router.patch('/:id/status', requireRole('MECHANIC', 'ADMIN'), (req, res, next) => appointmentController.updateAppointmentStatus(req, res, next));

module.exports = router;
