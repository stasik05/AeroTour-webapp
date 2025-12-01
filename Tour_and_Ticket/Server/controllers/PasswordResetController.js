const PasswordResetService = require('./PasswordResetService');
const User = require('../models/User');

class PasswordResetController {
  async sendResetCode(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email обязателен'
        });
      }

      const emailExists = await PasswordResetService.checkEmailExists(email);
      if (!emailExists) {
        return res.status(404).json({
          success: false,
          message: 'Пользователь с таким email не найден'
        });
      }

      const resetCode = await PasswordResetService.createResetCode(email);

      res.json({
        success: true,
        message: 'Код восстановления отправлен на email',
        expiresAt: resetCode.expiresAt
      });

    } catch (error) {
      console.error('Ошибка при отправке кода:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async verifyCode(req, res) {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({
          success: false,
          message: 'Email и код обязательны'
        });
      }
      const verifiedCode = await PasswordResetService.verifyCode(email, code, false);
      if (!verifiedCode) {
        return res.status(400).json({
          success: false,
          message: 'Неверный или просроченный код'
        });
      }

      res.json({
        success: true,
        message: 'Код подтвержден'
      });

    } catch (error) {
      console.error('Ошибка при проверке кода:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async resetPassword(req, res) {
    try {
      const { email, code, newPassword } = req.body;

      if (!email || !code || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Все поля обязательны'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Пароль должен содержать минимум 6 символов'
        });
      }
      const verifiedCode = await PasswordResetService.verifyCode(email, code, true);
      if (!verifiedCode) {
        return res.status(400).json({
          success: false,
          message: 'Неверный или просроченный код'
        });
      }

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Пользователь не найден'
        });
      }

      await user.changePassword(newPassword);

      res.json({
        success: true,
        message: 'Пароль успешно изменен'
      });

    } catch (error) {
      console.error('Ошибка при смене пароля:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new PasswordResetController();