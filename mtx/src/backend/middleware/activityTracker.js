const trackingService = require('../services/trackingService');

// 活动跟踪中间件
module.exports = (activityType, getTargetInfo = null) => {
  return async (req, res, next) => {
    try {
      // 获取用户ID或会话ID
      const userId = req.user ? req.user.id : null;
      const sessionId = req.headers['x-session-id'] || req.cookies.sessionId || null;
      
      // 如果既没有用户ID也没有会话ID，则不记录
      if (!userId && !sessionId) {
        return next();
      }
      
      // 获取目标信息（如项目ID、评论ID等）
      let targetId = null;
      let targetType = null;
      let data = {};
      
      if (getTargetInfo) {
        const targetInfo = getTargetInfo(req);
        targetId = targetInfo.targetId;
        targetType = targetInfo.targetType;
        data = targetInfo.data || {};
      }
      
      // 记录活动
      trackingService.trackActivity({
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
      
      next();
    } catch (error) {
      // 记录错误但不阻止请求继续
      console.error('活动跟踪失败:', error);
      next();
    }
  };
}; 