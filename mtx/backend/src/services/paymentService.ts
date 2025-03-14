/**
 * 创建支付订单
 * 
 * @param {Object} orderData - 订单数据
 * @param {string} orderData.orderId - 订单ID
 * @param {number} orderData.amount - 支付金额
 * @param {string} orderData.description - 订单描述
 * @param {string} orderData.paymentMethod - 支付方式 (alipay|wechat|creditCard)
 * @param {string} [orderData.returnUrl] - 支付完成后的返回URL
 * @returns {Promise<Object>} 支付订单信息
 * @throws {Error} 创建订单失败时抛出错误
 */
export async function createPaymentOrder(orderData: PaymentOrderData): Promise<PaymentOrderResult> {
  try {
    // 根据支付方式选择不同的支付服务
    switch (orderData.paymentMethod) {
      case 'alipay':
        return await alipayService.createOrder(orderData);
      case 'wechat':
        return await wechatPayService.createOrder(orderData);
      case 'creditCard':
        return await stripeService.createPaymentIntent(orderData);
      default:
        throw new Error(`不支持的支付方式: ${orderData.paymentMethod}`);
    }
  } catch (error) {
    logger.error('创建支付订单失败:', error);
    throw new Error(`创建支付订单失败: ${error.message}`);
  }
} 