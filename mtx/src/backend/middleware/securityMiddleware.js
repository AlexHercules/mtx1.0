const securityService = require('../services/securityService');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');

// 基本安全头设置
exports.setupSecurityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'cdn.jsdelivr.net', '*.cloudinary.com'],
      connectSrc: ["'self'", 'api.cloudinary.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"]
    }
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'same-origin' }
});

// XSS防护
exports.preventXSS = xss();

// NoSQL注入防护
exports.preventNoSQLInjection = mongoSanitize();

// API速率限制
exports.apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP限制100个请求
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: '请求过于频繁，请稍后再试'
  },
  skip: (req) => {
    // 跳过某些路径或用户的限制
    return req.path.startsWith('/api/public') || (req.user && req.user.role === 'admin');
  }
});

// 登录速率限制
exports.loginRateLimit = rateLimit({
  windowMs: 30 * 60 * 1000, // 30分钟
  max: 5, // 每个IP限制5次尝试
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: '登录尝试次数过多，请30分钟后再试'
  }
});

// IP阻止检查
exports.checkIPBlocking = async (req, res, next) => {
  try {
    const ipAddress = req.ip;
    
    // 检查IP是否被阻止
    const isBlocked = await securityService.isIPBlocked(ipAddress);
    
    if (isBlocked) {
      // 记录安全日志
      await securityService.logSecurityEvent({
        eventType: 'SUSPICIOUS_ACTIVITY',
        ipAddress,
        userAgent: req.headers['user-agent'],
        details: { path: req.path, method: req.method },
        status: 'BLOCKED'
      });
      
      return res.status(403).json({
        message: '由于多次失败的尝试，您的访问已被暂时阻止。请稍后再试。'
      });
    }
    
    next();
  } catch (error) {
    console.error('IP阻止检查失败:', error);
    next();
  }
};

// 记录API访问
exports.logAPIAccess = async (req, res, next) => {
  try {
    // 只记录敏感操作
    const sensitiveOperations = [
      '/api/users',
      '/api/admin',
      '/api/payments',
      '/api/projects/review'
    ];
    
    const shouldLog = sensitiveOperations.some(path => req.path.startsWith(path));
    
    if (shouldLog) {
      const userId = req.user ? req.user.id : null;
      
      await securityService.logSecurityEvent({
        userId,
        eventType: 'API_ACCESS',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          path: req.path,
          method: req.method,
          query: req.query,
          body: req.method === 'GET' ? undefined : req.body
        },
        status: 'SUCCESS'
      });
    }
    
    next();
  } catch (error) {
    console.error('记录API访问失败:', error);
    next();
  }
}; 