const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  // 用户ID（可选，支持匿名访问记录）
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // 会话ID（用于跟踪匿名用户）
  sessionId: {
    type: String,
    index: true
  },
  
  // 活动类型
  activityType: {
    type: String,
    enum: [
      'PAGE_VIEW',        // 页面浏览
      'PROJECT_VIEW',     // 项目查看
      'SEARCH',           // 搜索操作
      'SIGNUP',           // 注册
      'LOGIN',            // 登录
      'LOGOUT',           // 登出
      'PROJECT_CREATE',   // 创建项目
      'PROJECT_EDIT',     // 编辑项目
      'PROJECT_PUBLISH',  // 发布项目
      'PAYMENT',          // 支付/支持项目
      'COMMENT',          // 评论
      'LIKE',             // 点赞
      'FOLLOW',           // 关注
      'SHARE'             // 分享
    ],
    required: true,
    index: true
  },
  
  // 活动目标（如项目ID、用户ID等）
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  
  // 目标类型（如Project、User等）
  targetType: {
    type: String,
    enum: ['Project', 'User', 'Comment', 'Payment', null]
  },
  
  // 活动数据（根据活动类型存储不同的数据）
  data: {
    type: Object,
    default: {}
  },
  
  // IP地址
  ipAddress: String,
  
  // 用户代理（浏览器信息）
  userAgent: String,
  
  // 引荐来源
  referrer: String,
  
  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// 创建复合索引
activityLogSchema.index({ user: 1, activityType: 1, createdAt: -1 });
activityLogSchema.index({ sessionId: 1, activityType: 1, createdAt: -1 });
activityLogSchema.index({ targetId: 1, activityType: 1, createdAt: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
module.exports = ActivityLog; 