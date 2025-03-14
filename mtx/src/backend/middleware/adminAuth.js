module.exports = (req, res, next) => {
  // 检查用户角色是否为管理员
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: '需要管理员权限' });
  }
}; 