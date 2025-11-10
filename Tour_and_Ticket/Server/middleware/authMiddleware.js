const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      console.log('❌ Токен не предоставлен');
      return res.status(401).json({
        success: false,
        error: 'Доступ запрещен. Токен не предоставлен.'
      });
    }

    console.log('🔐 Проверка токена:', token.substring(0, 20) + '...');

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    console.log('✅ Токен валиден. UserID:', decoded.userId);

    const user = await User.findById(decoded.userId);
    if (!user) {
      console.log('❌ Пользователь не найден в БД');
      return res.status(401).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    console.log('✅ Пользователь авторизован:', user.userEmail);

    req.user = {
      userId: user.userId,
      email: user.userEmail,
      role: user.role?.roleName
    };

    next();
  } catch (error) {
    console.error('❌ Ошибка авторизации:', error.message);
    res.status(401).json({
      success: false,
      error: 'Невалидный токен'
    });
  }
};

module.exports = authMiddleware;