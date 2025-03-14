const trackingService = require('../services/trackingService');
const recommendationService = require('../services/recommendationService');

// 记录前端活动
exports.trackActivity = async (req, res) => {
  try {
    const {
      sessionId,
      activityType,
      targetId,
      targetType,
      data
    } = req.body;
    
    // 获取用户ID（如果已登录）
    const userId = req.user ? req.user.id : null;
    
    // 记录活动
    await trackingService.trackActivity({
      user: userId,
      sessionId,
      activityType,
      targetId,
      targetType,
      data,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      referrer: req.headers.referer || req.headers.referrer
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
    // 即使出错也返回成功，不影响用户体验
    console.error('记录前端活动失败:', error);
    res.status(200).json({ success: true });
  }
};

// 获取用户活动历史
exports.getUserActivityHistory = async (req, res) => {
  try {
    const { page, limit, activityTypes, startDate, endDate } = req.query;
    
    // 只允许用户查看自己的活动历史，或管理员查看任何用户
    const userId = req.params.userId || req.user.id;
    
    if (userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '您没有权限查看此用户的活动历史' });
    }
    
    const result = await trackingService.getUserActivityHistory(userId, {
      page,
      limit,
      activityTypes: activityTypes ? activityTypes.split(',') : undefined,
      startDate,
      endDate
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取推荐项目
exports.getRecommendedProjects = async (req, res) => {
  try {
    const { limit = 10, excludeIds } = req.query;
    
    // 获取用户ID（如果已登录）
    const userId = req.user ? req.user.id : null;
    
    // 处理排除的项目ID
    const excludeProjectIds = excludeIds ? excludeIds.split(',') : [];
    
    // 获取推荐项目
    const recommendedProjects = await recommendationService.getRecommendedProjects(userId, {
      limit: parseInt(limit),
      excludeIds: excludeProjectIds
    });
    
    res.json(recommendedProjects);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
}; 