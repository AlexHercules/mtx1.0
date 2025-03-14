const mongoose = require('mongoose');

// 平台统计数据模型
const statisticsSchema = new mongoose.Schema({
  // 统计日期
  date: {
    type: Date,
    required: true,
    unique: true
  },
  
  // 项目统计
  projects: {
    total: { type: Number, default: 0 },
    active: { type: Number, default: 0 },
    funded: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    draft: { type: Number, default: 0 },
    new: { type: Number, default: 0 } // 当日新增
  },
  
  // 用户统计
  users: {
    total: { type: Number, default: 0 },
    active: { type: Number, default: 0 }, // 当日活跃
    new: { type: Number, default: 0 }     // 当日新增
  },
  
  // 资金统计
  funding: {
    total: { type: Number, default: 0 },   // 总筹资金额
    daily: { type: Number, default: 0 },   // 当日筹资金额
    avgPerProject: { type: Number, default: 0 }, // 平均每个项目筹资金额
    avgPerBacker: { type: Number, default: 0 }   // 平均每个支持者支持金额
  },
  
  // 支付统计
  payments: {
    total: { type: Number, default: 0 },
    successful: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    byMethod: {
      alipay: { type: Number, default: 0 },
      wechat: { type: Number, default: 0 },
      creditCard: { type: Number, default: 0 },
      bankTransfer: { type: Number, default: 0 }
    }
  },
  
  // 分类统计
  categories: [{
    name: String,
    count: Number,
    funding: Number
  }],
  
  // 访问统计
  visits: {
    total: { type: Number, default: 0 },
    unique: { type: Number, default: 0 }
  },
  
  // 转化率
  conversionRates: {
    visitToSignup: { type: Number, default: 0 },  // 访问到注册转化率
    visitToBacker: { type: Number, default: 0 },  // 访问到支持转化率
    viewToSupport: { type: Number, default: 0 }   // 项目查看到支持转化率
  }
});

// 创建索引
statisticsSchema.index({ date: -1 });

const Statistics = mongoose.model('Statistics', statisticsSchema);
module.exports = Statistics; 