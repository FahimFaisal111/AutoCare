/**
 * AutoCare AI - Workshop Administration & Telemetry Service
 * Aggregates multi-tenant statistics and staff rosters using raw SQL
 */

const workshopRepo = require('../repositories/workshopRepo');
const userRepo = require('../repositories/userRepo');
const vehicleRepo = require('../repositories/vehicleRepo');
const appointmentRepo = require('../repositories/appointmentRepo');
const invoiceRepo = require('../repositories/invoiceRepo');
const {
  NotFoundError,
  ForbiddenError
} = require('../middleware/errorHandler');

class WorkshopService {
  /**
   * Aggregate workshop performance metrics (Admin only).
   */
  async getWorkshopStats(userPrincipal) {
    if (userPrincipal.role !== 'ADMIN') {
      throw new ForbiddenError('Only workshop administrators can access full tenant telemetry.');
    }

    const workshop = await workshopRepo.findById(null, userPrincipal.workshopId);
    if (!workshop) {
      throw new NotFoundError('Workshop not found');
    }

    const workshopId = userPrincipal.workshopId;

    const [
      customerCount,
      vehicleCount,
      mechanicCount,
      scheduledCount,
      inProgressCount,
      completedCount,
      totalRevenue
    ] = await Promise.all([
      userRepo.countByWorkshopIdAndRole(null, workshopId, 'CUSTOMER'),
      vehicleRepo.countByWorkshopId(null, workshopId),
      userRepo.countByWorkshopIdAndRole(null, workshopId, 'MECHANIC'),
      appointmentRepo.countByWorkshopIdAndStatus(null, workshopId, 'SCHEDULED'),
      appointmentRepo.countByWorkshopIdAndStatus(null, workshopId, 'IN_PROGRESS'),
      appointmentRepo.countByWorkshopIdAndStatus(null, workshopId, 'COMPLETED'),
      invoiceRepo.sumTotalRevenueByWorkshopId(null, workshopId)
    ]);

    return {
      workshopId: workshop.workshopId,
      workshopName: workshop.name,
      workshopAddress: workshop.address || '',
      accessCode: workshop.accessCode,
      customerCount,
      vehicleCount,
      mechanicCount,
      scheduledAppointmentsCount: scheduledCount + inProgressCount,
      completedAppointmentsCount: completedCount,
      totalRevenue
    };
  }

  /**
   * Fetch list of certified mechanics belonging to the workshop.
   */
  async getWorkshopMechanics(userPrincipal) {
    const mechanics = await userRepo.findAllByWorkshopIdAndRole(null, userPrincipal.workshopId, 'MECHANIC');
    return mechanics.map(u => ({
      userId: u.userId,
      workshopId: u.workshopId,
      workshopName: u.workshopName,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      employeeCode: u.employeeCode || undefined
    }));
  }
}

module.exports = new WorkshopService();
