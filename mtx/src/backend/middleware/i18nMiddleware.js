const i18nService = require('../services/i18nService');

// 国际化中间件
module.exports = async (req, res, next) => {
  try {
    // 获取请求中的语言代码
    let languageCode = req.headers['accept-language'] || 
                       req.query.lang || 
                       req.cookies.lang || 
                       i18nService.getDefaultLanguage();
    
    // 如果语言代码包含多个选项，取第一个
    if (languageCode.includes(',')) {
      languageCode = languageCode.split(',')[0].trim();
    }
    
    // 如果语言代码包含权重，去掉权重部分
    if (languageCode.includes(';')) {
      languageCode = languageCode.split(';')[0].trim();
    }
    
    // 获取支持的语言列表
    const supportedLanguages = await i18nService.getSupportedLanguages();
    const supportedLanguageCodes = supportedLanguages.map(lang => lang.code);
    
    // 检查请求的语言是否被支持
    if (!supportedLanguageCodes.includes(languageCode)) {
      // 如果不支持，尝试匹配语言的主要部分（如zh-CN -> zh）
      const mainLanguage = languageCode.split('-')[0];
      const matchedLanguage = supportedLanguageCodes.find(code => code.startsWith(mainLanguage));
      
      if (matchedLanguage) {
        languageCode = matchedLanguage;
      } else {
        // 如果仍然不匹配，使用默认语言
        languageCode = i18nService.getDefaultLanguage();
      }
    }
    
    // 将语言代码添加到请求对象
    req.languageCode = languageCode;
    
    // 添加翻译函数到请求对象
    req.t = async (key, namespace = 'common', defaultValue = key) => {
      try {
        const translations = await i18nService.getTranslations(languageCode, namespace);
        
        // 处理嵌套键（如 'user.profile.title'）
        const keyParts = key.split('.');
        let value = translations;
        
        for (const part of keyParts) {
          if (value && typeof value === 'object' && part in value) {
            value = value[part];
          } else {
            return defaultValue;
          }
        }
        
        return typeof value === 'string' ? value : defaultValue;
      } catch (error) {
        console.error('翻译失败:', error);
        return defaultValue;
      }
    };
    
    // 添加获取当前语言的函数
    req.getCurrentLanguage = () => {
      return supportedLanguages.find(lang => lang.code === languageCode);
    };
    
    // 设置响应头
    res.set('Content-Language', languageCode);
    
    // 如果语言是从请求参数中获取的，设置cookie
    if (req.query.lang && req.query.lang === languageCode) {
      res.cookie('lang', languageCode, { 
        maxAge: 365 * 24 * 60 * 60 * 1000, // 一年
        httpOnly: true,
        sameSite: 'lax'
      });
    }
    
    next();
  } catch (error) {
    console.error('国际化中间件错误:', error);
    // 出错时不阻止请求继续
    next();
  }
}; 