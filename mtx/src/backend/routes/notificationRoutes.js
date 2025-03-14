const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/auth');

// 获取用户通知
router.get('/', auth, notificationController.getUserNotifications);

// 标记通知为已读
router.patch('/:notificationId/read', auth, notificationController.markNotificationAsRead);

// 标记所有通知为已读
router.patch('/read-all', auth, notificationController.markAllNotificationsAsRead);

// 删除通知
router.delete('/:notificationId', auth, notificationController.deleteNotification);

module.exports = router; 