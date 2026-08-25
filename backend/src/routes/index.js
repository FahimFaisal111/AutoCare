/**
 * AutoCare AI - Master Route Registry
 */

const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const vehicleRoutes = require('./vehicleRoutes');
const problemReportRoutes = require('./problemReportRoutes');
const appointmentRoutes = require('./appointmentRoutes');
const reminderRoutes = require('./reminderRoutes');
const workshopRoutes = require('./workshopRoutes');

router.use('/auth', authRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/problem-reports', problemReportRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/reminders', reminderRoutes);
router.use('/workshops', workshopRoutes);

module.exports = router;
