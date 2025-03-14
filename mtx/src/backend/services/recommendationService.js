const Project = require('../models/Project');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const mongoose = require('mongoose');

// 获取用户推荐项目
exports.getRecommendedProjects = async (userId, options = {}) => {
  try {
    const { limit = 10, excludeIds = [] } = options;
    
    // 如果没有用户ID，返回热门项目
    if (!userId) {
      return await getPopularProjects(limit, excludeIds);
    }
    
    // 获取用户信息
    const user = await User.findById(userId);
    if (!user) {
      return await getPopularProjects(limit, excludeIds);
    }
    
    // 获取用户最近查看的项目分类和标签
    const userInterests = await getUserInterests(userId);
    
    // 如果没有足够的用户兴趣数据，返回热门项目
    if (!userInterests.categories.length && !userInterests.tags.length) {
      return await getPopularProjects(limit, excludeIds);
    }
    
    // 构建推荐查询
    const query = {
      status: 'active',
      _id: { $nin: excludeIds }
    };
    
    // 基于用户兴趣构建查询条件
    const interestConditions = [];
    
    if (userInterests.categories.length) {
      interestConditions.push({ category: { $in: userInterests.categories } });
    }
    
    if (userInterests.tags.length) {
      interestConditions.push({ tags: { $in: userInterests.tags } });
    }
    
    if (interestConditions.length) {
      query.$or = interestConditions;
    }
    
    // 查询推荐项目
    let recommendedProjects = await Project.find(query)
      .sort({ currentFunding: -1 })
      .limit(limit)
      .select('title shortDescription images category tags currentFunding fundingGoal backers endDate')
      .populate('creator', 'username avatar');
    
    // 如果推荐项目不足，补充热门项目
    if (recommendedProjects.length < limit) {
      const existingIds = [...excludeIds, ...recommendedProjects.map(p => p._id)];
      const additionalProjects = await getPopularProjects(
        limit - recommendedProjects.length,
        existingIds
      );
      
      recommendedProjects = [...recommendedProjects, ...additionalProjects];
    }
    
    return recommendedProjects;
  } catch (error) {
    console.error('获取推荐项目失败:', error);
    // 出错时返回热门项目
    return await getPopularProjects(limit, excludeIds);
  }
};

// 获取热门项目
const getPopularProjects = async (limit, excludeIds = []) => {
  try {
    return await Project.find({
      status: 'active',
      _id: { $nin: excludeIds }
    })
      .sort({ currentFunding: -1 })
      .limit(limit)
      .select('title shortDescription images category tags currentFunding fundingGoal backers endDate')
      .populate('creator', 'username avatar');
  } catch (error) {
    console.error('获取热门项目失败:', error);
    return [];
  }
};

// 获取用户兴趣（基于浏览和支持历史）
const getUserInterests = async (userId) => {
  try {
    // 获取用户最近30天的项目浏览和支持记录
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const userActivities = await ActivityLog.find({
      user: userId,
      activityType: { $in: ['PROJECT_VIEW', 'PAYMENT'] },
      targetType: 'Project',
      createdAt: { $gte: thirtyDaysAgo }
    }).select('targetId activityType');
    
    if (!userActivities.length) {
      return { categories: [], tags: [] };
    }
    
    // 获取用户查看和支持的项目ID
    const projectIds = userActivities.map(activity => activity.targetId);
    
    // 查询这些项目的分类和标签
    const projects = await Project.find({
      _id: { $in: projectIds }
    }).select('category tags');
    
    // 统计分类和标签出现频率
    const categoryCount = {};
    const tagCount = {};
    
    projects.forEach(project => {
      // 统计分类
      if (project.category) {
        categoryCount[project.category] = (categoryCount[project.category] || 0) + 1;
      }
      
      // 统计标签
      if (project.tags && project.tags.length) {
        project.tags.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        });
      }
    });
    
    // 按出现频率排序
    const sortedCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0])
      .slice(0, 5);
    
    const sortedTags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0])
      .slice(0, 10);
    
    return {
      categories: sortedCategories,
      tags: sortedTags
    };
  } catch (error) {
    console.error('获取用户兴趣失败:', error);
    return { categories: [], tags: [] };
  }
}; 