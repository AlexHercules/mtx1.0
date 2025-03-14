const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const auth = require('../middleware/auth');

// 获取平台概览报表
router.get('/overview', auth, reportController.getPlatformOverview);

// 生成项目报表
router.get('/projects', auth, reportController.generateProjectReport);

// 生成用户报表
router.get('/users', auth, reportController.generateUserReport);

// 生成支付报表
router.get('/payments', auth, reportController.generatePaymentReport);

module.exports = router; 