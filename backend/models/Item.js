const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  itemCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: [20, 'Item code cannot be more than 20 characters']
  },
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: [100, 'Item name cannot be more than 100 characters']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  quantityInStock: {
    type: Number,
    required: [true, 'Quantity in stock is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot be more than 100 characters']
  },
  lowerLimit: {
    type: Number,
    min: [0, 'Lower limit cannot be negative'],
    default: 0
  },
  purchasePrice: {
    type: Number,
    required: [true, 'Purchase price is required'],
    min: [0, 'Purchase price cannot be negative']
  },
  retailPrice: {
    type: Number,
    required: [true, 'Retail price is required'],
    min: [0, 'Retail price cannot be negative']
  },
  discount: {
    type: Number,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot be more than 100%'],
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add indexes for faster queries
itemSchema.index({ itemCode: 1 });
itemSchema.index({ name: 1 });
itemSchema.index({ category: 1 });

// Add method to generate next item code
itemSchema.statics.generateNextItemCode = async function() {
  try {
    const lastItem = await this.findOne({}, {}, { sort: { 'itemCode': -1 } });
    let nextNumber = 1;
    
    if (lastItem && lastItem.itemCode.startsWith('RT')) {
      const lastNumber = parseInt(lastItem.itemCode.substring(2));
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
    
    return `RT${nextNumber.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating item code:', error);
    throw error;
  }
};

// Add method to check if item is in stock
itemSchema.methods.isInStock = function() {
  return this.quantityInStock > 0;
};

// Add method to get profit margin
itemSchema.methods.getProfitMargin = function() {
  if (this.purchasePrice === 0) return 0;
  return ((this.retailPrice - this.purchasePrice) / this.purchasePrice) * 100;
};

// Pre-save hook to ensure itemCode is set
itemSchema.pre('save', async function(next) {
  if (!this.itemCode) {
    this.itemCode = await this.constructor.generateNextItemCode();
  }
  next();
});

module.exports = mongoose.model('Item', itemSchema); 