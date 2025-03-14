// 支付网关配置
module.exports = {
  // 微信支付配置
  wechat: {
    appId: process.env.WECHAT_APP_ID,
    mchId: process.env.WECHAT_MCH_ID,
    apiKey: process.env.WECHAT_API_KEY,
    notifyUrl: process.env.WECHAT_NOTIFY_URL || 'https://api.example.com/api/payments/wechat/notify',
    returnUrl: process.env.WECHAT_RETURN_URL || 'https://example.com/payment/result'
  },
  
  // 支付宝配置
  alipay: {
    appId: process.env.ALIPAY_APP_ID,
    privateKey: process.env.ALIPAY_PRIVATE_KEY,
    publicKey: process.env.ALIPAY_PUBLIC_KEY,
    notifyUrl: process.env.ALIPAY_NOTIFY_URL || 'https://api.example.com/api/payments/alipay/notify',
    returnUrl: process.env.ALIPAY_RETURN_URL || 'https://example.com/payment/result'
  },
  
  // 信用卡支付配置（使用Stripe作为示例）
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publicKey: process.env.STRIPE_PUBLIC_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
  }
}; 