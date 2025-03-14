const LoginAttempt = require('../models/LoginAttempt');

// 登录尝试限制中间件
module.exports = async (req, res, next) => {
  try {
    const { email, phoneNumber } = req.body;
    const identifier = email || phoneNumber || req.ip;
    const ip = req.ip;
    
    // 查找该标识符的登录尝试记录
    let loginAttempt = await LoginAttempt.findOne({ identifier });
    
    // 如果没有记录，创建新记录
    if (!loginAttempt) {
      loginAttempt = new LoginAttempt({
        identifier,
        ip,
        attempts: 0,
        locked: false
      });
    }
    
    // 检查是否被锁定
    if (loginAttempt.locked && loginAttempt.lockUntil > new Date()) {
      const remainingTime = Math.ceil((loginAttempt.lockUntil - new Date()) / 1000 / 60);
      return res.status(429).json({
        message: `账号已被临时锁定，请${remainingTime}分钟后再试`,
        lockUntil: loginAttempt.lockUntil
      });
    }
    
    // 如果锁定时间已过，重置尝试次数
    if (loginAttempt.locked && loginAttempt.lockUntil <= new Date()) {
      loginAttempt.locked = false;
      loginAttempt.attempts = 0;
    }
    
    // 增加尝试次数
    loginAttempt.attempts += 1;
    
    // 如果尝试次数超过限制，锁定账号
    if (loginAttempt.attempts >= 5) {
      loginAttempt.locked = true;
      loginAttempt.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 锁定15分钟
      await loginAttempt.save();
      
      return res.status(429).json({
        message: '登录尝试次数过多，账号已被临时锁定15分钟',
        lockUntil: loginAttempt.lockUntil
      });
    }
    
    await loginAttempt.save();
    
    // 将登录尝试记录添加到请求对象，以便后续使用
    req.loginAttempt = loginAttempt;
    
    next();
  } catch (error) {
    next(error);
  }
}; 