const Project = require('../models/Project');
const User = require('../models/User');

// 搜索项目
exports.searchProjects = async (req, res) => {
  try {
    const {
      query,
      category,
      tags,
      status,
      sort = 'popular',
      page = 1,
      limit = 12
    } = req.query;
    
    // 构建查询条件
    const searchQuery = {};
    
    // 只显示活跃或已成功的项目
    searchQuery.status = { $in: ['active', 'funded'] };
    
    // 如果有搜索关键词
    if (query) {
      searchQuery.$or = [
        { title: { $regex: query, $options: 'i' } },
        { shortDescription: { $regex: query, $options: 'i' } }
      ];
    }
    
    // 按分类筛选
    if (category) {
      searchQuery.category = category;
    }
    
    // 按标签筛选
    if (tags) {
      const tagArray = tags.split(',');
      searchQuery.tags = { $in: tagArray };
    }
    
    // 如果管理员指定了状态筛选
    if (status && req.user && req.user.role === 'admin') {
      searchQuery.status = status;
    }
    
    // 确定排序方式
    let sortOption = {};
    switch (sort) {
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'endingSoon':
        sortOption = { endDate: 1 };
        break;
      case 'mostFunded':
        sortOption = { currentFunding: -1 };
        break;
      case 'popular':
      default:
        // 计算热度（支持者数量 + 当前资金/1000）
        sortOption = { backers: -1, currentFunding: -1 };
    }
    
    // 执行分页查询
    const projects = await Project.find(searchQuery)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('creator', 'username avatar');
    
    // 获取总数
    const total = await Project.countDocuments(searchQuery);
    
    // 添加项目进度信息
    const projectsWithProgress = projects.map(project => {
      const projectData = project.toObject();
      projectData.progress = project.getProgressPercentage();
      projectData.remainingDays = project.getRemainingDays();
      return projectData;
    });
    
    res.json({
      projects: projectsWithProgress,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取推荐项目
exports.getRecommendedProjects = async (req, res) => {
  try {
    // 如果用户已登录，基于用户兴趣推荐
    if (req.user) {
      // 获取用户支持过的项目
      const user = await User.findById(req.user.id)
        .populate('supportedProjects', 'category tags');
      
      // 提取用户感兴趣的分类和标签
      const categories = new Set();
      const tags = new Set();
      
      if (user.supportedProjects && user.supportedProjects.length > 0) {
        user.supportedProjects.forEach(project => {
          categories.add(project.category);
          project.tags.forEach(tag => tags.add(tag));
        });
      }
      
      // 构建推荐查询
      const recommendQuery = {
        status: 'active',
        _id: { $nin: user.supportedProjects.map(p => p._id) }
      };
      
      // 如果有兴趣分类，按分类推荐
      if (categories.size > 0) {
        recommendQuery.category = { $in: Array.from(categories) };
      }
      
      // 如果有兴趣标签，按标签推荐
      if (tags.size > 0) {
        recommendQuery.tags = { $in: Array.from(tags).slice(0, 5) }; // 最多取5个标签
      }
      
      // 查询推荐项目
      const recommendedProjects = await Project.find(recommendQuery)
        .sort({ currentFunding: -1 })
        .limit(6)
        .populate('creator', 'username avatar');
      
      // 添加项目进度信息
      const projectsWithProgress = recommendedProjects.map(project => {
        const projectData = project.toObject();
        projectData.progress = project.getProgressPercentage();
        projectData.remainingDays = project.getRemainingDays();
        return projectData;
      });
      
      return res.json({ projects: projectsWithProgress });
    }
    
    // 未登录用户，推荐热门项目
    const trendingProjects = await Project.find({ status: 'active' })
      .sort({ backers: -1, currentFunding: -1 })
      .limit(6)
      .populate('creator', 'username avatar');
    
    // 添加项目进度信息
    const projectsWithProgress = trendingProjects.map(project => {
      const projectData = project.toObject();
      projectData.progress = project.getProgressPercentage();
      projectData.remainingDays = project.getRemainingDays();
      return projectData;
    });
    
    res.json({ projects: projectsWithProgress });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取分类和标签列表
exports.getCategories = async (req, res) => {
  try {
    // 获取所有分类
    const categories = await Project.distinct('category');
    
    // 获取热门标签（出现频率最高的20个标签）
    const tagAggregation = await Project.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);
    
    const popularTags = tagAggregation.map(tag => tag._id);
    
    res.json({
      categories,
      popularTags
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
}; 