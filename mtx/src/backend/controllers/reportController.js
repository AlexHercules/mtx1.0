const Statistics = require('../models/Statistics');
const Project = require('../models/Project');
const User = require('../models/User');
const Payment = require('../models/Payment');
const statisticsService = require('../services/statisticsService');
const excel = require('exceljs');
const path = require('path');
const fs = require('fs');

// 确保报表目录存在
const reportsDir = path.join(__dirname, '../../uploads/reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// 获取平台概览报表
exports.getPlatformOverview = async (req, res) => {
  try {
    // 检查权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '您没有权限访问此资源' });
    }
    
    // 获取最新统计数据
    const latestStats = await statisticsService.getLatestStatistics();
    
    if (!latestStats) {
      // 如果没有统计数据，立即生成
      await statisticsService.updateDailyStatistics();
      latestStats = await statisticsService.getLatestStatistics();
    }
    
    // 获取过去30天的统计数据
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyStats = await Statistics.find({
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: 1 });
    
    // 计算增长率
    let growthRates = {};
    
    if (dailyStats.length >= 2) {
      const firstDay = dailyStats[0];
      const lastDay = dailyStats[dailyStats.length - 1];
      
      growthRates = {
        users: ((lastDay.users.total - firstDay.users.total) / firstDay.users.total) * 100,
        projects: ((lastDay.projects.total - firstDay.projects.total) / firstDay.projects.total) * 100,
        funding: ((lastDay.funding.total - firstDay.funding.total) / firstDay.funding.total) * 100
      };
    }
    
    // 获取热门项目
    const popularProjects = await Project.find({ status: 'active' })
      .sort({ currentFunding: -1 })
      .limit(5)
      .select('title shortDescription currentFunding fundingGoal backers category')
      .populate('creator', 'username');
    
    // 获取最近成功的项目
    const recentlyFundedProjects = await Project.find({ status: 'funded' })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('title shortDescription currentFunding fundingGoal backers category')
      .populate('creator', 'username');
    
    // 返回概览数据
    res.json({
      overview: {
        date: latestStats.date,
        projects: latestStats.projects,
        users: latestStats.users,
        funding: latestStats.funding,
        payments: latestStats.payments
      },
      trends: {
        daily: dailyStats.map(stat => ({
          date: stat.date,
          newUsers: stat.users.new,
          newProjects: stat.projects.new,
          funding: stat.funding.daily
        })),
        growthRates
      },
      topCategories: latestStats.categories.slice(0, 5),
      popularProjects,
      recentlyFundedProjects
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 生成项目报表
exports.generateProjectReport = async (req, res) => {
  try {
    // 检查权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '您没有权限访问此资源' });
    }
    
    const { startDate, endDate, status } = req.query;
    
    // 构建查询条件
    const query = {};
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // 查询项目数据
    const projects = await Project.find(query)
      .sort({ createdAt: -1 })
      .populate('creator', 'username email');
    
    // 创建Excel工作簿
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('项目报表');
    
    // 设置列
    worksheet.columns = [
      { header: '项目ID', key: 'id', width: 26 },
      { header: '项目名称', key: 'title', width: 30 },
      { header: '创建者', key: 'creator', width: 20 },
      { header: '创建者邮箱', key: 'email', width: 30 },
      { header: '分类', key: 'category', width: 15 },
      { header: '目标金额', key: 'goal', width: 15 },
      { header: '当前金额', key: 'current', width: 15 },
      { header: '完成率', key: 'percentage', width: 15 },
      { header: '支持人数', key: 'backers', width: 15 },
      { header: '状态', key: 'status', width: 15 },
      { header: '创建时间', key: 'createdAt', width: 20 },
      { header: '结束时间', key: 'endDate', width: 20 }
    ];
    
    // 添加数据
    projects.forEach(project => {
      worksheet.addRow({
        id: project._id.toString(),
        title: project.title,
        creator: project.creator ? project.creator.username : '未知',
        email: project.creator ? project.creator.email : '未知',
        category: project.category,
        goal: project.fundingGoal,
        current: project.currentFunding,
        percentage: project.getProgressPercentage(),
        backers: project.backers.length,
        status: project.status,
        createdAt: project.createdAt.toISOString().split('T')[0],
        endDate: project.endDate ? project.endDate.toISOString().split('T')[0] : '未设置'
      });
    });
    
    // 设置文件名
    const fileName = `project_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    const filePath = path.join(reportsDir, fileName);
    
    // 保存文件
    await workbook.xlsx.writeFile(filePath);
    
    // 返回文件下载链接
    res.json({
      message: '报表生成成功',
      fileName,
      downloadUrl: `/uploads/reports/${fileName}`
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 生成用户报表
exports.generateUserReport = async (req, res) => {
  try {
    // 检查权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '您没有权限访问此资源' });
    }
    
    const { startDate, endDate, role } = req.query;
    
    // 构建查询条件
    const query = {};
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (role && role !== 'all') {
      query.role = role;
    }
    
    // 查询用户数据
    const users = await User.find(query).sort({ createdAt: -1 });
    
    // 创建Excel工作簿
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('用户报表');
    
    // 设置列
    worksheet.columns = [
      { header: '用户ID', key: 'id', width: 26 },
      { header: '用户名', key: 'username', width: 20 },
      { header: '邮箱', key: 'email', width: 30 },
      { header: '角色', key: 'role', width: 15 },
      { header: '状态', key: 'status', width: 15 },
      { header: '创建项目数', key: 'projectsCount', width: 15 },
      { header: '支持项目数', key: 'backedCount', width: 15 },
      { header: '支持总金额', key: 'backedAmount', width: 15 },
      { header: '注册时间', key: 'createdAt', width: 20 },
      { header: '最后登录', key: 'lastLogin', width: 20 }
    ];
    
    // 获取用户创建的项目数量
    const projectCounts = await Project.aggregate([
      {
        $group: {
          _id: '$creator',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // 获取用户支持的项目数量和金额
    const backingStats = await Payment.aggregate([
      {
        $match: { status: 'completed' }
      },
      {
        $group: {
          _id: '$user',
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      }
    ]);
    
    // 创建查找映射
    const projectCountMap = {};
    projectCounts.forEach(item => {
      projectCountMap[item._id] = item.count;
    });
    
    const backingStatsMap = {};
    backingStats.forEach(item => {
      backingStatsMap[item._id] = {
        count: item.count,
        amount: item.amount
      };
    });
    
    // 添加数据
    users.forEach(user => {
      const userId = user._id.toString();
      worksheet.addRow({
        id: userId,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.isActive ? '活跃' : '禁用',
        projectsCount: projectCountMap[userId] || 0,
        backedCount: backingStatsMap[userId] ? backingStatsMap[userId].count : 0,
        backedAmount: backingStatsMap[userId] ? backingStatsMap[userId].amount : 0,
        createdAt: user.createdAt.toISOString().split('T')[0],
        lastLogin: user.lastLoginAt ? user.lastLoginAt.toISOString().split('T')[0] : '从未登录'
      });
    });
    
    // 设置文件名
    const fileName = `user_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    const filePath = path.join(reportsDir, fileName);
    
    // 保存文件
    await workbook.xlsx.writeFile(filePath);
    
    // 返回文件下载链接
    res.json({
      message: '报表生成成功',
      fileName,
      downloadUrl: `/uploads/reports/${fileName}`
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 生成支付报表
exports.generatePaymentReport = async (req, res) => {
  try {
    // 检查权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '您没有权限访问此资源' });
    }
    
    const { startDate, endDate, paymentMethod, status } = req.query;
    
    // 构建查询条件
    const query = {};
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (paymentMethod && paymentMethod !== 'all') {
      query.paymentMethod = paymentMethod;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // 查询支付数据
    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .populate('user', 'username email')
      .populate('project', 'title')
      .populate('rewardTier');
    
    // 创建Excel工作簿
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('支付报表');
    
    // 设置列
    worksheet.columns = [
      { header: '支付ID', key: 'id', width: 26 },
      { header: '订单号', key: 'orderId', width: 26 },
      { header: '用户', key: 'user', width: 20 },
      { header: '用户邮箱', key: 'email', width: 30 },
      { header: '项目', key: 'project', width: 30 },
      { header: '金额', key: 'amount', width: 15 },
      { header: '支付方式', key: 'paymentMethod', width: 15 },
      { header: '奖励等级', key: 'rewardTier', width: 20 },
      { header: '状态', key: 'status', width: 15 },
      { header: '匿名', key: 'anonymous', width: 10 },
      { header: '创建时间', key: 'createdAt', width: 20 },
      { header: '更新时间', key: 'updatedAt', width: 20 }
    ];
    
    // 添加数据
    payments.forEach(payment => {
      worksheet.addRow({
        id: payment._id.toString(),
        orderId: payment.transactionId || '未生成',
        user: payment.user ? payment.user.username : '未知',
        email: payment.user ? payment.user.email : '未知',
        project: payment.project ? payment.project.title : '未知',
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        rewardTier: payment.rewardTier ? payment.rewardTier.title : '无',
        status: payment.status,
        anonymous: payment.anonymous ? '是' : '否',
        createdAt: payment.createdAt.toISOString().split('T')[0],
        updatedAt: payment.updatedAt.toISOString().split('T')[0]
      });
    });
    
    // 设置文件名
    const fileName = `payment_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    const filePath = path.join(reportsDir, fileName);
    
    // 保存文件
    await workbook.xlsx.writeFile(filePath);
    
    // 返回文件下载链接
    res.json({
      message: '报表生成成功',
      fileName,
      downloadUrl: `/uploads/reports/${fileName}`
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
}; 