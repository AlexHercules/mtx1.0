const User = require('../models/User');
const { 
  generateTwoFactorSecret, 
  verifyTwoFactorToken,
  generateBackupCodes
} = require('../utils/twoFactorAuth');

// 设置双因素认证
exports.setupTwoFactor = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // 生成新的双因素认证密钥
    const { secret, qrCodeUrl } = await generateTwoFactorSecret(user.username);
    
    // 生成备用恢复码
    const backupCodes = generateBackupCodes();
    
    // 更新用户记录，但不启用双因素认证
    user.twoFactorAuth = {
      enabled: false,
      secret,
      backupCodes
    };
    
    await user.save();
    
    res.json({
      message: '双因素认证设置准备就绪',
      secret,
      qrCodeUrl,
      backupCodes
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 验证并启用双因素认证
exports.enableTwoFactor = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user.twoFactorAuth || !user.twoFactorAuth.secret) {
      return res.status(400).json({ message: '请先设置双因素认证' });
    }
    
    // 验证令牌
    const isValid = verifyTwoFactorToken(user.twoFactorAuth.secret, token);
    
    if (!isValid) {
      return res.status(401).json({ message: '验证码无效' });
    }
    
    // 启用双因素认证
    user.twoFactorAuth.enabled = true;
    await user.save();
    
    res.json({ 
      message: '双因素认证已启用',
      backupCodes: user.twoFactorAuth.backupCodes
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 禁用双因素认证
exports.disableTwoFactor = async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findById(req.user.id);
    
    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '密码不正确' });
    }
    
    // 如果启用了双因素认证，需要验证令牌
    if (user.twoFactorAuth && user.twoFactorAuth.enabled) {
      const isValid = verifyTwoFactorToken(user.twoFactorAuth.secret, token);
      
      if (!isValid) {
        return res.status(401).json({ message: '验证码无效' });
      }
    }
    
    // 禁用双因素认证
    user.twoFactorAuth = {
      enabled: false,
      secret: undefined,
      backupCodes: []
    };
    
    await user.save();
    
    res.json({ message: '双因素认证已禁用' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 使用备用码验证
exports.verifyBackupCode = async (req, res) => {
  try {
    const { backupCode, email } = req.body;
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    if (!user.twoFactorAuth || !user.twoFactorAuth.enabled) {
      return res.status(400).json({ message: '该账号未启用双因素认证' });
    }
    
    // 验证备用码
    const codeIndex = user.twoFactorAuth.backupCodes.indexOf(backupCode);
    
    if (codeIndex === -1) {
      return res.status(401).json({ message: '备用码无效' });
    }
    
    // 移除已使用的备用码
    user.twoFactorAuth.backupCodes.splice(codeIndex, 1);
    await user.save();
    
    // 生成认证令牌
    const token = user.generateAuthToken();
    
    res.json({
      message: '验证成功',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
}; 