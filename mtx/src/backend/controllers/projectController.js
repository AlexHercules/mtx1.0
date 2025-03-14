const Project = require('../models/Project');
const User = require('../models/User');
const { uploadToStorage } = require('../utils/fileUpload');

// 创建项目
exports.createProject = async (req, res) => {
  try {
    const {
      title,
      description,
      shortDescription,
      category,
      tags,
      fundingGoal,
      rewardTiers,
      startDate,
      endDate,
      risks,
      location
    } = req.body;
    
    // 检查用户是否有创建项目的权限
    if (!req.user.hasPermission('canCreateProjects')) {
      return res.status(403).json({ message: '您没有创建项目的权限' });
    }
    
    // 创建新项目
    const project = new Project({
      title,
      description,
      shortDescription,
      category,
      tags: tags ? JSON.parse(tags) : [],
      creator: req.user.id,
      fundingGoal,
      rewardTiers: rewardTiers ? JSON.parse(rewardTiers) : [],
      startDate,
      endDate,
      risks,
      location: location ? JSON.parse(location) : {},
      status: 'draft'
    });
    
    await project.save();
    
    // 更新用户的创建项目列表
    await User.findByIdAndUpdate(
      req.user.id,
      { $push: { createdProjects: project._id } }
    );
    
    res.status(201).json({
      message: '项目创建成功',
      project
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取项目详情
exports.getProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const project = await Project.findById(projectId)
      .populate('creator', 'username avatar bio')
      .populate('backers.user', 'username avatar');
    
    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }
    
    // 如果项目是草稿状态，只有创建者可以查看
    if (project.status === 'draft' && (!req.user || req.user.id !== project.creator._id.toString())) {
      return res.status(403).json({ message: '您没有权限查看此项目' });
    }
    
    // 添加项目进度信息
    const projectData = project.toObject();
    projectData.progress = project.getProgressPercentage();
    projectData.remainingDays = project.getRemainingDays();
    projectData.isEnded = project.isEnded();
    
    res.json({ project: projectData });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 更新项目
exports.updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const updateData = req.body;
    
    // 查找项目
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }
    
    // 检查权限
    if (project.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '您没有权限更新此项目' });
    }
    
    // 如果项目已经激活，限制可以更新的字段
    if (project.status !== 'draft' && project.status !== 'pending') {
      const allowedFields = ['faq', 'updates'];
      
      for (const key in updateData) {
        if (!allowedFields.includes(key)) {
          delete updateData[key];
        }
      }
    }
    
    // 处理特殊字段
    if (updateData.tags && typeof updateData.tags === 'string') {
      updateData.tags = JSON.parse(updateData.tags);
    }
    
    if (updateData.rewardTiers && typeof updateData.rewardTiers === 'string') {
      updateData.rewardTiers = JSON.parse(updateData.rewardTiers);
    }
    
    if (updateData.location && typeof updateData.location === 'string') {
      updateData.location = JSON.parse(updateData.location);
    }
    
    // 更新项目
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    res.json({
      message: '项目更新成功',
      project: updatedProject
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 上传项目图片
exports.uploadProjectImage = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ message: '请上传图片' });
    }
    
    // 查找项目
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }
    
    // 检查权限
    if (project.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '您没有权限更新此项目' });
    }
    
    // 上传图片到存储服务
    const imageUrl = await uploadToStorage(req.file);
    const caption = req.body.caption || '';
    
    // 更新项目图片
    project.images.push({ url: imageUrl, caption });
    await project.save();
    
    res.json({
      message: '图片上传成功',
      image: { url: imageUrl, caption }
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 提交项目审核
exports.submitForReview = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // 查找项目
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }
    
    // 检查权限
    if (project.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: '您没有权限提交此项目' });
    }
    
    // 检查项目状态
    if (project.status !== 'draft') {
      return res.status(400).json({ message: '只有草稿状态的项目可以提交审核' });
    }
    
    // 检查必要字段
    const requiredFields = [
      'title', 'description', 'shortDescription', 'category',
      'fundingGoal', 'startDate', 'endDate'
    ];
    
    const missingFields = requiredFields.filter(field => !project[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: '项目信息不完整，请完善以下字段',
        fields: missingFields
      });
    }
    
    // 检查项目是否有至少一个奖励等级
    if (!project.rewardTiers || project.rewardTiers.length === 0) {
      return res.status(400).json({ message: '请添加至少一个支持等级' });
    }
    
    // 检查项目是否有至少一张图片
    if (!project.images || project.images.length === 0) {
      return res.status(400).json({ message: '请上传至少一张项目图片' });
    }
    
    // 更新项目状态为待审核
    project.status = 'pending';
    await project.save();
    
    res.json({
      message: '项目已提交审核',
      project
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 审核项目（管理员功能）
exports.reviewProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { approved, feedback } = req.body;
    
    // 检查管理员权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '您没有权限审核项目' });
    }
    
    // 查找项目
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }
    
    // 检查项目状态
    if (project.status !== 'pending') {
      return res.status(400).json({ message: '只有待审核状态的项目可以审核' });
    }
    
    if (approved) {
      // 如果开始日期是未来日期，设置为待开始状态
      const now = new Date();
      if (new Date(project.startDate) > now) {
        project.status = 'scheduled';
      } else {
        project.status = 'active';
      }
    } else {
      // 拒绝项目，返回草稿状态
      project.status = 'draft';
      
      // 添加审核反馈
      if (feedback) {
        project.reviewFeedback = feedback;
      }
    }
    
    await project.save();
    
    res.json({
      message: approved ? '项目已批准' : '项目已拒绝',
      project
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 添加项目更新
exports.addProjectUpdate = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, content } = req.body;
    
    // 查找项目
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }
    
    // 检查权限
    if (project.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '您没有权限更新此项目' });
    }
    
    // 添加更新
    const update = {
      title,
      content,
      createdAt: new Date()
    };
    
    project.updates.push(update);
    await project.save();
    
    res.json({
      message: '项目更新已添加',
      update
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 添加常见问题
exports.addProjectFAQ = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { question, answer } = req.body;
    
    // 查找项目
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }
    
    // 检查权限
    if (project.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '您没有权限更新此项目' });
    }
    
    // 添加FAQ
    const faq = { question, answer };
    project.faq.push(faq);
    await project.save();
    
    res.json({
      message: '常见问题已添加',
      faq
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 取消项目
exports.cancelProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { reason } = req.body;
    
    // 查找项目
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }
    
    // 检查权限
    if (project.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '您没有权限取消此项目' });
    }
    
    // 检查项目状态
    if (!['active', 'scheduled'].includes(project.status)) {
      return res.status(400).json({ message: '只有活跃或待开始的项目可以取消' });
    }
    
    // 更新项目状态
    project.status = 'canceled';
    project.cancelReason = reason || '项目创建者取消';
    project.canceledAt = new Date();
    
    await project.save();
    
    res.json({
      message: '项目已取消',
      project
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取用户创建的项目
exports.getUserProjects = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    
    // 如果查询其他用户的项目，只返回公开项目
    const query = { creator: userId };
    if (req.user.id !== userId && req.user.role !== 'admin') {
      query.status = { $nin: ['draft', 'pending'] };
    }
    
    const projects = await Project.find(query)
      .sort({ createdAt: -1 });
    
    // 添加项目进度信息
    const projectsWithProgress = projects.map(project => {
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