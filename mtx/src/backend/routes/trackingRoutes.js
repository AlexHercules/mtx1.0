const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');

// 记录前端活动（不需要认证）
router.post('/activity', trackingController.trackActivity);

// 获取用户活动历史（需要认证）
router.get('/user/history', auth, trackingController.getUserActivityHistory);
router.get('/user/:userId/history', auth, trackingController.getUserActivityHistory);

// 获取推荐项目（可选认证）
router.get('/recommendations', optionalAuth, trackingController.getRecommendedProjects);

module.exports = router; 