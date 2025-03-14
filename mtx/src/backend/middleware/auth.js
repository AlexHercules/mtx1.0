const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    // 从请求头获取令牌
    const token = req.header('Authorization').replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: '未提供认证令牌' });
    }
    
    // 验证令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 查找用户
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: '认证失败' });
    }
    
    // 将用户信息添加到请求对象
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    res.status(401).json({ message: '认证失败', error: error.message });
  }
}; 