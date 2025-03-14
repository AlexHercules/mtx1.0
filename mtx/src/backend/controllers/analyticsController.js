const Project = require('../models/Project');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Comment = require('../models/Comment');
const mongoose = require('mongoose');

// 获取项目统计数据
exports.getProjectAnalytics = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // 检查项目是否存在
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }
    
    // 检查权限
    if (project.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '您没有权限查看此项目的统计数据' });
    }
    
    // 获取支持者数据
    const backersCount = project.backers.length;
    
    // 获取支持者增长趋势（按天统计）
    const backersGrowth = await Payment.aggregate([
      { $match: { project: mongoose.Types.ObjectId(projectId), status: 'completed' } },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // 获取资金增长趋势
    const fundingGrowth = backersGrowth.map(day => ({
      date: day._id,
      amount: day.amount
    }));
    
    // 获取奖励等级分布
    const rewardDistribution = await Payment.aggregate([
      { $match: { project: mongoose.Types.ObjectId(projectId), status: 'completed' } },
      { $group: {
          _id: '$rewardTier',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    // 获取评论统计
    const commentsCount = await Comment.countDocuments({ project: projectId });
    
    // 获取访问量统计（假设有访问记录模型）
    // 此处省略访问量统计实现
    
    // 获取转化率（访问->支持）
    // 此处省略转化率计算
    
    // 获取社交分享统计
    // 此处省略社交分享统计
    
    res.json({
      projectId,
      title: project.title,
      status: project.status,
      fundingGoal: project.fundingGoal,
      currentFunding: project.currentFunding,
      progress: project.getProgressPercentage(),
      remainingDays: project.getRemainingDays(),
      statistics: {
        backersCount,
        commentsCount,
        backersGrowth,
        fundingGrowth,
        rewardDistribution
      }
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取用户统计数据
exports.getUserAnalytics = async (req, res) => {
  try {
    // 检查权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '您没有权限查看用户统计数据' });
    }
    
    // 获取用户增长趋势
    const userGrowth = await User.aggregate([
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // 获取用户角色分布
    const roleDistribution = await User.aggregate([
      { $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // 获取活跃用户统计
    const activeUsers = await User.countDocuments({
      'loginHistory.date': { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    
    // 获取用户地理分布
    const locationDistribution = await User.aggregate([
      { $unwind: '$loginHistory' },
      { $group: {
          _id: '$loginHistory.location',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      statistics: {
        totalUsers: await User.countDocuments(),
        activeUsers,
        userGrowth,
        roleDistribution,
        locationDistribution
      }
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取平台统计数据
exports.getPlatformAnalytics = async (req, res) => {
  try {
    // 检查权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '您没有权限查看平台统计数据' });
    }
    
    // 获取项目统计
    const projectsCount = await Project.countDocuments();
    const activeProjectsCount = await Project.countDocuments({ status: 'active' });
    const fundedProjectsCount = await Project.countDocuments({ status: 'funded' });
    const failedProjectsCount = await Project.countDocuments({ status: 'failed' });
    
    // 获取资金统计
    const fundingStats = await Project.aggregate([
      { $group: {
          _id: null,
          totalFunding: { $sum: '$currentFunding' },
          avgFunding: { $avg: '$currentFunding' },
          maxFunding: { $max: '$currentFunding' }
        }
      }
    ]);
    
    // 获取分类统计
    const categoryDistribution = await Project.aggregate([
      { $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalFunding: { $sum: '$currentFunding' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // 获取支付方式统计
    const paymentMethodStats = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);
    
    // 获取平台增长趋势
    const platformGrowth = await Project.aggregate([
      { $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          projectsCount: { $sum: 1 },
          fundingAmount: { $sum: '$currentFunding' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      statistics: {
        projects: {
          total: projectsCount,
          active: activeProjectsCount,
          funded: fundedProjectsCount,
          failed: failedProjectsCount,
          successRate: fundedProjectsCount / (fundedProjectsCount + failedProjectsCount) * 100
        },
        funding: fundingStats[0] || { totalFunding: 0, avgFunding: 0, maxFunding: 0 },
        categoryDistribution,
        paymentMethodStats,
        platformGrowth
      }
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
}; 