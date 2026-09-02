/**
 * AutoCare AI - In-Process Event Architecture
 * Native Node.js EventEmitter for decoupled lifecycle event dispatching
 */

const EventEmitter = require('events');

class ServiceEventBus extends EventEmitter {
  constructor() {
    super();
    this.SERVICE_COMPLETED = 'service.completed';
  }

  /**
   * Dispatch ServiceCompletedEvent when an appointment is completed.
   * @param {Object} eventData
   * @param {number} eventData.appointmentId
   * @param {number} eventData.vehicleId
   * @param {number} eventData.workshopId
   * @param {number} [eventData.odometer]
   * @param {number} [eventData.reportId]
   * @param {number} [eventData.partsCost]
   * @param {number} [eventData.laborCost]
   * @param {string} [eventData.serviceDescription]
   * @param {Object} [eventData.conn] Active MySQL transaction connection
   */
  async emitServiceCompleted(eventData) {
    // Collect all listener promises so the transaction or caller can await side-effects if needed
    const listeners = this.rawListeners(this.SERVICE_COMPLETED);
    const promises = listeners.map(listener => {
      try {
        const res = listener(eventData);
        return res instanceof Promise ? res : Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    });
    return Promise.all(promises);
  }

  /**
   * Register listener for ServiceCompletedEvent.
   * @param {Function} handler
   */
  onServiceCompleted(handler) {
    this.on(this.SERVICE_COMPLETED, handler);
  }
}

const serviceEvents = new ServiceEventBus();

module.exports = serviceEvents;
