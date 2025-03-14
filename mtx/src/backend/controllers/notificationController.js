const Notification = require('../models/Notification');
const { markAsRead, markAllAsRead } = require('../utils/notificationService');

// 获取用户通知
exports.getUserNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    // 构建查询条件
    const query = { recipient: req.user.id };
    
    if (unreadOnly === 'true') {
      query.isRead = false;
    }
    
    // 查询通知
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    // 获取总数
    const total = await Notification.countDocuments(query);
    
    // 获取未读数量
    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false
    });
    
    res.json({
      notifications,
      unreadCount,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 标记通知为已读
exports.markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await markAsRead(notificationId, req.user.id);
    
    if (!notification) {
      return res.status(404).json({ message: '通知不存在或不属于当前用户' });
    }
    
    res.json({
      message: '通知已标记为已读',
      notification
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 标记所有通知为已读
exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    await markAllAsRead(req.user.id);
    
    res.json({
      message: '所有通知已标记为已读'
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 删除通知
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: req.user.id
    });
    
    if (!notification) {
      return res.status(404).json({ message: '通知不存在或不属于当前用户' });
    }
    
    res.json({
      message: '通知已删除'
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
}; 