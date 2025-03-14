const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// 所有路由都需要认证和管理员权限
router.use(auth);
router.use(adminAuth);

// 用户管理
router.get('/users', adminController.getAllUsers);
router.patch('/users/:userId/role', adminController.updateUserRole);
router.patch('/users/:userId/status', adminController.updateUserStatus);

module.exports = router; 