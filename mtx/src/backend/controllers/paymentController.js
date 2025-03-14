const Payment = require('../models/Payment');
const Project = require('../models/Project');
const User = require('../models/User');
const { createPaymentOrder, queryPaymentStatus } = require('../utils/paymentGateway');

// 创建支付订单
exports.createPayment = async (req, res) => {
  try {
    const { projectId, rewardTierId, amount, paymentMethod, anonymous, message } = req.body;
    
    // 查找项目
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }
    
    // 检查项目状态
    if (project.status !== 'active') {
      return res.status(400).json({ message: '只能支持活跃状态的项目' });
    }
    
    // 检查项目是否已结束
    if (project.isEnded()) {
      return res.status(400).json({ message: '项目已结束，无法支持' });
    }
    
    // 检查用户是否有支持项目的权限
    if (!req.user.hasPermission('canDonate')) {
      return res.status(403).json({ message: '您没有支持项目的权限' });
    }
    
    // 如果指定了奖励等级，验证奖励等级
    let selectedReward = null;
    if (rewardTierId) {
      selectedReward = project.rewardTiers.id(rewardTierId);
      
      if (!selectedReward) {
        return res.status(404).json({ message: '奖励等级不存在' });
      }
      
      // 检查奖励等级是否已满
      if (selectedReward.maxBackers && selectedReward.currentBackers >= selectedReward.maxBackers) {
        return res.status(400).json({ message: '该奖励等级已满额' });
      }
      
      // 检查支持金额是否满足奖励等级要求
      if (amount < selectedReward.amount) {
        return res.status(400).json({ 
          message: `支持金额不足，该奖励等级至少需要 ${selectedReward.amount} 元` 
        });
      }
    }
    
    // 创建支付记录
    const payment = new Payment({
      user: req.user.id,
      project: projectId,
      rewardTier: rewardTierId,
      amount,
      paymentMethod,
      status: 'pending',
      anonymous: anonymous || false,
      message: message || ''
    });
    
    await payment.save();
    
    // 调用支付网关创建订单
    const paymentOrder = await createPaymentOrder({
      orderId: payment._id.toString(),
      amount,
      description: `支持项目: ${project.title}`,
      paymentMethod,
      returnUrl: `${process.env.FRONTEND_URL}/payment/callback`,
      notifyUrl: `${process.env.API_URL}/payments/notify`
    });
    
    // 更新支付记录的交易ID
    payment.transactionId = paymentOrder.transactionId;
    await payment.save();
    
    res.json({
      message: '支付订单创建成功',
      payment: {
        id: payment._id,
        amount,
        status: payment.status
      },
      paymentUrl: paymentOrder.paymentUrl
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 支付回调通知
exports.paymentNotify = async (req, res) => {
  try {
    const { transactionId, status, sign } = req.body;
    
    // 验证签名（实际实现中需要根据支付网关的要求验证）
    // 此处省略签名验证代码
    
    // 查找支付记录
    const payment = await Payment.findOne({ transactionId });
    
    if (!payment) {
      return res.status(404).json({ message: '支付记录不存在' });
    }
    
    // 如果支付已经处理过，直接返回成功
    if (payment.status !== 'pending') {
      return res.status(200).send('SUCCESS');
    }
    
    // 更新支付状态
    payment.status = status === 'success' ? 'completed' : 'failed';
    await payment.save();
    
    // 如果支付成功，更新项目和用户信息
    if (payment.status === 'completed') {
      // 更新项目资金和支持者
      const project = await Project.findById(payment.project);
      
      // 增加项目资金
      project.currentFunding += payment.amount;
      
      // 添加支持者记录
      project.backers.push({
        user: payment.user,
        amount: payment.amount,
        rewardTier: payment.rewardTier,
        anonymous: payment.anonymous,
        createdAt: new Date()
      });
      
      // 如果选择了奖励等级，增加该等级的支持者数量
      if (payment.rewardTier) {
        const rewardTier = project.rewardTiers.id(payment.rewardTier);
        if (rewardTier) {
          rewardTier.currentBackers += 1;
        }
      }
      
      // 检查项目是否达到目标
      if (project.currentFunding >= project.fundingGoal && project.status === 'active') {
        project.status = 'funded';
      }
      
      await project.save();
      
      // 更新用户的支持项目列表
      await User.findByIdAndUpdate(
        payment.user,
        { $addToSet: { supportedProjects: payment.project } }
      );
    }
    
    res.status(200).send('SUCCESS');
  } catch (error) {
    console.error('支付回调处理错误:', error);
    res.status(500).send('ERROR');
  }
};

// 查询支付状态
exports.getPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    // 查找支付记录
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      return res.status(404).json({ message: '支付记录不存在' });
    }
    
    // 检查权限
    if (payment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '您没有权限查看此支付记录' });
    }
    
    // 如果支付状态是待处理，查询支付网关获取最新状态
    if (payment.status === 'pending') {
      const paymentStatus = await queryPaymentStatus(payment.transactionId);
      
      // 更新支付状态
      if (paymentStatus.status !== 'pending') {
        payment.status = paymentStatus.status === 'success' ? 'completed' : 'failed';
        await payment.save();
        
        // 如果支付成功，更新项目和用户信息
        if (payment.status === 'completed') {
          // 更新项目资金和支持者（与支付回调中的逻辑相同）
          // 此处省略重复代码
        }
      }
    }
    
    res.json({
      payment: {
        id: payment._id,
        project: payment.project,
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取用户的支付历史
exports.getUserPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    // 查询用户的支付记录
    const payments = await Payment.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('project', 'title images')
      .populate('rewardTier');
    
    // 获取总数
    const total = await Payment.countDocuments({ user: req.user.id });
    
    res.json({
      payments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
}; 