const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');

// 记录用户活动
exports.trackActivity = async (activityData) => {
  try {
    const {
      user,
      sessionId,
      activityType,
      targetId,
      targetType,
      data,
      ipAddress,
      userAgent,
      referrer
    } = activityData;
    
    // 创建活动日志
    const activityLog = new ActivityLog({
      user,
      sessionId,
      activityType,
      targetId,
      targetType,
      data,
      ipAddress,
      userAgent,
      referrer,
      createdAt: new Date()
    });
    
    // 异步保存，不阻塞主流程
    activityLog.save().catch(err => {
      console.error('保存活动日志失败:', err);
    });
    
    // 如果是登录活动，更新用户的最后登录时间
    if (activityType === 'LOGIN' && user) {
      User.findByIdAndUpdate(user, { lastLoginAt: new Date() })
        .catch(err => {
          console.error('更新用户最后登录时间失败:', err);
        });
    }
    
    return true;
  } catch (error) {
    console.error('记录用户活动失败:', error);
    // 不抛出异常，确保主流程不受影响
    return false;
  }
};

// 获取用户活动历史
exports.getUserActivityHistory = async (userId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      activityTypes,
      startDate,
      endDate
    } = options;
    
    // 构建查询条件
    const query = { user: userId };
    
    if (activityTypes && activityTypes.length > 0) {
      query.activityType = { $in: activityTypes };
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }
    
    // 查询活动日志
    const activities = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('targetId', 'title name username');
    
    // 获取总数
    const total = await ActivityLog.countDocuments(query);
    
    return {
      activities,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('获取用户活动历史失败:', error);
    throw error;
  }
};

// 获取项目活动历史
exports.getProjectActivityHistory = async (projectId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      activityTypes,
      startDate,
      endDate
    } = options;
    
    // 构建查询条件
    const query = { 
      targetId: projectId,
      targetType: 'Project'
    };
    
    if (activityTypes && activityTypes.length > 0) {
      query.activityType = { $in: activityTypes };
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }
    
    // 查询活动日志
    const activities = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('user', 'username avatar');
    
    // 获取总数
    const total = await ActivityLog.countDocuments(query);
    
    return {
      activities,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('获取项目活动历史失败:', error);
    throw error;
  }
}; 