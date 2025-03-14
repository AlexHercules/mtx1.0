const LoginAttempt = require('../models/LoginAttempt');
const geoip = require('geoip-lite');

// 登录成功后的处理
exports.handleLoginSuccess = async (user, req) => {
  try {
    // 清除登录尝试记录
    const identifier = req.body.email || req.body.phoneNumber || req.ip;
    await LoginAttempt.deleteOne({ identifier });
    
    // 获取IP地理位置
    const ip = req.ip;
    const geo = geoip.lookup(ip);
    const location = geo ? `${geo.city}, ${geo.country}` : '未知';
    
    // 记录登录信息
    const device = req.headers['user-agent'];
    await user.addLoginRecord(ip, device, location);
    
    // 生成令牌
    const token = user.generateAuthToken();
    
    return {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        avatar: user.avatar,
        role: user.role
      }
    };
  } catch (error) {
    console.error('登录成功处理失败:', error);
    throw error;
  }
}; 