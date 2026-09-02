/**
 * AutoCare AI - Reminder Routes (/api/reminders)
 */

const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

// Customer & Mechanic: Get all accessible reminders
router.get('/', (req, res, next) => reminderController.getReminders(req, res, next));

// Mechanic / Admin: Manually create maintenance reminder
router.post('/', requireRole('MECHANIC', 'ADMIN'), (req, res, next) => reminderController.createReminder(req, res, next));

// Customer & Mechanic: Update reminder status (e.g. COMPLETED or DISMISSED)
router.patch('/:id/status', (req, res, next) => reminderController.updateReminderStatus(req, res, next));

module.exports = router;
