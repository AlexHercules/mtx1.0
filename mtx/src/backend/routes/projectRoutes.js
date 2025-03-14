const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const multer = require('multer');
const activityTracker = require('../middleware/activityTracker');

// 配置文件上传
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('请上传jpg、jpeg、png或gif格式的图片'));
    }
    cb(null, true);
  }
});

// 创建项目
router.post('/', auth, projectController.createProject);

// 获取项目详情（添加活动跟踪）
router.get('/:id', optionalAuth, 
  activityTracker('PROJECT_VIEW', req => ({
    targetId: req.params.id,
    targetType: 'Project'
  })),
  projectController.getProjectById
);

// 更新项目
router.patch('/:projectId', auth, projectController.updateProject);

// 上传项目图片
router.post('/:projectId/images', auth, upload.single('image'), projectController.uploadProjectImage);

// 提交项目审核
router.post('/:projectId/submit', auth, projectController.submitForReview);

// 审核项目（管理员功能）
router.post('/:projectId/review', auth, projectController.reviewProject);

// 添加项目更新
router.post('/:projectId/updates', auth, projectController.addProjectUpdate);

// 添加常见问题
router.post('/:projectId/faq', auth, projectController.addProjectFAQ);

// 取消项目
router.post('/:projectId/cancel', auth, projectController.cancelProject);

// 获取用户创建的项目
router.get('/user/:userId?', auth, projectController.getUserProjects);

module.exports = router; 