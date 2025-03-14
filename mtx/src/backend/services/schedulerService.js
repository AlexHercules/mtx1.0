const cron = require('node-cron');
const statisticsService = require('./statisticsService');

// 初始化定时任务
exports.initScheduledJobs = () => {
  // 每天凌晨2点更新统计数据
  cron.schedule('0 2 * * *', async () => {
    console.log('执行每日统计数据更新任务...');
    try {
      await statisticsService.updateDailyStatistics();
      console.log('统计数据更新成功');
    } catch (error) {
      console.error('统计数据更新失败:', error);
    }
  });
  
  // 每周一凌晨3点生成周报
  cron.schedule('0 3 * * 1', async () => {
    console.log('执行周报生成任务...');
    try {
      // 生成周报逻辑
      // ...
      console.log('周报生成成功');
    } catch (error) {
      console.error('周报生成失败:', error);
    }
  });
  
  // 每月1日凌晨4点生成月报
  cron.schedule('0 4 1 * *', async () => {
    console.log('执行月报生成任务...');
    try {
      // 生成月报逻辑
      // ...
      console.log('月报生成成功');
    } catch (error) {
      console.error('月报生成失败:', error);
    }
  });
  
  console.log('定时任务已初始化');
}; 