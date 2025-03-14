const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phoneNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  avatar: {
    type: String,
    default: 'default-avatar.png'
  },
  bio: {
    type: String,
    default: ''
  },
  supportedProjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  createdProjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  socialAuth: {
    wechat: { id: String, token: String },
    qq: { id: String, token: String },
    google: { id: String, token: String }
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  role: {
    type: String,
    enum: ['user', 'creator', 'admin'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'deactivated'],
    default: 'active'
  },
  twoFactorAuth: {
    enabled: {
      type: Boolean,
      default: false
    },
    secret: String,
    backupCodes: [String]
  },
  phoneVerification: {
    code: String,
    expiresAt: Date
  },
  deactivationRequest: {
    requestedAt: Date,
    reason: String,
    scheduledDate: Date
  },
  permissions: {
    canCreateProjects: {
      type: Boolean,
      default: true
    },
    canComment: {
      type: Boolean,
      default: true
    },
    canDonate: {
      type: Boolean,
      default: true
    }
  },
  loginHistory: [{
    date: Date,
    ip: String,
    device: String,
    location: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  preferences: {
    language: {
      type: String,
      enum: ['zh-CN', 'en-US', 'ja-JP'],
      default: 'zh-CN'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    }
  },
  devices: [{
    token: String,
    platform: {
      type: String,
      enum: ['ios', 'android', 'web']
    },
    lastActive: Date
  }]
});

userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

userSchema.pre('save', async function(next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 10);
  }
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      role: this.role,
      permissions: this.permissions
    }, 
    process.env.JWT_SECRET, 
    { expiresIn: '7d' }
  );
};

userSchema.methods.hasPermission = function(permission) {
  if (this.role === 'admin') return true;
  return this.permissions[permission] === true;
};

userSchema.methods.addLoginRecord = async function(ip, device, location) {
  this.loginHistory.push({
    date: new Date(),
    ip,
    device,
    location
  });
  
  if (this.loginHistory.length > 10) {
    this.loginHistory = this.loginHistory.slice(-10);
  }
  
  await this.save();
};

userSchema.methods.registerDevice = async function(deviceToken, platform) {
  const deviceExists = this.devices.find(device => device.token === deviceToken);
  
  if (deviceExists) {
    deviceExists.lastActive = new Date();
  } else {
    this.devices.push({
      token: deviceToken,
      platform,
      lastActive: new Date()
    });
  }
  
  await this.save();
  return this.devices;
};

const User = mongoose.model('User', userSchema);
module.exports = User; 