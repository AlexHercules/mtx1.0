const Comment = require('../models/Comment');
const Project = require('../models/Project');
const User = require('../models/User');
const { sendNotification } = require('../utils/notificationService');

// 添加评论
exports.addComment = async (req, res) => {
  try {
    const { projectId, content, parentCommentId } = req.body;
    
    // 检查项目是否存在
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }
    
    // 检查用户是否有评论权限
    if (!req.user.hasPermission('canComment')) {
      return res.status(403).json({ message: '您没有评论权限' });
    }
    
    // 创建评论
    const comment = new Comment({
      project: projectId,
      user: req.user.id,
      content,
      parentComment: parentCommentId
    });
    
    await comment.save();
    
    // 查询完整的评论信息（包括用户信息）
    const populatedComment = await Comment.findById(comment._id)
      .populate('user', 'username avatar');
    
    // 如果是回复评论，通知原评论作者
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId)
        .populate('user', 'username');
      
      if (parentComment && parentComment.user._id.toString() !== req.user.id) {
        await sendNotification({
          recipient: parentComment.user._id,
          type: 'COMMENT_REPLY',
          title: '有人回复了您的评论',
          message: `${req.user.username} 回复了您在项目 "${project.title}" 中的评论`,
          data: {
            projectId,
            commentId: comment._id
          }
        });
      }
    } else {
      // 如果是新评论，通知项目创建者
      if (project.creator.toString() !== req.user.id) {
        await sendNotification({
          recipient: project.creator,
          type: 'NEW_COMMENT',
          title: '您的项目收到了新评论',
          message: `${req.user.username} 评论了您的项目 "${project.title}"`,
          data: {
            projectId,
            commentId: comment._id
          }
        });
      }
    }
    
    res.status(201).json({
      message: '评论发布成功',
      comment: populatedComment
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取项目评论
exports.getProjectComments = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 20, sort = 'newest' } = req.query;
    
    // 检查项目是否存在
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }
    
    // 构建查询条件
    const query = { 
      project: projectId,
      parentComment: null, // 只获取顶级评论
      isHidden: false // 不显示被隐藏的评论
    };
    
    // 如果是管理员或项目创建者，可以看到隐藏的评论
    if (req.user && (req.user.role === 'admin' || req.user.id === project.creator.toString())) {
      delete query.isHidden;
    }
    
    // 确定排序方式
    let sortOption = {};
    switch (sort) {
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'mostLiked':
        sortOption = { 'likes.length': -1, createdAt: -1 };
        break;
      case 'newest':
      default:
        sortOption = { createdAt: -1 };
    }
    
    // 查询顶级评论
    const comments = await Comment.find(query)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('user', 'username avatar');
    
    // 获取总数
    const total = await Comment.countDocuments(query);
    
    // 获取每个顶级评论的回复
    const commentsWithReplies = await Promise.all(comments.map(async (comment) => {
      const replies = await Comment.find({
        project: projectId,
        parentComment: comment._id,
        isHidden: false
      })
        .sort({ createdAt: 1 })
        .limit(3) // 只获取前3条回复
        .populate('user', 'username avatar');
      
      const repliesCount = await Comment.countDocuments({
        project: projectId,
        parentComment: comment._id,
        isHidden: false
      });
      
      const commentObj = comment.toObject();
      commentObj.replies = replies;
      commentObj.repliesCount = repliesCount;
      
      return commentObj;
    }));
    
    res.json({
      comments: commentsWithReplies,
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

// 获取评论回复
exports.getCommentReplies = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    // 检查评论是否存在
    const parentComment = await Comment.findById(commentId);
    if (!parentComment) {
      return res.status(404).json({ message: '评论不存在' });
    }
    
    // 构建查询条件
    const query = { 
      parentComment: commentId,
      isHidden: false
    };
    
    // 如果是管理员或项目创建者，可以看到隐藏的评论
    const project = await Project.findById(parentComment.project);
    if (req.user && (req.user.role === 'admin' || req.user.id === project.creator.toString())) {
      delete query.isHidden;
    }
    
    // 查询回复
    const replies = await Comment.find(query)
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('user', 'username avatar');
    
    // 获取总数
    const total = await Comment.countDocuments(query);
    
    res.json({
      replies,
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

// 点赞评论
exports.likeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    
    // 检查评论是否存在
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: '评论不存在' });
    }
    
    // 检查用户是否已经点赞
    const alreadyLiked = comment.likes.includes(req.user.id);
    
    if (alreadyLiked) {
      // 取消点赞
      comment.likes = comment.likes.filter(userId => userId.toString() !== req.user.id);
      await comment.save();
      
      return res.json({
        message: '已取消点赞',
        likes: comment.likes.length
      });
    } else {
      // 添加点赞
      comment.likes.push(req.user.id);
      await comment.save();
      
      // 通知评论作者
      if (comment.user.toString() !== req.user.id) {
        await sendNotification({
          recipient: comment.user,
          type: 'COMMENT_LIKE',
          title: '有人点赞了您的评论',
          message: `${req.user.username} 点赞了您的评论`,
          data: {
            projectId: comment.project,
            commentId: comment._id
          }
        });
      }
      
      return res.json({
        message: '点赞成功',
        likes: comment.likes.length
      });
    }
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 隐藏/显示评论（管理员或项目创建者）
exports.toggleCommentVisibility = async (req, res) => {
  try {
    const { commentId } = req.params;
    
    // 检查评论是否存在
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: '评论不存在' });
    }
    
    // 检查权限
    const project = await Project.findById(comment.project);
    if (req.user.role !== 'admin' && req.user.id !== project.creator.toString()) {
      return res.status(403).json({ message: '您没有权限执行此操作' });
    }
    
    // 切换可见性
    comment.isHidden = !comment.isHidden;
    await comment.save();
    
    res.json({
      message: comment.isHidden ? '评论已隐藏' : '评论已显示',
      isHidden: comment.isHidden
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
}; 