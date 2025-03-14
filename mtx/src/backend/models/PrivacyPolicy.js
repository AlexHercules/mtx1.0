const mongoose = require('mongoose');

const privacyPolicySchema = new mongoose.Schema({
  // 版本号
  version: {
    type: String,
    required: true,
    unique: true
  },
  
  // 内容
  content: {
    type: String,
    required: true
  },
  
  // 是否为当前版本
  isCurrent: {
    type: Boolean,
    default: false
  },
  
  // 发布日期
  publishedAt: {
    type: Date,
    default: Date.now
  },
  
  // 创建者
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 更新日期
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时自动更新updatedAt字段
privacyPolicySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 创建索引
privacyPolicySchema.index({ version: 1 });
privacyPolicySchema.index({ isCurrent: 1 });
privacyPolicySchema.index({ publishedAt: -1 });

const PrivacyPolicy = mongoose.model('PrivacyPolicy', privacyPolicySchema);
module.exports = PrivacyPolicy; 