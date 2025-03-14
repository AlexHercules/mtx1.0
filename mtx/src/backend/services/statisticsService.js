const Statistics = require('../models/Statistics');
const Project = require('../models/Project');
const User = require('../models/User');
const Payment = require('../models/Payment');
const mongoose = require('mongoose');

// 获取今天的日期（去除时间部分）
const getTodayDate = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
};

// 更新每日统计数据
exports.updateDailyStatistics = async () => {
  try {
    const today = getTodayDate();
    
    // 查找今天的统计记录，如果不存在则创建
    let statistics = await Statistics.findOne({ date: today });
    
    if (!statistics) {
      statistics = new Statistics({ date: today });
    }
    
    // 项目统计
    const projectStats = await Project.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          funding: { $sum: '$currentFunding' }
        }
      }
    ]);
    
    // 重置项目统计数据
    statistics.projects.total = 0;
    statistics.projects.active = 0;
    statistics.projects.funded = 0;
    statistics.projects.failed = 0;
    statistics.projects.draft = 0;
    
    // 更新项目统计数据
    projectStats.forEach(stat => {
      statistics.projects.total += stat.count;
      
      switch (stat._id) {
        case 'active':
          statistics.projects.active = stat.count;
          break;
        case 'funded':
          statistics.projects.funded = stat.count;
          break;
        case 'failed':
          statistics.projects.failed = stat.count;
          break;
        case 'draft':
          statistics.projects.draft = stat.count;
          break;
      }
    });
    
    // 今日新增项目
    statistics.projects.new = await Project.countDocuments({
      createdAt: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
    });
    
    // 用户统计
    statistics.users.total = await User.countDocuments();
    
    // 今日新增用户
    statistics.users.new = await User.countDocuments({
      createdAt: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
    });
    
    // 今日活跃用户（假设有登录记录模型）
    // 此处简化处理，实际应该查询登录记录
    statistics.users.active = await User.countDocuments({
      lastLoginAt: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
    });
    
    // 资金统计
    const fundingStats = await Project.aggregate([
      {
        $group: {
          _id: null,
          totalFunding: { $sum: '$currentFunding' }
        }
      }
    ]);
    
    statistics.funding.total = fundingStats.length > 0 ? fundingStats[0].totalFunding : 0;
    
    // 今日筹资金额
    const dailyFunding = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: null,
          amount: { $sum: '$amount' }
        }
      }
    ]);
    
    statistics.funding.daily = dailyFunding.length > 0 ? dailyFunding[0].amount : 0;
    
    // 平均每个项目筹资金额
    if (statistics.projects.total > 0) {
      statistics.funding.avgPerProject = statistics.funding.total / statistics.projects.total;
    }
    
    // 平均每个支持者支持金额
    const backersStats = await Payment.aggregate([
      {
        $match: { status: 'completed' }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          uniqueBackers: { $addToSet: '$user' }
        }
      }
    ]);
    
    if (backersStats.length > 0 && backersStats[0].uniqueBackers.length > 0) {
      statistics.funding.avgPerBacker = backersStats[0].totalAmount / backersStats[0].uniqueBackers.length;
    }
    
    // 支付统计
    const paymentStats = await Payment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // 重置支付统计数据
    statistics.payments.total = 0;
    statistics.payments.successful = 0;
    statistics.payments.failed = 0;
    
    // 更新支付统计数据
    paymentStats.forEach(stat => {
      statistics.payments.total += stat.count;
      
      if (stat._id === 'completed') {
        statistics.payments.successful = stat.count;
      } else if (stat._id === 'failed') {
        statistics.payments.failed = stat.count;
      }
    });
    
    // 支付方式统计
    const paymentMethodStats = await Payment.aggregate([
      {
        $match: { status: 'completed' }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // 重置支付方式统计数据
    statistics.payments.byMethod = {
      alipay: 0,
      wechat: 0,
      creditCard: 0,
      bankTransfer: 0
    };
    
    // 更新支付方式统计数据
    paymentMethodStats.forEach(stat => {
      if (statistics.payments.byMethod.hasOwnProperty(stat._id)) {
        statistics.payments.byMethod[stat._id] = stat.count;
      }
    });
    
    // 分类统计
    const categoryStats = await Project.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          funding: { $sum: '$currentFunding' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    statistics.categories = categoryStats.map(stat => ({
      name: stat._id,
      count: stat.count,
      funding: stat.funding
    }));
    
    // 保存统计数据
    await statistics.save();
    
    return statistics;
  } catch (error) {
    console.error('更新统计数据失败:', error);
    throw error;
  }
};

// 获取日期范围内的统计数据
exports.getStatisticsByDateRange = async (startDate, endDate) => {
  try {
    return await Statistics.find({
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    throw error;
  }
};

// 获取最新的统计数据
exports.getLatestStatistics = async () => {
  try {
    return await Statistics.findOne().sort({ date: -1 });
  } catch (error) {
    console.error('获取最新统计数据失败:', error);
    throw error;
  }
}; 