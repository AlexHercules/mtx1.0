const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 可选认证中间件 - 如果有令牌则验证，没有则继续
module.exports = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // 没有令牌，继续但不设置用户
      return next();
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // 验证令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 查找用户
    const user = await User.findById(decoded.id);
    
    if (user) {
      // 将用户信息添加到请求对象
      req.user = user;
      req.token = token;
    }
    
    next();
  } catch (error) {
    // 令牌无效，但仍继续处理请求
    next();
  }
}; 