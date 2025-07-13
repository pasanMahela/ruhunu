const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customerNumber: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
    trim: true
  },
  nic: {
    type: String,
    required: [true, 'NIC number is required'],
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Validate Sri Lankan NIC format (old: 9 digits + V/X, new: 12 digits)
        return /^([0-9]{9}[vVxX]|[0-9]{12})$/.test(v);
      },
      message: 'Please enter a valid NIC number'
    }
  },
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^[0-9+\-\s()]{10,15}$/.test(v);
      },
      message: 'Please enter a valid phone number'
    }
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    district: { type: String, trim: true },
    postalCode: { type: String, trim: true }
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    lowercase: true
  },
  customerType: {
    type: String,
    enum: ['regular', 'wholesale', 'vip', 'banned'],
    default: 'regular'
  },
  creditLimit: {
    type: Number,
    default: 0,
    min: 0
  },
  outstandingBalance: {
    type: Number,
    default: 0
  },
  // Purchase tracking
  totalPurchases: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  lastPurchaseDate: {
    type: Date
  },
  firstPurchaseDate: {
    type: Date
  },
  purchaseCount: {
    type: Number,
    default: 0
  },
  // Loyalty and preferences
  loyaltyPoints: {
    type: Number,
    default: 0
  },
  preferredPaymentMethod: {
    type: String,
    enum: ['cash', 'card', 'credit', 'cheque'],
    default: 'cash'
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'banned', 'suspended'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for customer age based on date of birth
customerSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Virtual for average purchase amount
customerSchema.virtual('averagePurchaseAmount').get(function() {
  return this.purchaseCount > 0 ? (this.totalSpent / this.purchaseCount) : 0;
});

// Virtual for customer status based on purchase activity
customerSchema.virtual('customerStatus').get(function() {
  if (!this.lastPurchaseDate) return 'new';
  
  const daysSinceLastPurchase = Math.floor((Date.now() - this.lastPurchaseDate) / (1000 * 60 * 60 * 24));
  
  if (daysSinceLastPurchase <= 30) return 'active';
  if (daysSinceLastPurchase <= 90) return 'inactive';
  return 'dormant';
});

// Index for better search performance
customerSchema.index({ nic: 1 });
customerSchema.index({ customerNumber: 1 });
customerSchema.index({ name: 'text', email: 'text' });
customerSchema.index({ phone: 1 });
customerSchema.index({ createdAt: -1 });
customerSchema.index({ lastPurchaseDate: -1 });

// Pre-save middleware to update NIC format
customerSchema.pre('save', function(next) {
  if (this.isModified('nic')) {
    this.nic = this.nic.toUpperCase();
  }
  next();
});

// Method to update purchase statistics
customerSchema.methods.updatePurchaseStats = function(saleAmount) {
  this.purchaseCount += 1;
  this.totalSpent += saleAmount;
  this.totalPurchases += saleAmount;
  this.lastPurchaseDate = new Date();
  
  if (!this.firstPurchaseDate) {
    this.firstPurchaseDate = new Date();
  }
  
  // Calculate loyalty points (1 point per Rs. 100 spent)
  const pointsEarned = Math.floor(saleAmount / 100);
  this.loyaltyPoints += pointsEarned;
  
  return this.save();
};

// Static method to find customer by NIC or name
customerSchema.statics.findByNicOrName = function(query) {
  return this.find({
    $or: [
      { nic: new RegExp(query, 'i') },
      { name: new RegExp(query, 'i') }
    ]
  });
};

// Static method to get customer analytics
customerSchema.statics.getAnalytics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalCustomers: { $sum: 1 },
        activeCustomers: {
          $sum: {
            $cond: [
              { $gte: ['$lastPurchaseDate', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
              1,
              0
            ]
          }
        },
        totalSpent: { $sum: '$totalSpent' },
        averageSpentPerCustomer: { $avg: '$totalSpent' },
        totalLoyaltyPoints: { $sum: '$loyaltyPoints' }
      }
    }
  ]);
};

module.exports = mongoose.model('Customer', customerSchema); 
 
 
 
 