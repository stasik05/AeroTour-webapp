const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Доступ запрещен. Токен не предоставлен.'
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    req.user = {
      userId: user.userId,
      email: user.userEmail,
      role: user.role?.roleName
    };

    next();
  } catch (error) {
    console.error(' Ошибка авторизации:', error.message);
    res.status(401).json({
      success: false,
      error: 'Невалидный токен'
    });
  }
};

module.exports = authMiddleware;