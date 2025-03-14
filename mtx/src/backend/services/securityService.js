const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const SecurityLog = require('../models/SecurityLog');
const config = require('../config/config');

// 生成随机令牌
exports.generateRandomToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// 哈希密码
exports.hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// 验证密码
exports.verifyPassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

// 生成JWT令牌
exports.generateJWT = (userId, role = 'user', expiresIn = '7d') => {
  return jwt.sign(
    { id: userId, role },
    config.jwtSecret,
    { expiresIn }
  );
};

// 验证JWT令牌
exports.verifyJWT = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    return null;
  }
};

// 生成重置密码令牌
exports.generatePasswordResetToken = async (userId) => {
  try {
    const resetToken = this.generateRandomToken();
    const resetTokenExpiry = Date.now() + 3600000; // 1小时后过期
    
    await User.findByIdAndUpdate(userId, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetTokenExpiry
    });
    
    return resetToken;
  } catch (error) {
    console.error('生成密码重置令牌失败:', error);
    throw error;
  }
};

// 验证重置密码令牌
exports.verifyPasswordResetToken = async (userId, token) => {
  try {
    const user = await User.findOne({
      _id: userId,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    return !!user;
  } catch (error) {
    console.error('验证密码重置令牌失败:', error);
    return false;
  }
};

// 记录安全日志
exports.logSecurityEvent = async (eventData) => {
  try {
    const {
      userId,
      eventType,
      ipAddress,
      userAgent,
      details,
      status
    } = eventData;
    
    const securityLog = new SecurityLog({
      user: userId,
      eventType,
      ipAddress,
      userAgent,
      details,
      status,
      timestamp: new Date()
    });
    
    await securityLog.save();
    return securityLog;
  } catch (error) {
    console.error('记录安全日志失败:', error);
    // 不抛出异常，确保主流程不受影响
    return null;
  }
};

// 检查IP地址是否被禁止
exports.isIPBlocked = async (ipAddress) => {
  try {
    // 检查最近30分钟内的失败登录尝试
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const failedAttempts = await SecurityLog.countDocuments({
      ipAddress,
      eventType: 'LOGIN_ATTEMPT',
      status: 'FAILED',
      timestamp: { $gt: thirtyMinutesAgo }
    });
    
    // 如果失败尝试超过5次，则阻止
    return failedAttempts >= 5;
  } catch (error) {
    console.error('检查IP阻止状态失败:', error);
    return false;
  }
};

// 检查账户是否被锁定
exports.isAccountLocked = async (userId) => {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      return false;
    }
    
    // 检查账户是否被锁定
    if (user.accountLocked) {
      // 如果锁定时间已过，解锁账户
      if (user.lockUntil && user.lockUntil < Date.now()) {
        await User.findByIdAndUpdate(userId, {
          accountLocked: false,
          lockUntil: null,
          loginAttempts: 0
        });
        return false;
      }
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('检查账户锁定状态失败:', error);
    return false;
  }
};

// 增加登录失败尝试次数
exports.incrementLoginAttempts = async (userId) => {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      return;
    }
    
    // 增加失败尝试次数
    const loginAttempts = user.loginAttempts + 1;
    
    // 如果失败尝试达到阈值，锁定账户
    if (loginAttempts >= 5) {
      await User.findByIdAndUpdate(userId, {
        accountLocked: true,
        lockUntil: Date.now() + 30 * 60 * 1000, // 锁定30分钟
        loginAttempts
      });
    } else {
      await User.findByIdAndUpdate(userId, { loginAttempts });
    }
  } catch (error) {
    console.error('增加登录失败尝试次数失败:', error);
  }
};

// 重置登录失败尝试次数
exports.resetLoginAttempts = async (userId) => {
  try {
    await User.findByIdAndUpdate(userId, {
      loginAttempts: 0,
      accountLocked: false,
      lockUntil: null
    });
  } catch (error) {
    console.error('重置登录失败尝试次数失败:', error);
  }
}; 