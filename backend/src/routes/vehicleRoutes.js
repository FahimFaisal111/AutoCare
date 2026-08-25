/**
 * AutoCare AI - Vehicle Routes (/api/vehicles)
 */

const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/', (req, res, next) => vehicleController.registerVehicle(req, res, next));
router.get('/', (req, res, next) => vehicleController.getVehicles(req, res, next));
router.get('/:id', (req, res, next) => vehicleController.getVehicleById(req, res, next));

module.exports = router;
