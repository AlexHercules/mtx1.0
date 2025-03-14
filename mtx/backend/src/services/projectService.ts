import Project from '../models/Project';
import { cacheService } from './cacheService';
import { logger } from '../utils';

/**
 * 获取热门项目
 * 
 * @param {number} limit - 返回数量
 * @param {string[]} excludeIds - 排除的项目ID
 * @returns {Promise<Array>} 热门项目列表
 */
export async function getPopularProjects(limit = 10, excludeIds: string[] = []) {
  const cacheKey = `popular_projects_${limit}_${excludeIds.join('_')}`;
  
  return cacheService.getOrSet(cacheKey, async () => {
    try {
      const projects = await Project.find({
        status: 'active',
        _id: { $nin: excludeIds }
      })
        .sort({ currentFunding: -1 })
        .limit(limit)
        .select('title shortDescription images category tags currentFunding fundingGoal backers endDate')
        .populate('creator', 'username avatar');
      
      return projects;
    } catch (error) {
      logger.error('获取热门项目失败:', error);
      return [];
    }
  }, 300); // 缓存5分钟
} 