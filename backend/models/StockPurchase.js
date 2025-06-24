const mongoose = require('mongoose');

const stockPurchaseSchema = new mongoose.Schema({
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
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  purchasePrice: {
    type: Number,
    required: true,
    min: 0
  },
  retailPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPurchaseValue: {
    type: Number,
    required: true,
    min: 0
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  addedByUser: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Add indexes for faster queries
stockPurchaseSchema.index({ item: 1, createdAt: -1 });
stockPurchaseSchema.index({ itemCode: 1, createdAt: -1 });
stockPurchaseSchema.index({ createdAt: -1 });

// Pre-save hook to calculate total purchase value
stockPurchaseSchema.pre('save', function(next) {
  this.totalPurchaseValue = this.quantity * this.purchasePrice;
  next();
});

module.exports = mongoose.model('StockPurchase', stockPurchaseSchema); 