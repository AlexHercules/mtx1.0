const axios = require('axios');
const crypto = require('crypto');

// 支付网关配置
const gatewayConfig = {
  apiUrl: process.env.PAYMENT_GATEWAY_URL,
  merchantId: process.env.PAYMENT_MERCHANT_ID,
  secretKey: process.env.PAYMENT_SECRET_KEY
};

// 生成签名
const generateSign = (params, secretKey) => {
  // 按字母顺序排序参数
  const sortedParams = Object.keys(params).sort().reduce((result, key) => {
    result[key] = params[key];
    return result;
  }, {});
  
  // 构建签名字符串
  let signStr = '';
  for (const key in sortedParams) {
    if (sortedParams[key] !== undefined && sortedParams[key] !== null) {
      signStr += `${key}=${sortedParams[key]}&`;
    }
  }
  signStr += `key=${secretKey}`;
  
  // 计算MD5签名
  return crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();
};

// 创建支付订单
exports.createPaymentOrder = async (orderData) => {
  try {
    const { orderId, amount, description, paymentMethod, returnUrl, notifyUrl } = orderData;
    
    // 构建请求参数
    const params = {
      merchant_id: gatewayConfig.merchantId,
      out_trade_no: orderId,
      total_amount: amount.toFixed(2),
      subject: description,
      payment_type: paymentMethod,
      return_url: returnUrl,
      notify_url: notifyUrl,
      timestamp: Math.floor(Date.now() / 1000)
    };
    
    // 生成签名
    params.sign = generateSign(params, gatewayConfig.secretKey);
    
    // 发送请求到支付网关
    const response = await axios.post(`${gatewayConfig.apiUrl}/create_order`, params);
    
    if (response.data.code !== 0) {
      throw new Error(`支付网关错误: ${response.data.message}`);
    }
    
    return {
      transactionId: response.data.data.transaction_id,
      paymentUrl: response.data.data.payment_url
    };
  } catch (error) {
    console.error('创建支付订单失败:', error);
    throw error;
  }
};

// 查询支付状态
exports.queryPaymentStatus = async (transactionId) => {
  try {
    // 构建请求参数
    const params = {
      merchant_id: gatewayConfig.merchantId,
      transaction_id: transactionId,
      timestamp: Math.floor(Date.now() / 1000)
    };
    
    // 生成签名
    params.sign = generateSign(params, gatewayConfig.secretKey);
    
    // 发送请求到支付网关
    const response = await axios.post(`${gatewayConfig.apiUrl}/query_order`, params);
    
    if (response.data.code !== 0) {
      throw new Error(`支付网关错误: ${response.data.message}`);
    }
    
    return {
      status: response.data.data.trade_status,
      amount: response.data.data.total_amount,
      paidAt: response.data.data.pay_time
    };
  } catch (error) {
    console.error('查询支付状态失败:', error);
    throw error;
  }
}; 