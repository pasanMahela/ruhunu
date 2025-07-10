const mongoose = require('mongoose');

const stockEditLogSchema = new mongoose.Schema({
  sequenceNumber: {
    type: Number,
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
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  itemCode: {
    type: String,
    required: true
  },
  itemName: {
    type: String,
    required: true
  },
  operation: {
    type: String,
    enum: ['stock_update', 'price_update', 'purchase_update', 'discount_update', 'general_update'],
    required: true
  },
  // Stock quantity changes
  currentStock: {
    oldValue: {
      type: Number,
      required: true
    },
    newValue: {
      type: Number,
      required: true
    }
  },
  // Purchase quantity (for stock additions)
  purchaseQuantity: {
    type: Number,
    default: 0
  },
  // Purchase price changes
  purchasePrice: {
    oldValue: {
      type: Number,
      required: true
    },
    newValue: {
      type: Number,
      required: true
    }
  },
  // Retail price changes
  retailPrice: {
    oldValue: {
      type: Number,
      required: true
    },
    newValue: {
      type: Number,
      required: true
    }
  },
  // Discount changes
  discount: {
    oldValue: {
      type: Number,
      required: true,
      default: 0
    },
    newValue: {
      type: Number,
      required: true,
      default: 0
    }
  },
  // Additional context
  reason: {
    type: String // Manual update, sale transaction, stock purchase, etc.
  },
  relatedTransaction: {
    type: mongoose.Schema.Types.ObjectId // Reference to sale, purchase, etc.
  }
}, {
  timestamps: true
});

// Pre-save middleware to generate sequence number
stockEditLogSchema.pre('save', async function(next) {
  if (this.isNew && !this.sequenceNumber) {
    try {
      // Find the latest log to get the next sequence number
      const latestLog = await this.constructor
        .findOne({}, { sequenceNumber: 1 }, { sort: { 'sequenceNumber': -1 } });
      
      let nextNumber = 1;
      if (latestLog && latestLog.sequenceNumber) {
        nextNumber = latestLog.sequenceNumber + 1;
      }
      
      this.sequenceNumber = nextNumber;
    } catch (error) {
      console.error('Error generating sequence number:', error);
      this.sequenceNumber = Date.now();
    }
  }
  next();
});

// Static method to create stock edit log
stockEditLogSchema.statics.createStockLog = async function(logData) {
  try {
    const log = new this(logData);
    await log.save();
    return log;
  } catch (error) {
    console.error('Error creating stock edit log:', error);
    throw error;
  }
};

// Index for performance
stockEditLogSchema.index({ createdAt: -1 });
stockEditLogSchema.index({ user: 1, createdAt: -1 });
stockEditLogSchema.index({ item: 1, createdAt: -1 });
stockEditLogSchema.index({ operation: 1, createdAt: -1 });

module.exports = mongoose.model('StockEditLog', stockEditLogSchema); 