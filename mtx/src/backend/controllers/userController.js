const User = require('../models/User');
const { uploadToStorage } = require('../utils/fileUpload');

// 获取用户资料
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('supportedProjects', 'title image fundingGoal currentFunding')
      .populate('createdProjects', 'title image fundingGoal currentFunding');
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 更新用户资料
exports.updateProfile = async (req, res) => {
  try {
    const { username, bio, phoneNumber } = req.body;
    
    // 检查用户名是否已被使用
    if (username) {
      const existingUser = await User.findOne({ 
        username, 
        _id: { $ne: req.user.id } 
      });
      
      if (existingUser) {
        return res.status(400).json({ message: '用户名已被使用' });
      }
    }
    
    // 检查手机号是否已被使用
    if (phoneNumber) {
      const existingUser = await User.findOne({ 
        phoneNumber, 
        _id: { $ne: req.user.id } 
      });
      
      if (existingUser) {
        return res.status(400).json({ message: '手机号已被使用' });
      }
    }
    
    // 更新用户资料
    const updateData = {};
    if (username) updateData.username = username;
    if (bio) updateData.bio = bio;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json({ 
      message: '资料更新成功', 
      user 
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 更新头像
exports.updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请上传头像图片' });
    }
    
    // 上传图片到存储服务
    const avatarUrl = await uploadToStorage(req.file);
    
    // 更新用户头像
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { avatar: avatarUrl } },
      { new: true }
    ).select('-password');
    
    res.json({ 
      message: '头像更新成功', 
      avatar: avatarUrl,
      user
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 更改密码
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // 获取用户
    const user = await User.findById(req.user.id);
    
    // 验证当前密码
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: '当前密码不正确' });
    }
    
    // 更新密码
    user.password = newPassword;
    await user.save();
    
    res.json({ message: '密码更新成功' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 请求账号注销
exports.requestDeactivation = async (req, res) => {
  try {
    const { reason, password } = req.body;
    const user = await User.findById(req.user.id);
    
    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '密码不正确' });
    }
    
    // 设置注销请求
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 30); // 30天后执行注销
    
    user.deactivationRequest = {
      requestedAt: new Date(),
      reason: reason || '用户主动注销',
      scheduledDate
    };
    
    await user.save();
    
    res.json({ 
      message: '注销请求已提交',
      scheduledDate
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 取消账号注销请求
exports.cancelDeactivation = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user.deactivationRequest) {
      return res.status(400).json({ message: '没有待处理的注销请求' });
    }
    
    user.deactivationRequest = undefined;
    await user.save();
    
    res.json({ message: '注销请求已取消' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 导出用户数据
exports.exportUserData = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('supportedProjects', 'title description fundingGoal currentFunding createdAt')
      .populate('createdProjects', 'title description fundingGoal currentFunding createdAt');
    
    // 准备导出数据
    const userData = {
      personalInfo: {
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        bio: user.bio,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      supportedProjects: user.supportedProjects,
      createdProjects: user.createdProjects,
      loginHistory: user.loginHistory
    };
    
    // 记录数据导出操作
    user.loginHistory.push({
      date: new Date(),
      ip: req.ip,
      device: req.headers['user-agent'],
      location: '未知',
      action: 'DATA_EXPORT'
    });
    
    await user.save();
    
    res.json({
      message: '用户数据导出成功',
      data: userData
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
}; 