/**
 * AutoCare AI - Maintenance Reminder Scheduled Job
 * Native setInterval job runner (no external libraries/tables)
 * Surfaces due reminders daily: transitions 'ACTIVE' reminders with due_date <= CURDATE() to 'DUE'
 */

const reminderRepo = require('../repositories/reminderRepo');

class ReminderJob {
  constructor() {
    this.intervalHandle = null;
    this.INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Run the check to surface past/current due reminders.
   */
  async runDueRemindersScan() {
    try {
      const affected = await reminderRepo.markPastDueAsDue();
      if (affected > 0) {
        console.log(`[ReminderJob] Surfaced ${affected} reminder(s) as DUE.`);
      }
      return affected;
    } catch (err) {
      console.error('[ReminderJob] Failed to run due reminders scan:', err.message);
      return 0;
    }
  }

  /**
   * Start the daily scheduled job runner.
   */
  start() {
    // Initial scan on server boot
    this.runDueRemindersScan();

    // Schedule daily recurring scan
    if (!this.intervalHandle) {
      this.intervalHandle = setInterval(() => {
        this.runDueRemindersScan();
      }, this.INTERVAL_MS);

      // Allow Node process to exit gracefully in tests if this timer is active
      if (this.intervalHandle.unref) {
        this.intervalHandle.unref();
      }
    }
  }

  /**
   * Stop scheduled job (useful in test teardown).
   */
  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }
}

const reminderJob = new ReminderJob();

module.exports = reminderJob;
