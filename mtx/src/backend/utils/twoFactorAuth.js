const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// 生成双因素认证密钥
const generateTwoFactorSecret = async (username) => {
  const secret = speakeasy.generateSecret({
    name: `CrowdfundingApp:${username}`
  });
  
  // 生成QR码URL
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
  
  return {
    secret: secret.base32,
    qrCodeUrl
  };
};

// 验证双因素认证码
const verifyTwoFactorToken = (secret, token) => {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1 // 允许前后1个时间窗口的验证码
  });
};

// 生成备用恢复码
const generateBackupCodes = (count = 10) => {
  const codes = [];
  for (let i = 0; i < count; i++) {
    // 生成8位随机数字字母组合
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }
  return codes;
};

module.exports = {
  generateTwoFactorSecret,
  verifyTwoFactorToken,
  generateBackupCodes
}; 