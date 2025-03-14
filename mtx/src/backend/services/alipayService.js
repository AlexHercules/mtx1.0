const AlipaySdk = require('alipay-sdk').default;
const AlipayFormData = require('alipay-sdk/lib/form').default;
const paymentConfig = require('../config/paymentConfig').alipay;

// 初始化支付宝SDK
const alipaySdk = new AlipaySdk({
  appId: paymentConfig.appId,
  privateKey: paymentConfig.privateKey,
  signType: 'RSA2',
  alipayPublicKey: paymentConfig.publicKey,
  gateway: 'https://openapi.alipay.com/gateway.do',
  timeout: 5000
});

// 创建支付宝支付订单
exports.createOrder = async (orderData) => {
  try {
    const { orderId, amount, description, returnUrl } = orderData;
    
    // 创建表单数据
    const formData = new AlipayFormData();
    
    // 设置回调地址
    formData.setMethod('get');
    formData.addField('returnUrl', returnUrl || paymentConfig.returnUrl);
    formData.addField('notifyUrl', paymentConfig.notifyUrl);
    
    // 设置业务参数
    formData.addField('bizContent', {
      outTradeNo: orderId,
      productCode: 'FAST_INSTANT_TRADE_PAY',
      totalAmount: amount.toFixed(2),
      subject: description,
      body: description
    });
    
    // 请求支付宝接口
    const result = await alipaySdk.exec(
      'alipay.trade.page.pay',
      {},
      { formData }
    );
    
    // 返回支付链接
    return {
      paymentType: 'alipay',
      orderId,
      paymentUrl: result
    };
  } catch (error) {
    console.error('支付宝支付下单失败:', error);
    throw error;
  }
};

// 查询订单状态
exports.queryOrder = async (orderId) => {
  try {
    const result = await alipaySdk.exec('alipay.trade.query', {
      bizContent: {
        out_trade_no: orderId
      }
    });
    
    const response = JSON.parse(result);
    const responseData = response.alipay_trade_query_response;
    
    // 检查返回结果
    if (responseData.code !== '10000') {
      throw new Error(responseData.sub_msg || responseData.msg || '查询订单失败');
    }
    
    // 返回订单状态
    return {
      orderId,
      transactionId: responseData.trade_no,
      status: responseData.trade_status,
      amount: parseFloat(responseData.total_amount),
      paidAt: responseData.send_pay_date
    };
  } catch (error) {
    console.error('查询支付宝订单失败:', error);
    throw error;
  }
};

// 验证支付通知
exports.verifyNotification = async (notifyData) => {
  try {
    // 验证签名
    const signVerified = alipaySdk.checkNotifySign(notifyData);
    
    if (!signVerified) {
      return { verified: false, message: '签名验证失败' };
    }
    
    // 检查支付状态
    if (notifyData.trade_status !== 'TRADE_SUCCESS' && notifyData.trade_status !== 'TRADE_FINISHED') {
      return { verified: false, message: '支付未成功' };
    }
    
    // 返回验证结果
    return {
      verified: true,
      orderId: notifyData.out_trade_no,
      transactionId: notifyData.trade_no,
      amount: parseFloat(notifyData.total_amount),
      paidAt: notifyData.gmt_payment
    };
  } catch (error) {
    console.error('验证支付宝通知失败:', error);
    return { verified: false, message: error.message };
  }
}; 