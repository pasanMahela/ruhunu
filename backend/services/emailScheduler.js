const cron = require('node-cron');
const EmailSubscription = require('../models/EmailSubscription');
const { generateTodaysReport, createTransporter, generateReportEmailHTML } = require('../controllers/emailSubscriptionController');

class EmailScheduler {
  constructor() {
    this.scheduledJobs = new Map();
    this.isInitialized = false;
  }

  // Initialize the scheduler and set up all existing subscriptions
  async initialize() {
    if (this.isInitialized) {
      console.log('Email scheduler already initialized');
      return;
    }

    try {
      console.log('Initializing email scheduler...');
      
      // Get all active subscriptions
      const subscriptions = await EmailSubscription.find({ isActive: true });
      
      // Schedule each subscription
      for (const subscription of subscriptions) {
        this.scheduleEmail(subscription);
      }
      
      this.isInitialized = true;
      console.log(`Email scheduler initialized with ${subscriptions.length} active subscriptions`);
    } catch (error) {
      console.error('Failed to initialize email scheduler:', error);
    }
  }

  // Schedule a single email subscription
  scheduleEmail(subscription) {
    try {
      // Parse the schedule time (format: "HH:MM")
      const [hours, minutes] = subscription.scheduleTime.split(':').map(Number);
      
      // Create cron expression for daily at specified time
      // Format: minute hour * * * (every day at specified time)
      const cronExpression = `${minutes} ${hours} * * *`;
      
      console.log(`Scheduling email for ${subscription.email} at ${subscription.scheduleTime} (cron: ${cronExpression})`);
      
      // Cancel existing job if it exists
      if (this.scheduledJobs.has(subscription._id.toString())) {
        this.scheduledJobs.get(subscription._id.toString()).destroy();
      }
      
      // Create new scheduled job
      const job = cron.schedule(cronExpression, async () => {
        console.log(`Sending scheduled email to ${subscription.email} at ${new Date().toISOString()}`);
        await this.sendScheduledEmail(subscription);
      }, {
        scheduled: true,
        timezone: 'Asia/Colombo' // Sri Lanka timezone
      });
      
      // Store the job reference
      this.scheduledJobs.set(subscription._id.toString(), job);
      
      console.log(`Email scheduled for ${subscription.email} at ${subscription.scheduleTime}`);
    } catch (error) {
      console.error(`Failed to schedule email for ${subscription.email}:`, error);
    }
  }

  // Send a scheduled email
  async sendScheduledEmail(subscription) {
    try {
      // Check if subscription is still active
      const currentSubscription = await EmailSubscription.findById(subscription._id);
      if (!currentSubscription || !currentSubscription.isActive) {
        console.log(`Subscription ${subscription.email} is no longer active, skipping`);
        return;
      }

      // Generate today's report
      const todaysReportData = await generateTodaysReport();
      
      // Create transporter
      const transporter = createTransporter();
      
      // Generate HTML content
      const htmlContent = generateReportEmailHTML(todaysReportData);
      
      // Get today's date string
      const today = new Date();
      const todayString = today.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      
      // Send email
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: subscription.email,
        subject: `Daily Sales Report - ${todayString}`,
        html: htmlContent
      };

      await transporter.sendMail(mailOptions);
      
      console.log(`Scheduled email sent successfully to ${subscription.email}`);
      
      // Update last sent time
      await EmailSubscription.findByIdAndUpdate(subscription._id, {
        lastSent: new Date()
      });
      
    } catch (error) {
      console.error(`Failed to send scheduled email to ${subscription.email}:`, error);
    }
  }

  // Add a new scheduled email
  async addScheduledEmail(subscription) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    this.scheduleEmail(subscription);
  }

  // Update a scheduled email
  async updateScheduledEmail(subscription) {
    // Remove old schedule
    this.removeScheduledEmail(subscription._id.toString());
    
    // Add new schedule if still active
    if (subscription.isActive) {
      this.scheduleEmail(subscription);
    }
  }

  // Remove a scheduled email
  removeScheduledEmail(subscriptionId) {
    if (this.scheduledJobs.has(subscriptionId)) {
      this.scheduledJobs.get(subscriptionId).destroy();
      this.scheduledJobs.delete(subscriptionId);
      console.log(`Removed scheduled email for subscription ${subscriptionId}`);
    }
  }

  // Get status of all scheduled jobs
  getSchedulerStatus() {
    return {
      isInitialized: this.isInitialized,
      totalScheduledJobs: this.scheduledJobs.size,
      scheduledEmails: Array.from(this.scheduledJobs.keys())
    };
  }

  // Stop all scheduled jobs
  stopAllJobs() {
    for (const [subscriptionId, job] of this.scheduledJobs) {
      job.destroy();
    }
    this.scheduledJobs.clear();
    this.isInitialized = false;
    console.log('All scheduled email jobs stopped');
  }
}

// Create singleton instance
const emailScheduler = new EmailScheduler();

module.exports = emailScheduler; 