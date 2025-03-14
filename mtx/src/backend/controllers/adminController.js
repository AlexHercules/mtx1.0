const User = require('../models/User');

// 获取所有用户列表
exports.getAllUsers = async (req, res) => {
  try {
    // 检查管理员权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '权限不足' });
    }
    
    const { page = 1, limit = 20, status, role, search } = req.query;
    
    // 构建查询条件
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (role) {
      query.role = role;
    }
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // 分页查询
    const users = await User.find(query)
      .select('-password -twoFactorAuth.secret -phoneVerification')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    // 获取总数
    const total = await User.countDocuments(query);
    
    res.json({
      users,
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

// 更新用户角色和权限
exports.updateUserRole = async (req, res) => {
  try {
    // 检查管理员权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '权限不足' });
    }
    
    const { userId } = req.params;
    const { role, permissions } = req.body;
    
    // 查找用户
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 更新角色
    if (role) {
      user.role = role;
    }
    
    // 更新权限
    if (permissions) {
      user.permissions = {
        ...user.permissions,
        ...permissions
      };
    }
    
    await user.save();
    
    res.json({
      message: '用户角色和权限已更新',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        status: user.status
      }
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 禁用/启用用户账号
exports.updateUserStatus = async (req, res) => {
  try {
    // 检查管理员权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '权限不足' });
    }
    
    const { userId } = req.params;
    const { status, reason } = req.body;
    
    if (!['active', 'suspended', 'deactivated'].includes(status)) {
      return res.status(400).json({ message: '无效的状态值' });
    }
    
    // 查找用户
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 更新状态
    user.status = status;
    
    // 如果是禁用账号，记录原因
    if (status === 'suspended' || status === 'deactivated') {
      user.deactivationRequest = {
        requestedAt: new Date(),
        reason: reason || '管理员操作',
        scheduledDate: status === 'deactivated' ? new Date() : undefined
      };
    } else if (status === 'active') {
      // 如果是激活账号，清除注销请求
      user.deactivationRequest = undefined;
    }
    
    await user.save();
    
    res.json({
      message: `用户状态已更新为 ${status}`,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        status: user.status
      }
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
}; 