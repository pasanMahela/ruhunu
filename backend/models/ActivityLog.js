const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  logId: {
    type: String,
    unique: true,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  activity: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  relatedEntity: {
    entityType: {
      type: String, // 'sale', 'item', 'user', 'customer', etc.
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  metadata: {
    type: Object // For storing additional data specific to the activity
  }
}, {
  timestamps: true
});

// Pre-save middleware to generate log ID
activityLogSchema.pre('save', async function(next) {
  if (this.isNew && !this.logId) {
    try {
      // Find the latest log to get the next ID
      const latestLog = await this.constructor
        .findOne({ logId: { $exists: true } }, { logId: 1 }, { sort: { 'logId': -1 } });
      
      let nextNumber = 1;
      if (latestLog && latestLog.logId) {
        const match = latestLog.logId.match(/LOG-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
      
      this.logId = `LOG-${nextNumber.toString().padStart(6, '0')}`;
    } catch (error) {
      console.error('Error generating log ID:', error);
      this.logId = `LOG-${Date.now()}`;
    }
  }
  next();
});

// Static method to create activity log
activityLogSchema.statics.createLog = async function(logData) {
  try {
    const log = new this(logData);
    await log.save();
    return log;
  } catch (error) {
    console.error('Error creating activity log:', error);
    throw error;
  }
};

// Index for performance
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ activity: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema); 