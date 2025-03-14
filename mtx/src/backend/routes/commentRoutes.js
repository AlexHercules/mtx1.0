const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');

// 添加评论
router.post('/', auth, commentController.addComment);

// 获取项目评论（可选认证）
router.get('/project/:projectId', optionalAuth, commentController.getProjectComments);

// 获取评论回复（可选认证）
router.get('/:commentId/replies', optionalAuth, commentController.getCommentReplies);

// 点赞评论
router.post('/:commentId/like', auth, commentController.likeComment);

// 隐藏/显示评论
router.patch('/:commentId/visibility', auth, commentController.toggleCommentVisibility);

module.exports = router; 