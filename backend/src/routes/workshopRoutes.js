/**
 * AutoCare AI - Workshop Routes (/api/workshops)
 */

const express = require('express');
const router = express.Router();
const workshopController = require('../controllers/workshopController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/stats', requireRole('ADMIN'), (req, res, next) => workshopController.getStats(req, res, next));
router.get('/mechanics', (req, res, next) => workshopController.getMechanics(req, res, next));

module.exports = router;
