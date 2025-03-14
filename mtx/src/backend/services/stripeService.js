const stripe = require('stripe')(require('../config/paymentConfig').stripe.secretKey);

// 创建支付意向
exports.createPaymentIntent = async (orderData) => {
  try {
    const { orderId, amount, description, currency = 'cny', customerId } = orderData;
    
    // 创建支付意向
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.floor(amount * 100), // Stripe金额单位为分
      currency: currency.toLowerCase(),
      description,
      metadata: { orderId },
      customer: customerId || undefined,
      setup_future_usage: customerId ? 'off_session' : undefined
    });
    
    return {
      paymentType: 'creditCard',
      orderId,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    };
  } catch (error) {
    console.error('创建信用卡支付意向失败:', error);
    throw error;
  }
};

// 查询支付状态
exports.queryPaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    return {
      paymentIntentId,
      orderId: paymentIntent.metadata.orderId,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      paidAt: paymentIntent.created ? new Date(paymentIntent.created * 1000).toISOString() : null
    };
  } catch (error) {
    console.error('查询信用卡支付状态失败:', error);
    throw error;
  }
};

// 验证Webhook事件
exports.verifyWebhookEvent = async (payload, signature) => {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      require('../config/paymentConfig').stripe.webhookSecret
    );
    
    // 只处理支付成功事件
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      
      return {
        verified: true,
        orderId: paymentIntent.metadata.orderId,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        paidAt: new Date(paymentIntent.created * 1000).toISOString()
      };
    }
    
    return { verified: false, message: '非支付成功事件' };
  } catch (error) {
    console.error('验证Stripe Webhook失败:', error);
    return { verified: false, message: error.message };
  }
};

// 创建客户
exports.createCustomer = async (userData) => {
  try {
    const { email, name, phone } = userData;
    
    const customer = await stripe.customers.create({
      email,
      name,
      phone
    });
    
    return customer.id;
  } catch (error) {
    console.error('创建Stripe客户失败:', error);
    throw error;
  }
};

// 保存支付方式
exports.savePaymentMethod = async (customerId, paymentMethodId) => {
  try {
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId
    });
    
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });
    
    return true;
  } catch (error) {
    console.error('保存支付方式失败:', error);
    throw error;
  }
}; 