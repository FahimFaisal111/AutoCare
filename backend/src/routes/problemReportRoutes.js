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

module.exports = router;
