const axios = require('axios');
const crypto = require('crypto');
const xml2js = require('xml2js');
const paymentConfig = require('../config/paymentConfig').wechat;

// XML转JS对象
const parseXML = async (xml) => {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xml, { trim: true, explicitArray: false }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

// JS对象转XML
const buildXML = (obj) => {
  const builder = new xml2js.Builder({ rootName: 'xml', cdata: true, headless: true });
  return builder.buildObject(obj);
};

// 生成随机字符串
const generateNonceStr = () => {
  return Math.random().toString(36).substr(2, 15);
};

// 生成签名
const generateSign = (params) => {
  // 按字母顺序排序参数
  const sortedParams = Object.keys(params).sort().reduce((result, key) => {
    if (params[key] !== undefined && params[key] !== '' && key !== 'sign') {
      result[key] = params[key];
    }
    return result;
  }, {});
  
  // 构建签名字符串
  let signStr = '';
  for (const key in sortedParams) {
    signStr += `${key}=${sortedParams[key]}&`;
  }
  signStr += `key=${paymentConfig.apiKey}`;
  
  // 计算MD5签名
  return crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();
};

// 创建微信支付订单
exports.createOrder = async (orderData) => {
  try {
    const { orderId, amount, description, clientIp, openid } = orderData;
    
    // 构建请求参数
    const params = {
      appid: paymentConfig.appId,
      mch_id: paymentConfig.mchId,
      nonce_str: generateNonceStr(),
      body: description,
      out_trade_no: orderId,
      total_fee: Math.floor(amount * 100), // 微信支付金额单位为分
      spbill_create_ip: clientIp,
      notify_url: paymentConfig.notifyUrl,
      trade_type: openid ? 'JSAPI' : 'NATIVE', // 有openid使用JSAPI，否则使用扫码支付
    };
    
    // 如果是JSAPI支付，需要传入openid
    if (openid) {
      params.openid = openid;
    }
    
    // 生成签名
    params.sign = generateSign(params);
    
    // 构建XML请求
    const requestXML = buildXML(params);
    
    // 发送请求到微信支付API
    const response = await axios.post(
      'https://api.mch.weixin.qq.com/pay/unifiedorder',
      requestXML,
      { headers: { 'Content-Type': 'text/xml' } }
    );
    
    // 解析响应XML
    const responseData = await parseXML(response.data);
    const responseObj = responseData.xml;
    
    // 检查返回结果
    if (responseObj.return_code !== 'SUCCESS' || responseObj.result_code !== 'SUCCESS') {
      throw new Error(responseObj.return_msg || responseObj.err_code_des || '微信支付下单失败');
    }
    
    // 根据支付类型返回不同的结果
    if (params.trade_type === 'NATIVE') {
      // 扫码支付，返回二维码链接
      return {
        paymentType: 'wechat',
        orderId,
        qrCodeUrl: responseObj.code_url,
        prepayId: responseObj.prepay_id
      };
    } else {
      // JSAPI支付，返回支付参数
      const jsapiParams = {
        appId: paymentConfig.appId,
        timeStamp: Math.floor(Date.now() / 1000).toString(),
        nonceStr: generateNonceStr(),
        package: `prepay_id=${responseObj.prepay_id}`,
        signType: 'MD5'
      };
      
      jsapiParams.paySign = generateSign(jsapiParams);
      
      return {
        paymentType: 'wechat',
        orderId,
        jsapiParams,
        prepayId: responseObj.prepay_id
      };
    }
  } catch (error) {
    console.error('微信支付下单失败:', error);
    throw error;
  }
};

// 查询订单状态
exports.queryOrder = async (orderId) => {
  try {
    // 构建请求参数
    const params = {
      appid: paymentConfig.appId,
      mch_id: paymentConfig.mchId,
      out_trade_no: orderId,
      nonce_str: generateNonceStr()
    };
    
    // 生成签名
    params.sign = generateSign(params);
    
    // 构建XML请求
    const requestXML = buildXML(params);
    
    // 发送请求到微信支付API
    const response = await axios.post(
      'https://api.mch.weixin.qq.com/pay/orderquery',
      requestXML,
      { headers: { 'Content-Type': 'text/xml' } }
    );
    
    // 解析响应XML
    const responseData = await parseXML(response.data);
    const responseObj = responseData.xml;
    
    // 检查返回结果
    if (responseObj.return_code !== 'SUCCESS') {
      throw new Error(responseObj.return_msg || '查询订单失败');
    }
    
    // 返回订单状态
    return {
      orderId,
      transactionId: responseObj.transaction_id,
      status: responseObj.trade_state,
      amount: responseObj.total_fee ? parseInt(responseObj.total_fee) / 100 : 0,
      paidAt: responseObj.time_end
    };
  } catch (error) {
    console.error('查询微信支付订单失败:', error);
    throw error;
  }
};

// 验证支付通知
exports.verifyNotification = async (notifyData) => {
  try {
    // 解析XML通知数据
    const notifyObj = (await parseXML(notifyData)).xml;
    
    // 验证签名
    const sign = notifyObj.sign;
    delete notifyObj.sign;
    const calculatedSign = generateSign(notifyObj);
    
    if (calculatedSign !== sign) {
      return { verified: false, message: '签名验证失败' };
    }
    
    // 检查支付结果
    if (notifyObj.return_code !== 'SUCCESS' || notifyObj.result_code !== 'SUCCESS') {
      return { 
        verified: false, 
        message: notifyObj.return_msg || notifyObj.err_code_des || '支付失败' 
      };
    }
    
    // 返回验证结果
    return {
      verified: true,
      orderId: notifyObj.out_trade_no,
      transactionId: notifyObj.transaction_id,
      amount: parseInt(notifyObj.total_fee) / 100,
      paidAt: notifyObj.time_end
    };
  } catch (error) {
    console.error('验证微信支付通知失败:', error);
    return { verified: false, message: error.message };
  }
}; 