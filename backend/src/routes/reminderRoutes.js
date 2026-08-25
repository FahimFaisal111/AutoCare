/**
 * AutoCare AI - Reminder Routes (/api/reminders)
 */

const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', (req, res, next) => reminderController.getReminders(req, res, next));

module.exports = router;
