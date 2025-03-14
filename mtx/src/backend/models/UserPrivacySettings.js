const mongoose = require('mongoose');

const userPrivacySettingsSchema = new mongoose.Schema({
  // 用户ID
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // 个人资料可见性
  profileVisibility: {
    type: String,
    enum: ['public', 'registered', 'private'],
    default: 'public'
  },
  
  // 显示真实姓名
  showRealName: {
    type: Boolean,
    default: false
  },
  
  // 显示电子邮件
  showEmail: {
    type: Boolean,
    default: false
  },
  
  // 显示支持的项目
  showBackedProjects: {
    type: Boolean,
    default: true
  },
  
  // 显示创建的项目
  showCreatedProjects: {
    type: Boolean,
    default: true
  },
  
  // 允许通过电子邮件联系
  allowEmailContact: {
    type: Boolean,
    default: true
  },
  
  // 接收平台通知
  receiveNotifications: {
    type: Boolean,
    default: true
  },
  
  // 接收营销邮件
  receiveMarketingEmails: {
    type: Boolean,
    default: false
  },
  
  // 接收项目更新
  receiveProjectUpdates: {
    type: Boolean,
    default: true
  },
  
  // 接收新闻通讯
  receiveNewsletter: {
    type: Boolean,
    default: false
  },
  
  // 同意的隐私政策版本
  agreedPrivacyPolicyVersion: {
    type: String
  },
  
  // 同意隐私政策的日期
  privacyPolicyAgreedAt: {
    type: Date
  },
  
  // 更新日期
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时自动更新updatedAt字段
userPrivacySettingsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 创建索引
userPrivacySettingsSchema.index({ user: 1 });

const UserPrivacySettings = mongoose.model('UserPrivacySettings', userPrivacySettingsSchema);
module.exports = UserPrivacySettings; 