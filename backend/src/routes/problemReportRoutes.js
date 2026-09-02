/**
 * AutoCare AI - Problem Report Routes (/api/problem-reports)
 */

const express = require('express');
const router = express.Router();
const problemReportController = require('../controllers/problemReportController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/', (req, res, next) => problemReportController.createProblemReport(req, res, next));
router.get('/', (req, res, next) => problemReportController.getProblemReports(req, res, next));
router.get('/:id', (req, res, next) => problemReportController.getProblemReportById(req, res, next));
router.patch('/:id/review', requireRole('MECHANIC', 'ADMIN'), (req, res, next) => problemReportController.reviewReport(req, res, next));
/*Comment : The mechanic's "automatic reply" action - replaces the earlier chat-on-an-unbooked-diagnosis attempt. Creates a real REMINDER for the customer instead of requiring an appointment to already exist. */
router.post('/:id/request-appointment', requireRole('MECHANIC', 'ADMIN'), (req, res, next) => problemReportController.requestAppointment(req, res, next));

module.exports = router;
