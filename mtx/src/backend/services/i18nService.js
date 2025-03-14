const Language = require('../models/Language');
const Translation = require('../models/Translation');
const fs = require('fs').promises;
const path = require('path');

// 缓存翻译数据，避免频繁查询数据库
let translationsCache = {};
let languagesCache = [];
let defaultLanguageCode = 'zh-CN'; // 默认语言

// 初始化国际化服务
exports.initialize = async () => {
  try {
    // 加载所有语言
    await loadLanguages();
    
    // 加载所有翻译
    await loadTranslations();
    
    console.log('国际化服务初始化成功');
    return true;
  } catch (error) {
    console.error('国际化服务初始化失败:', error);
    throw error;
  }
};

// 加载所有语言
const loadLanguages = async () => {
  try {
    // 从数据库加载所有启用的语言
    const languages = await Language.find({ isEnabled: true });
    
    // 如果没有语言，初始化默认语言
    if (languages.length === 0) {
      await initializeDefaultLanguages();
      languagesCache = await Language.find({ isEnabled: true });
    } else {
      languagesCache = languages;
    }
    
    // 设置默认语言
    const defaultLanguage = languagesCache.find(lang => lang.isDefault);
    if (defaultLanguage) {
      defaultLanguageCode = defaultLanguage.code;
    }
    
    return languagesCache;
  } catch (error) {
    console.error('加载语言失败:', error);
    throw error;
  }
};

// 初始化默认语言
const initializeDefaultLanguages = async () => {
  try {
    // 默认支持的语言
    const defaultLanguages = [
      {
        code: 'zh-CN',
        name: '简体中文',
        nativeName: '简体中文',
        isDefault: true,
        isEnabled: true,
        direction: 'ltr'
      },
      {
        code: 'en-US',
        name: 'English (US)',
        nativeName: 'English (US)',
        isDefault: false,
        isEnabled: true,
        direction: 'ltr'
      }
    ];
    
    // 创建默认语言
    await Language.insertMany(defaultLanguages);
    
    // 加载默认翻译
    await initializeDefaultTranslations();
    
    return true;
  } catch (error) {
    console.error('初始化默认语言失败:', error);
    throw error;
  }
};

// 初始化默认翻译
const initializeDefaultTranslations = async () => {
  try {
    // 加载默认翻译文件
    const translationsDir = path.join(__dirname, '../data/translations');
    
    // 确保目录存在
    try {
      await fs.mkdir(translationsDir, { recursive: true });
    } catch (err) {
      // 忽略目录已存在的错误
    }
    
    // 加载中文翻译
    const zhTranslationsPath = path.join(translationsDir, 'zh-CN.json');
    let zhTranslations;
    
    try {
      const zhData = await fs.readFile(zhTranslationsPath, 'utf8');
      zhTranslations = JSON.parse(zhData);
    } catch (err) {
      // 如果文件不存在，使用默认翻译
      zhTranslations = {
        common: {
          welcome: '欢迎来到众筹平台',
          login: '登录',
          register: '注册',
          logout: '退出',
          search: '搜索',
          home: '首页'
        },
        project: {
          create: '创建项目',
          edit: '编辑项目',
          delete: '删除项目',
          back: '支持项目',
          share: '分享项目'
        },
        user: {
          profile: '个人资料',
          settings: '设置',
          myProjects: '我的项目',
          myBackings: '我的支持'
        }
      };
      
      // 保存默认翻译文件
      await fs.writeFile(zhTranslationsPath, JSON.stringify(zhTranslations, null, 2), 'utf8');
    }
    
    // 加载英文翻译
    const enTranslationsPath = path.join(translationsDir, 'en-US.json');
    let enTranslations;
    
    try {
      const enData = await fs.readFile(enTranslationsPath, 'utf8');
      enTranslations = JSON.parse(enData);
    } catch (err) {
      // 如果文件不存在，使用默认翻译
      enTranslations = {
        common: {
          welcome: 'Welcome to Crowdfunding Platform',
          login: 'Login',
          register: 'Register',
          logout: 'Logout',
          search: 'Search',
          home: 'Home'
        },
        project: {
          create: 'Create Project',
          edit: 'Edit Project',
          delete: 'Delete Project',
          back: 'Back Project',
          share: 'Share Project'
        },
        user: {
          profile: 'Profile',
          settings: 'Settings',
          myProjects: 'My Projects',
          myBackings: 'My Backings'
        }
      };
      
      // 保存默认翻译文件
      await fs.writeFile(enTranslationsPath, JSON.stringify(enTranslations, null, 2), 'utf8');
    }
    
    // 将翻译导入数据库
    await importTranslationsToDatabase('zh-CN', zhTranslations);
    await importTranslationsToDatabase('en-US', enTranslations);
    
    return true;
  } catch (error) {
    console.error('初始化默认翻译失败:', error);
    throw error;
  }
};

