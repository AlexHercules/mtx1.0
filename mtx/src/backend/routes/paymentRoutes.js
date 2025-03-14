const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');

// 创建支付
router.post('/', auth, paymentController.createPayment);

// 支付回调通知
router.post('/notify', paymentController.paymentNotify);

// 查询支付状态
router.get('/:paymentId', auth, paymentController.getPaymentStatus);

// 获取用户支付历史
router.get('/user/history', auth, paymentController.getUserPayments);

module.exports = router; 