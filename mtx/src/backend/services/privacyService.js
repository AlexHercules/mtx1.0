const PrivacyPolicy = require('../models/PrivacyPolicy');
const UserPrivacySettings = require('../models/UserPrivacySettings');
const User = require('../models/User');

// 获取当前隐私政策
exports.getCurrentPrivacyPolicy = async () => {
  try {
    return await PrivacyPolicy.findOne({ isCurrent: true })
      .populate('createdBy', 'username');
  } catch (error) {
    console.error('获取当前隐私政策失败:', error);
    throw error;
  }
};

// 获取隐私政策历史版本
exports.getPrivacyPolicyHistory = async () => {
  try {
    return await PrivacyPolicy.find()
      .sort({ publishedAt: -1 })
      .populate('createdBy', 'username');
  } catch (error) {
    console.error('获取隐私政策历史版本失败:', error);
    throw error;
  }
};

// 创建新的隐私政策版本
exports.createPrivacyPolicy = async (policyData, creatorId) => {
  try {
    const { version, content, isCurrent } = policyData;
    
    // 如果设置为当前版本，将其他版本设置为非当前
    if (isCurrent) {
      await PrivacyPolicy.updateMany({}, { $set: { isCurrent: false } });
    }
    
    // 创建新的隐私政策
    const privacyPolicy = new PrivacyPolicy({
      version,
      content,
      isCurrent: isCurrent !== undefined ? isCurrent : false,
      publishedAt: new Date(),
      createdBy: creatorId
    });
    
    await privacyPolicy.save();
    
    return privacyPolicy;
  } catch (error) {
    console.error('创建隐私政策失败:', error);
    throw error;
  }
};

// 更新隐私政策
exports.updatePrivacyPolicy = async (version, policyData, updaterId) => {
  try {
    const { content, isCurrent } = policyData;
    
    // 查找隐私政策
    const privacyPolicy = await PrivacyPolicy.findOne({ version });
    
    if (!privacyPolicy) {
      throw new Error(`隐私政策版本 ${version} 不存在`);
    }
    
    // 如果设置为当前版本，将其他版本设置为非当前
    if (isCurrent) {
      await PrivacyPolicy.updateMany({}, { $set: { isCurrent: false } });
    }
    
    // 更新隐私政策
    privacyPolicy.content = content || privacyPolicy.content;
    privacyPolicy.isCurrent = isCurrent !== undefined ? isCurrent : privacyPolicy.isCurrent;
    privacyPolicy.updatedAt = new Date();
    
    await privacyPolicy.save();
    
    return privacyPolicy;
  } catch (error) {
    console.error('更新隐私政策失败:', error);
    throw error;
  }
};

// 获取用户隐私设置
exports.getUserPrivacySettings = async (userId) => {
  try {
    // 查找用户隐私设置
    let privacySettings = await UserPrivacySettings.findOne({ user: userId });
    
    // 如果不存在，创建默认设置
    if (!privacySettings) {
      privacySettings = await this.createDefaultPrivacySettings(userId);
    }
    
    return privacySettings;
  } catch (error) {
    console.error('获取用户隐私设置失败:', error);
    throw error;
  }
};

// 创建默认隐私设置
exports.createDefaultPrivacySettings = async (userId) => {
  try {
    // 获取当前隐私政策版本
    const currentPolicy = await this.getCurrentPrivacyPolicy();
    
    // 创建默认隐私设置
    const privacySettings = new UserPrivacySettings({
      user: userId,
      profileVisibility: 'public',
      showRealName: false,
      showEmail: false,
      showBackedProjects: true,
      showCreatedProjects: true,
      allowEmailContact: true,
      receiveNotifications: true,
      receiveMarketingEmails: false,
      receiveProjectUpdates: true,
      receiveNewsletter: false,
      agreedPrivacyPolicyVersion: currentPolicy ? currentPolicy.version : null,
      privacyPolicyAgreedAt: new Date()
    });
    
    await privacySettings.save();
    
    return privacySettings;
  } catch (error) {
    console.error('创建默认隐私设置失败:', error);
    throw error;
  }
};

// 更新用户隐私设置
exports.updateUserPrivacySettings = async (userId, settingsData) => {
  try {
    // 查找用户隐私设置
    let privacySettings = await UserPrivacySettings.findOne({ user: userId });
    
    // 如果不存在，创建默认设置
    if (!privacySettings) {
      privacySettings = await this.createDefaultPrivacySettings(userId);
    }
    
    // 更新设置
    Object.keys(settingsData).forEach(key => {
      if (key in privacySettings && key !== 'user') {
        privacySettings[key] = settingsData[key];
      }
    });
    
    // 如果更新了隐私政策同意版本，更新同意日期
    if (settingsData.agreedPrivacyPolicyVersion) {
      privacySettings.privacyPolicyAgreedAt = new Date();
    }
    
    await privacySettings.save();
    
    return privacySettings;
  } catch (error) {
    console.error('更新用户隐私设置失败:', error);
    throw error;
  }
};

// 检查用户是否同意最新隐私政策
exports.hasUserAgreedToLatestPolicy = async (userId) => {
  try {
    // 获取当前隐私政策
    const currentPolicy = await this.getCurrentPrivacyPolicy();
    
    if (!currentPolicy) {
      return true; // 如果没有隐私政策，视为已同意
    }
    
    // 获取用户隐私设置
    const privacySettings = await UserPrivacySettings.findOne({ user: userId });
    
    if (!privacySettings) {
      return false;
    }
    
    return privacySettings.agreedPrivacyPolicyVersion === currentPolicy.version;
  } catch (error) {
    console.error('检查用户隐私政策同意状态失败:', error);
    return false;
  }
};

// 匿名化用户数据
exports.anonymizeUserData = async (userId) => {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error(`用户 ${userId} 不存在`);
    }
    
    // 生成匿名用户名
    const anonymousUsername = `deleted_user_${Date.now().toString(36)}`;
    
    // 更新用户数据为匿名
    await User.findByIdAndUpdate(userId, {
      username: anonymousUsername,
      email: `${anonymousUsername}@anonymous.com`,
      password: crypto.randomBytes(16).toString('hex'),
      fullName: 'Deleted User',
      bio: '',
      avatar: null,
      isActive: false,
      isDeleted: true,
      deletedAt: new Date()
    });
    
    // 删除用户隐私设置
    await UserPrivacySettings.findOneAndDelete({ user: userId });
    
    return true;
  } catch (error) {
    console.error('匿名化用户数据失败:', error);
    throw error;
  }
}; 