// 将翻译导入数据库
const importTranslationsToDatabase = async (languageCode, translations) => {
  try {
    const translationsToInsert = [];
    
    // 遍历翻译对象，将其扁平化
    const flattenTranslations = (obj, namespace = 'common', prefix = '') => {
      for (const key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          // 如果是对象，递归处理
          flattenTranslations(obj[key], namespace, fullKey);
        } else {
          // 如果是字符串，添加到待插入列表
          translationsToInsert.push({
            languageCode,
            namespace,
            key: fullKey,
            value: obj[key]
          });
        }
      }
    };
    
    // 处理每个命名空间
    for (const namespace in translations) {
      flattenTranslations(translations[namespace], namespace);
    }
    
    // 批量插入翻译
    if (translationsToInsert.length > 0) {
      // 使用upsert操作，避免重复插入
      const bulkOps = translationsToInsert.map(translation => ({
        updateOne: {
          filter: {
            languageCode: translation.languageCode,
            namespace: translation.namespace,
            key: translation.key
          },
          update: translation,
          upsert: true
        }
      }));
      
      await Translation.bulkWrite(bulkOps);
    }
    
    return true;
  } catch (error) {
    console.error('导入翻译到数据库失败:', error);
    throw error;
  }
};

// 加载所有翻译
const loadTranslations = async () => {
  try {
    // 清空缓存
    translationsCache = {};
    
    // 从数据库加载所有翻译
    const translations = await Translation.find();
    
    // 按语言和命名空间组织翻译
    translations.forEach(translation => {
      const { languageCode, namespace, key, value } = translation;
      
      // 确保语言缓存存在
      if (!translationsCache[languageCode]) {
        translationsCache[languageCode] = {};
      }
      
      // 确保命名空间缓存存在
      if (!translationsCache[languageCode][namespace]) {
        translationsCache[languageCode][namespace] = {};
      }
      
      // 将扁平化的键转换为嵌套对象
      const keyParts = key.split('.');
      let current = translationsCache[languageCode][namespace];
      
      for (let i = 0; i < keyParts.length - 1; i++) {
        const part = keyParts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
      
      current[keyParts[keyParts.length - 1]] = value;
    });
    
    return translationsCache;
  } catch (error) {
    console.error('加载翻译失败:', error);
    throw error;
  }
};

// 获取所有支持的语言
exports.getSupportedLanguages = async () => {
  try {
    // 如果缓存为空，重新加载
    if (languagesCache.length === 0) {
      await loadLanguages();
    }
    
    return languagesCache;
  } catch (error) {
    console.error('获取支持的语言失败:', error);
    throw error;
  }
};

// 获取默认语言
exports.getDefaultLanguage = () => {
  return defaultLanguageCode;
};

// 获取特定语言的翻译
exports.getTranslations = async (languageCode, namespace = 'common') => {
  try {
    // 如果缓存为空，重新加载
    if (Object.keys(translationsCache).length === 0) {
      await loadTranslations();
    }
    
    // 如果请求的语言不存在，使用默认语言
    if (!translationsCache[languageCode]) {
      languageCode = defaultLanguageCode;
    }
    
    // 如果请求的命名空间不存在，返回空对象
    if (!translationsCache[languageCode][namespace]) {
      return {};
    }
    
    return translationsCache[languageCode][namespace];
  } catch (error) {
    console.error('获取翻译失败:', error);
    throw error;
  }
};

// 添加或更新翻译
exports.updateTranslation = async (languageCode, namespace, key, value) => {
  try {
    // 更新数据库
    await Translation.updateOne(
      { languageCode, namespace, key },
      { $set: { value, updatedAt: new Date() } },
      { upsert: true }
    );
    
    // 更新缓存
    if (!translationsCache[languageCode]) {
      translationsCache[languageCode] = {};
    }
    
    if (!translationsCache[languageCode][namespace]) {
      translationsCache[languageCode][namespace] = {};
    }
    
    // 将扁平化的键转换为嵌套对象
    const keyParts = key.split('.');
    let current = translationsCache[languageCode][namespace];
    
    for (let i = 0; i < keyParts.length - 1; i++) {
      const part = keyParts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[keyParts[keyParts.length - 1]] = value;
    
    return true;
  } catch (error) {
    console.error('更新翻译失败:', error);
    throw error;
  }
};

// 导出翻译到文件
exports.exportTranslations = async (languageCode) => {
  try {
    // 如果缓存为空，重新加载
    if (Object.keys(translationsCache).length === 0) {
      await loadTranslations();
    }
    
    // 如果请求的语言不存在，使用默认语言
    if (!translationsCache[languageCode]) {
      languageCode = defaultLanguageCode;
    }
    
    // 导出翻译到文件
    const translationsDir = path.join(__dirname, '../data/translations');
    
    // 确保目录存在
    try {
      await fs.mkdir(translationsDir, { recursive: true });
    } catch (err) {
      // 忽略目录已存在的错误
    }
    
    const filePath = path.join(translationsDir, `${languageCode}.json`);
    await fs.writeFile(filePath, JSON.stringify(translationsCache[languageCode], null, 2), 'utf8');
    
    return filePath;
  } catch (error) {
    console.error('导出翻译失败:', error);
    throw error;
  }
};

// 导入翻译从文件
exports.importTranslations = async (languageCode, filePath) => {
  try {
    // 读取文件
    const data = await fs.readFile(filePath, 'utf8');
    const translations = JSON.parse(data);
    
    // 导入翻译到数据库
    await importTranslationsToDatabase(languageCode, translations);
    
    // 重新加载翻译
    await loadTranslations();
    
    return true;
  } catch (error) {
    console.error('导入翻译失败:', error);
    throw error;
  }
};

// 添加新语言
exports.addLanguage = async (languageData) => {
  try {
    const { code, name, nativeName, isDefault, direction = 'ltr' } = languageData;
    
    // 检查语言是否已存在
    const existingLanguage = await Language.findOne({ code });
    if (existingLanguage) {
      throw new Error(`语言 ${code} 已存在`);
    }
    
    // 如果设置为默认语言，将其他语言设置为非默认
    if (isDefault) {
      await Language.updateMany({}, { $set: { isDefault: false } });
    }
    
    // 创建新语言
    const newLanguage = new Language({
      code,
      name,
      nativeName,
      isDefault,
      isEnabled: true,
      direction
    });
    
    await newLanguage.save();
    
    // 重新加载语言
    await loadLanguages();
    
    return newLanguage;
  } catch (error) {
    console.error('添加语言失败:', error);
    throw error;
  }
};

// 更新语言
exports.updateLanguage = async (code, languageData) => {
  try {
    const { name, nativeName, isDefault, isEnabled, direction } = languageData;
    
    // 检查语言是否存在
    const language = await Language.findOne({ code });
    if (!language) {
      throw new Error(`语言 ${code} 不存在`);
    }
    
    // 如果设置为默认语言，将其他语言设置为非默认
    if (isDefault) {
      await Language.updateMany({}, { $set: { isDefault: false } });
    }
    
    // 更新语言
    language.name = name || language.name;
    language.nativeName = nativeName || language.nativeName;
    language.isDefault = isDefault !== undefined ? isDefault : language.isDefault;
    language.isEnabled = isEnabled !== undefined ? isEnabled : language.isEnabled;
    language.direction = direction || language.direction;
    
    await language.save();
    
    // 重新加载语言
    await loadLanguages();
    
    return language;
  } catch (error) {
    console.error('更新语言失败:', error);
    throw error;
  }
};

// 删除语言
exports.deleteLanguage = async (code) => {
  try {
    // 检查语言是否存在
    const language = await Language.findOne({ code });
    if (!language) {
      throw new Error(`语言 ${code} 不存在`);
    }
    
    // 不允许删除默认语言
    if (language.isDefault) {
      throw new Error('不能删除默认语言');
    }
    
    // 删除语言
    await Language.deleteOne({ code });
    
    // 删除该语言的所有翻译
    await Translation.deleteMany({ languageCode: code });
    
    // 重新加载语言和翻译
    await loadLanguages();
    await loadTranslations();
    
    return true;
  } catch (error) {
    console.error('删除语言失败:', error);
    throw error;
  }
}; 