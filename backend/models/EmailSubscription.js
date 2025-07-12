const mongoose = require('mongoose');

const EmailSubscriptionSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Please provide a valid email address'
    }
  },
  reportType: {
    type: String,
    required: [true, 'Report type is required'],
    enum: ['sales-reports', 'inventory-reports', 'customer-reports'],
    default: 'sales-reports'
  },
  scheduleTime: {
    type: String,
    required: [true, 'Schedule time is required'],
    validate: {
      validator: function(time) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
      },
      message: 'Please provide a valid time in HH:MM format'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastSent: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index to ensure unique email per report type
EmailSubscriptionSchema.index({ email: 1, reportType: 1 }, { unique: true });

// Update the updatedAt field before saving
EmailSubscriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('EmailSubscription', EmailSubscriptionSchema); 