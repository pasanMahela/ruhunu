const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  items: [{
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    itemCode: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['cash', 'card', 'credit', 'cheque']
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  customerNic: {
    type: String,
    trim: true,
    uppercase: true
  },
  customerName: {
    type: String,
    default: 'Walk-in Customer'
  },
  customerPhone: {
    type: String,
    trim: true
  },
  amountPaid: {
    type: Number,
    required: true,
    min: 0
  },
  balance: {
    type: Number,
    required: true
  },
  cashier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  billNumber: {
    type: String,
    unique: true
  }
}, {
  timestamps: true
});

// Pre-save middleware to generate bill number
saleSchema.pre('save', async function(next) {
  if (this.isNew && !this.billNumber) {
    try {
      // Generate bill number with retry logic for uniqueness
      let attempts = 0;
      let billNumber;
      let isUnique = false;
      
      while (!isUnique && attempts < 5) {
        // Find the latest sale to get the next bill number
        const latestSale = await this.constructor
          .findOne({ billNumber: { $exists: true } }, { billNumber: 1 }, { sort: { 'billNumber': -1 } });
        
        let nextNumber = 1;
        if (latestSale && latestSale.billNumber) {
          const match = latestSale.billNumber.match(/INV-(\d+)/);
          if (match) {
            nextNumber = parseInt(match[1]) + 1;
          }
        }
        
        billNumber = `INV-${nextNumber.toString().padStart(5, '0')}`;
        
        // Check if this bill number already exists
        const existingSale = await this.constructor.findOne({ billNumber });
        if (!existingSale) {
          isUnique = true;
        } else {
          attempts++;
          // If collision, add random component
          billNumber = `INV-${(nextNumber + Math.floor(Math.random() * 100)).toString().padStart(5, '0')}`;
        }
      }
      
      this.billNumber = billNumber || `INV-${Date.now()}`;
      console.log('Generated bill number:', this.billNumber);
    } catch (error) {
      console.error('Error generating bill number:', error);
      // Fallback: use timestamp-based number
      this.billNumber = `INV-${Date.now()}`;
    }
  }
  next();
});

module.exports = mongoose.model('Sale', saleSchema); 
module.exports = mongoose.model('Sale', saleSchema); 