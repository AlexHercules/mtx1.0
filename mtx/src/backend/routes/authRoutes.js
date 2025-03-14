const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

// 注册
router.post('/register', authController.register);

// 登录（添加速率限制）
router.post('/login', rateLimiter, authController.login);

// 手机验证码登录
router.post('/send-verification', rateLimiter, authController.sendPhoneVerification);
router.post('/phone-login', rateLimiter, authController.phoneLogin);

// 忘记密码
router.post('/forgot-password', authController.forgotPassword);

// 重置密码
router.post('/reset-password/:token', authController.resetPassword);

// 第三方登录
router.post('/wechat', authController.wechatAuth);
router.post('/qq', authController.qqAuth);
router.post('/google', authController.googleAuth);

// 双因素认证验证
router.post('/verify-2fa', authController.verifyTwoFactor);
router.post('/verify-backup-code', authController.verifyBackupCode);

module.exports = router; 