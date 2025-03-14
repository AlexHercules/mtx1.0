const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    required: true,
    maxlength: 200
  },
  category: {
    type: String,
    required: true,
    enum: ['科技', '设计', '影视', '游戏', '音乐', '出版', '公益', '其他']
  },
  tags: [{
    type: String,
    trim: true
  }],
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  images: [{
    url: String,
    caption: String
  }],
  video: {
    url: String,
    thumbnail: String
  },
  fundingGoal: {
    type: Number,
    required: true,
    min: 1
  },
  currentFunding: {
    type: Number,
    default: 0
  },
  backers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    amount: Number,
    rewardTier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RewardTier'
    },
    anonymous: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  rewardTiers: [{
    title: String,
    description: String,
    amount: Number,
    items: [String],
    maxBackers: Number,
    currentBackers: {
      type: Number,
      default: 0
    },
    estimatedDelivery: Date
  }],
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'active', 'funded', 'failed', 'canceled'],
    default: 'draft'
  },
  updates: [{
    title: String,
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    attachments: [{
      url: String,
      type: String,
      name: String
    }]
  }],
  faq: [{
    question: String,
    answer: String
  }],
  risks: {
    type: String
  },
  location: {
    country: String,
    city: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时间中间件
projectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 计算项目进度百分比
projectSchema.methods.getProgressPercentage = function() {
  return Math.min(100, Math.round((this.currentFunding / this.fundingGoal) * 100));
};

// 检查项目是否已结束
projectSchema.methods.isEnded = function() {
  return new Date() > this.endDate;
};

// 检查项目是否成功
projectSchema.methods.isSuccessful = function() {
  return this.currentFunding >= this.fundingGoal;
};

// 获取剩余天数
projectSchema.methods.getRemainingDays = function() {
  if (this.isEnded()) return 0;
  
  const now = new Date();
  const diffTime = this.endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

const Project = mongoose.model('Project', projectSchema);
module.exports = Project; 