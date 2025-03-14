const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const twoFactorAuthController = require('../controllers/twoFactorAuthController');
const auth = require('../middleware/auth');
const multer = require('multer');

// 配置文件上传
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new Error('请上传jpg、jpeg或png格式的图片'));
    }
    cb(null, true);
  }
});

// 获取用户资料
router.get('/profile', auth, userController.getUserProfile);

// 更新用户资料
router.patch('/profile', auth, userController.updateProfile);

// 更新头像
router.patch('/avatar', auth, upload.single('avatar'), userController.updateAvatar);

// 更改密码
router.patch('/password', auth, userController.changePassword);

// 双因素认证
router.post('/2fa/setup', auth, twoFactorAuthController.setupTwoFactor);
router.post('/2fa/enable', auth, twoFactorAuthController.enableTwoFactor);
router.post('/2fa/disable', auth, twoFactorAuthController.disableTwoFactor);

// 账号注销
router.post('/deactivate', auth, userController.requestDeactivation);
router.post('/cancel-deactivation', auth, userController.cancelDeactivation);

// 数据导出
router.get('/export-data', auth, userController.exportUserData);

module.exports = router; 