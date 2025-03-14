const mongoose = require('mongoose');

// 翻译模型
const translationSchema = new mongoose.Schema({
  // 语言代码
  languageCode: {
    type: String,
    required: true,
    trim: true
  },
  
  // 翻译键（用于标识翻译内容）
  key: {
    type: String,
    required: true,
    trim: true
  },
  
  // 翻译内容
  value: {
    type: String,
    required: true
  },
  
  // 翻译分组（如common, project, user等）
  namespace: {
    type: String,
    required: true,
    default: 'common',
    trim: true
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
translationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 创建复合唯一索引
translationSchema.index({ languageCode: 1, key: 1, namespace: 1 }, { unique: true });

// 创建其他索引
translationSchema.index({ languageCode: 1 });
translationSchema.index({ namespace: 1 });

const Translation = mongoose.model('Translation', translationSchema);
module.exports = Translation; 