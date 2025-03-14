const axios = require('axios');

// 生成随机验证码
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 发送短信验证码
const sendSmsVerification = async (phoneNumber, code) => {
  try {
    // 这里应该集成实际的短信服务提供商API
    // 以下为示例代码，实际使用时需替换为真实的短信服务
    const response = await axios.post('https://api.sms-service.com/send', {
      apiKey: process.env.SMS_API_KEY,
      phoneNumber,
      message: `您的验证码是: ${code}，有效期10分钟，请勿泄露给他人。`
    });
    
    return {
      success: true,
      messageId: response.data.messageId
    };
  } catch (error) {
    console.error('短信发送失败:', error);
    throw new Error('短信发送失败，请稍后再试');
  }
};

// 验证短信验证码
const verifySmsCode = (user, code) => {
  if (!user.phoneVerification || !user.phoneVerification.code) {
    return false;
  }
  
  // 检查验证码是否过期
  if (new Date() > user.phoneVerification.expiresAt) {
    return false;
  }
  
  // 验证码比对
  return user.phoneVerification.code === code;
};

module.exports = {
  generateVerificationCode,
  sendSmsVerification,
  verifySmsCode
}; 