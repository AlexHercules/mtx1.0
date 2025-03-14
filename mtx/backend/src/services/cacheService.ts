import NodeCache from 'node-cache';
import { logger } from '../utils';

// 创建缓存实例，默认过期时间5分钟
const cache = new NodeCache({ stdTTL: 300 });

/**
 * 通用缓存服务
 */
export const cacheService = {
  /**
   * 获取缓存数据
   * 
   * @param {string} key - 缓存键
   * @returns {any|null} 缓存数据或null
   */
  get<T>(key: string): T | null {
    try {
      return cache.get<T>(key) || null;
    } catch (error) {
      logger.error(`获取缓存失败: ${key}`, error);
      return null;
    }
  },
  
  /**
   * 设置缓存数据
   * 
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} [ttl] - 过期时间(秒)，不指定则使用默认值
   * @returns {boolean} 是否成功
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    try {
      return cache.set(key, value, ttl);
    } catch (error) {
      logger.error(`设置缓存失败: ${key}`, error);
      return false;
    }
  },
  
  /**
   * 删除缓存
   * 
   * @param {string} key - 缓存键
   * @returns {number} 删除的键数量
   */
  del(key: string): number {
    try {
      return cache.del(key);
    } catch (error) {
      logger.error(`删除缓存失败: ${key}`, error);
      return 0;
    }
  },
  
  /**
   * 清空所有缓存
   */
  flush(): void {
    try {
      cache.flushAll();
    } catch (error) {
      logger.error('清空缓存失败', error);
    }
  },
  
  /**
   * 获取或设置缓存
   * 如果缓存不存在，则调用回调函数获取数据并缓存
   * 
   * @param {string} key - 缓存键
   * @param {Function} callback - 获取数据的回调函数
   * @param {number} [ttl] - 过期时间(秒)
   * @returns {Promise<T>} 数据
   */
  async getOrSet<T>(key: string, callback: () => Promise<T>, ttl?: number): Promise<T> {
    const cachedData = this.get<T>(key);
    
    if (cachedData !== null) {
      return cachedData;
    }
    
    const data = await callback();
    this.set(key, data, ttl);
    return data;
  }
}; 