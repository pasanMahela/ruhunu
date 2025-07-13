const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  itemCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: [10, 'Item code cannot be more than 10 characters']
  },
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: [100, 'Item name cannot be more than 100 characters']
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values but ensures uniqueness when present
    trim: true,
    maxlength: [50, 'Barcode cannot be more than 50 characters'],
    validate: {
      validator: function(v) {
        // Allow empty string or null, but if present, must be alphanumeric
        return !v || /^[a-zA-Z0-9]+$/.test(v);
      },
      message: 'Barcode must contain only letters and numbers'
    }
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
itemSchema.index({ barcode: 1 });

// Add method to generate next item code
itemSchema.statics.generateNextItemCode = async function() {
  try {
    // Find the item with the highest numeric item code
    const lastItem = await this.findOne({
      itemCode: { $regex: /^\d+$/ } // Only match purely numeric codes
    }, {}, { 
      sort: { 
        createdAt: -1 // Sort by creation date to get the most recent
      } 
    });
    
    let nextNumber = 1;
    
    if (lastItem) {
      // Get all items and find the maximum numeric code
      const allItems = await this.find({
        itemCode: { $regex: /^\d+$/ }
      }).select('itemCode');
      
      const maxCode = Math.max(...allItems.map(item => parseInt(item.itemCode) || 0));
      nextNumber = maxCode + 1;
    }
    
    return nextNumber.toString();
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

// Pre-save hook to ensure itemCode is set and handle empty barcode
itemSchema.pre('save', async function(next) {
  if (!this.itemCode) {
    this.itemCode = await this.constructor.generateNextItemCode();
  }
  
  // Convert empty barcode string to null for proper sparse indexing
  if (this.barcode === '') {
    this.barcode = null;
  }
  
  next();
});

module.exports = mongoose.model('Item', itemSchema); 