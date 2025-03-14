const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const auth = require('../middleware/auth');

// 获取项目统计数据
router.get('/project/:projectId', auth, analyticsController.getProjectAnalytics);

// 获取用户统计数据（管理员）
router.get('/users', auth, analyticsController.getUserAnalytics);

// 获取平台统计数据（管理员）
router.get('/platform', auth, analyticsController.getPlatformAnalytics);

module.exports = router; 