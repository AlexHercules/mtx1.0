const mongoose = require('mongoose');

const loginAttemptSchema = new mongoose.Schema({
  identifier: {
    type: String,
    required: true,
    index: true
  },
  ip: {
    type: String,
    required: true
  },
  attempts: {
    type: Number,
    default: 1
  },
  locked: {
    type: Boolean,
    default: false
  },
  lockUntil: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 24 * 60 * 60 // 自动过期时间：24小时
  }
});

const LoginAttempt = mongoose.model('LoginAttempt', loginAttemptSchema);
module.exports = LoginAttempt; 