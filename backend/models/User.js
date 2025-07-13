const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  role: {
    type: String,
    enum: ['user', 'manager', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  permissions: {
    inventory: {
      type: [String],
      default: []
    },
    sales: {
      type: [String],
      default: []
    },
    users: {
      type: [String],
      default: []
    },
    analytics: {
      type: [String],
      default: []
    },
    settings: {
      type: [String],
      default: []
    }
  },
  lastLogin: {
    type: Date
  },
  passwordResetAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Set default permissions based on role
userSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('role')) {
    const defaultPermissions = {
      admin: {
        inventory: ['view', 'add', 'edit', 'delete', 'export'],
        sales: ['view', 'create', 'edit', 'delete', 'reports'],
        users: ['view', 'add', 'edit', 'delete', 'permissions'],
        analytics: ['view', 'export', 'advanced'],
        settings: ['view', 'edit', 'backup', 'restore']
      },
      manager: {
        inventory: ['view', 'add', 'edit', 'export'],
        sales: ['view', 'create', 'edit', 'reports'],
        users: ['view'],
        analytics: ['view', 'export'],
        settings: ['view']
      },
      user: {
        inventory: ['view'],
        sales: ['view', 'create'],
        users: [],
        analytics: ['view'],
        settings: []
      }
    };

    if (defaultPermissions[this.role]) {
      this.permissions = defaultPermissions[this.role];
    }
  }
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User; 