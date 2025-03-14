const mongoose = require('mongoose');

const securityLogSchema = new mongoose.Schema({
  // 用户ID（可选，支持记录未登录用户的事件）
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // 事件类型
  eventType: {
    type: String,
    enum: [
      'LOGIN_ATTEMPT',      // 登录尝试
      'PASSWORD_RESET',     // 密码重置
      'ACCOUNT_LOCKOUT',    // 账户锁定
      'PERMISSION_CHANGE',  // 权限变更
      'PROFILE_UPDATE',     // 个人资料更新
      'API_ACCESS',         // API访问
      'ADMIN_ACTION',       // 管理员操作
      'PAYMENT_ATTEMPT',    // 支付尝试
      'SUSPICIOUS_ACTIVITY' // 可疑活动
    ],
    required: true,
    index: true
  },
  
  // 事件状态
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'BLOCKED', 'WARNING'],
    required: true,
    index: true
  },
  
  // IP地址
  ipAddress: {
    type: String,
    index: true
  },
  
  // 用户代理（浏览器信息）
  userAgent: String,
  
  // 事件详情
  details: {
    type: Object,
    default: {}
  },
  
  // 时间戳
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// 创建复合索引
securityLogSchema.index({ eventType: 1, timestamp: -1 });
securityLogSchema.index({ ipAddress: 1, eventType: 1, timestamp: -1 });
securityLogSchema.index({ user: 1, eventType: 1, timestamp: -1 });

const SecurityLog = mongoose.model('SecurityLog', securityLogSchema);
module.exports = SecurityLog; 