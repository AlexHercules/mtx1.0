const User = require('../models/User');
const crypto = require('crypto');
const { sendEmail } = require('../utils/emailService');
const { 
  generateVerificationCode, 
  sendSmsVerification, 
  verifySmsCode 
} = require('../utils/smsService');
const { handleLoginSuccess } = require('../utils/loginSuccess');

// 用户注册
exports.register = async (req, res) => {
  try {
    const { username, email, password, phoneNumber } = req.body;
    
    // 检查用户是否已存在
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }, { phoneNumber }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: '用户名、邮箱或手机号已被注册' 
      });
    }
    
    // 创建新用户
    const user = new User({
      username,
      email,
      password,
      phoneNumber
    });
    
    await user.save();
    
    // 生成令牌
    const token = user.generateAuthToken();
    
    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 用户登录
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 查找用户
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: '邮箱或密码不正确' });
    }
    
    // 验证密码
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // 记录失败尝试
      if (req.loginAttempt) {
        req.loginAttempt.success = false;
        await req.loginAttempt.save();
      }
      
      return res.status(401).json({ message: '邮箱或密码不正确' });
    }
    
    // 检查账号状态
    if (user.status !== 'active') {
      return res.status(403).json({ message: '账号已被禁用或注销' });
    }
    
    // 处理登录成功
    const loginResult = await handleLoginSuccess(user, req);
    
    res.json({
      message: '登录成功',
      ...loginResult
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 忘记密码
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: '该邮箱未注册' });
    }
    
    // 生成重置令牌
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpires = Date.now() + 3600000; // 1小时有效期
    
    await user.save();
    
    // 发送重置密码邮件
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const message = `
      您收到此邮件是因为您（或其他人）请求重置密码。
      请点击以下链接或将其粘贴到浏览器中以完成重置密码过程：
      ${resetUrl}
      如果您没有请求此操作，请忽略此邮件，您的密码将保持不变。
    `;
    
    await sendEmail({
      email: user.email,
      subject: '密码重置',
      message
    });
    
    res.json({ message: '重置密码邮件已发送' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 重置密码
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    // 哈希令牌
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // 查找有效的重置令牌
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: '无效或过期的令牌' });
    }
    
    // 更新密码
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    
    // 生成新的认证令牌
    const authToken = user.generateAuthToken();
    
    res.json({
      message: '密码已重置',
      token: authToken
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 第三方登录（以微信为例）
exports.wechatAuth = async (req, res) => {
  try {
    const { wechatId, wechatToken, username, email } = req.body;
    
    // 查找是否已有关联账户
    let user = await User.findOne({ 'socialAuth.wechat.id': wechatId });
    
    // 如果没有，创建新用户
    if (!user) {
      user = new User({
        username: username || `wechat_${wechatId.substring(0, 8)}`,
        email: email || `${wechatId}@wechat.user`,
        password: crypto.randomBytes(16).toString('hex'), // 随机密码
        socialAuth: {
          wechat: {
            id: wechatId,
            token: wechatToken
          }
        }
      });
      
      await user.save();
    } else {
      // 更新令牌
      user.socialAuth.wechat.token = wechatToken;
      await user.save();
    }
    
    // 生成JWT令牌
    const token = user.generateAuthToken();
    
    res.json({
      message: '微信登录成功',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 发送手机验证码
exports.sendPhoneVerification = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ message: '请提供手机号码' });
    }
    
    // 查找用户
    let user = await User.findOne({ phoneNumber });
    
    // 如果用户不存在，返回错误
    if (!user) {
      return res.status(404).json({ message: '该手机号未注册' });
    }
    
    // 生成验证码
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟有效期
    
    // 保存验证码到用户记录
    user.phoneVerification = {
      code: verificationCode,
      expiresAt
    };
    
    await user.save();
    
    // 发送验证码短信
    await sendSmsVerification(phoneNumber, verificationCode);
    
    res.json({ 
      message: '验证码已发送',
      expiresAt
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 手机验证码登录
exports.phoneLogin = async (req, res) => {
  try {
    const { phoneNumber, verificationCode } = req.body;
    
    if (!phoneNumber || !verificationCode) {
      return res.status(400).json({ message: '请提供手机号和验证码' });
    }
    
    // 查找用户
    const user = await User.findOne({ phoneNumber });
    
    if (!user) {
      return res.status(404).json({ message: '该手机号未注册' });
    }
    
    // 验证码验证
    const isValid = verifySmsCode(user, verificationCode);
    
    if (!isValid) {
      return res.status(401).json({ message: '验证码无效或已过期' });
    }
    
    // 清除验证码
    user.phoneVerification = undefined;
    
    // 检查账号状态
    if (user.status !== 'active') {
      return res.status(403).json({ message: '账号已被禁用或注销' });
    }
    
    // 记录登录信息
    const ip = req.ip;
    const device = req.headers['user-agent'];
    const location = '未知'; // 实际应用中可以通过IP获取地理位置
    
    await user.addLoginRecord(ip, device, location);
    
    // 生成令牌
    const token = user.generateAuthToken();
    
    res.json({
      message: '登录成功',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        avatar: user.avatar,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
}; 