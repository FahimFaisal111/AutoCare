/**
 * AutoCare AI - Appointment Routes (/api/appointments)
 */

const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const conversationController = require('../controllers/conversationController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

/* Advisory technician availability and smart slot suggestions for customer booking workflow */
router.get('/availability', (req, res, next) => appointmentController.getTechnicianAvailability(req, res, next));

router.post('/', (req, res, next) => appointmentController.createAppointment(req, res, next));
router.get('/', (req, res, next) => appointmentController.getAppointments(req, res, next));
router.get('/:id', (req, res, next) => appointmentController.getAppointmentById(req, res, next));
router.patch('/:id/status', requireRole('MECHANIC', 'ADMIN'), (req, res, next) => appointmentController.updateAppointmentStatus(req, res, next));
router.patch('/:id/invoice/status', (req, res, next) => appointmentController.updateInvoiceStatus(req, res, next));

/*Comment : Registered BEFORE the /:id routes on purpose - it's a literal two-segment path (/messages/latest), not an appointment id, and putting explicit routes ahead of param routes avoids any ambiguity about match order as this file grows. */
router.get('/messages/latest', (req, res, next) => conversationController.getLatestActivity(req, res, next));

/*Comment : Hero Feature 7 (Customer-Mechanic Communication) - nested under the appointment it belongs to, matching the PDF's "Appointment Hub" framing. No requireRole() here on purpose: both CUSTOMER and MECHANIC are allowed in, but conversationService itself checks that the caller is THIS appointment's own customer or mechanic, not just any workshop member with that role. */
router.get('/:id/messages', (req, res, next) => conversationController.getMessages(req, res, next));
router.post('/:id/messages', (req, res, next) => conversationController.sendMessage(req, res, next));

module.exports = router;
