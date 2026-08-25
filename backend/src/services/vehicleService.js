/**
 * AutoCare AI - Vehicle Service
 * Handles vehicle registration, ownership isolation, and predictive maintenance provisioning
 */

const { withTransaction } = require('../config/db');
const vehicleRepo = require('../repositories/vehicleRepo');
const reminderRepo = require('../repositories/reminderRepo');
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError
} = require('../middleware/errorHandler');

class VehicleService {
  /**
   * Helper: Add months to current date formatted as YYYY-MM-DD
   */
  getFutureDate(months) {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  }

  /**
   * Register a new vehicle for the authenticated customer.
   */
  async registerVehicle({ vin, make, model, year, odometer }, userPrincipal) {
    if (!vin || !make || !model || !year || odometer === undefined) {
      throw new BadRequestError('All vehicle specifications (VIN, Make, Model, Year, Odometer) are required.');
    }

    const normalizedVin = vin.trim().toUpperCase();
    if (await vehicleRepo.existsByVin(null, normalizedVin)) {
      throw new ConflictError(`A vehicle with VIN ${normalizedVin} is already registered.`);
    }

    return withTransaction(async (conn) => {
      // 1. Create vehicle row
      const vehicleId = await vehicleRepo.create(conn, {
        ownerId: userPrincipal.userId,
        vin: normalizedVin,
        make: make.trim(),
        model: model.trim(),
        year: parseInt(year, 10),
        odometer: parseInt(odometer, 10)
      });

      // 2. Provision initial quarterly maintenance reminder
      const dueDate = this.getFutureDate(3);
      await reminderRepo.create(conn, {
        vehicleId,
        reminderType: 'Routine Inspection & Diagnostics',
        dueDate,
        message: 'Quarterly multi-point vehicle inspection and fluid level check.',
        status: 'ACTIVE'
      });

      // 3. Fetch newly created vehicle with joined attributes
      const vehicle = await vehicleRepo.findById(conn, vehicleId);
      return {
        vehicleId: vehicle.vehicleId,
        ownerId: vehicle.ownerId,
        ownerName: vehicle.ownerName,
        vin: vehicle.vin,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        odometer: vehicle.odometer,
        createdAt: vehicle.createdAt
      };
    });
  }

  /**
   * Fetch vehicles accessible by the authenticated user.
   */
  async getVehicles(userPrincipal) {
    if (userPrincipal.role === 'CUSTOMER') {
      return vehicleRepo.findAllByOwnerId(null, userPrincipal.userId);
    } else {
      return vehicleRepo.findAllByWorkshopId(null, userPrincipal.workshopId);
    }
  }

  /**
   * Fetch single vehicle by ID with tenant & ownership boundary checks.
   */
  async getVehicleById(vehicleId, userPrincipal) {
    const vehicle = await vehicleRepo.findById(null, vehicleId);
    if (!vehicle) {
      throw new NotFoundError(`Vehicle not found with ID: ${vehicleId}`);
    }

    if (vehicle.workshopId !== userPrincipal.workshopId) {
      throw new ForbiddenError('Unauthorized access to vehicle outside your workshop tenant.');
    }

    if (userPrincipal.role === 'CUSTOMER' && vehicle.ownerId !== userPrincipal.userId) {
      throw new ForbiddenError('Unauthorized access to vehicle owned by another user.');
    }

    return {
      vehicleId: vehicle.vehicleId,
      ownerId: vehicle.ownerId,
      ownerName: vehicle.ownerName,
      vin: vehicle.vin,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      odometer: vehicle.odometer,
      createdAt: vehicle.createdAt
    };
  }
}

module.exports = new VehicleService();
