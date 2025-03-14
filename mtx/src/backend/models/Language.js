const mongoose = require('mongoose');

// 语言配置模型
const languageSchema = new mongoose.Schema({
  // 语言代码（如zh-CN, en-US）
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // 语言名称（如简体中文, English）
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  // 语言本地名称（如中文, English）
  nativeName: {
    type: String,
    required: true,
    trim: true
  },
  
  // 是否为默认语言
  isDefault: {
    type: Boolean,
    default: false
  },
  
  // 是否启用
  isEnabled: {
    type: Boolean,
    default: true
  },
  
  // 语言方向（ltr: 从左到右, rtl: 从右到左）
  direction: {
    type: String,
    enum: ['ltr', 'rtl'],
    default: 'ltr'
  },
  
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // 更新时间
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时自动更新updatedAt字段
languageSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 创建索引
languageSchema.index({ code: 1 });
languageSchema.index({ isDefault: 1 });
languageSchema.index({ isEnabled: 1 });

const Language = mongoose.model('Language', languageSchema);
module.exports = Language; 