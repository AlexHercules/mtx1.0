const Notification = require('../models/Notification');
const User = require('../models/User');

// 发送通知
exports.sendNotification = async (notificationData) => {
  try {
    const { recipient, type, title, message, data } = notificationData;
    
    // 创建通知
    const notification = new Notification({
      recipient,
      type,
      title,
      message,
      data,
      isRead: false
    });
    
    await notification.save();
    
    // 如果集成了WebSocket，可以在这里发送实时通知
    // 此处省略WebSocket实现
    
    return notification;
  } catch (error) {
    console.error('发送通知失败:', error);
    throw error;
  }
};

// 获取用户未读通知数量
exports.getUnreadCount = async (userId) => {
  try {
    return await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });
  } catch (error) {
    console.error('获取未读通知数量失败:', error);
    throw error;
  }
};

// 标记通知为已读
exports.markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true },
      { new: true }
    );
    
    return notification;
  } catch (error) {
    console.error('标记通知已读失败:', error);
    throw error;
  }
};

// 标记所有通知为已读
exports.markAllAsRead = async (userId) => {
  try {
    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );
    
    return true;
  } catch (error) {
    console.error('标记所有通知已读失败:', error);
    throw error;
  }
}; 