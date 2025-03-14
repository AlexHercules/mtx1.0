const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');

// 搜索项目
router.get('/projects', searchController.searchProjects);

// 获取推荐项目（可选认证）
router.get('/recommended', optionalAuth, searchController.getRecommendedProjects);

// 获取分类和标签
router.get('/categories', searchController.getCategories);

module.exports = router; 