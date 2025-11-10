const User = require("../models/User.js");
const path = require("path");
const fs = require("fs");
class ProfileController
{
  async getProfile(req, res) {
    try {
      const userId = req.user.userId;
      console.log('🔄 Получение профиля для UserID:', userId);

      if (!userId) {
        console.log('❌ UserID не определен');
        return res.status(400).json({
          success: false,
          error: 'UserID не определен'
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        console.log('❌ Пользователь не найден в БД');
        return res.status(404).json({
          success: false,
          error: 'Пользователь не найден'
        });
      }

      console.log('✅ Профиль найден:', user.userEmail);
      res.json({
        success: true,
        user: user.toJSON()
      });

    } catch (error) {
      console.error('❌ Ошибка получения профиля:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка сервера'
      });
    }
  }
  async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      console.log('🔄 Обновление профиля для пользователя:', userId);
      console.log('📦 Полный req.body:', req.body);
      console.log('👤 User из middleware:', req.user);

      const { name, lastName, phone } = req.body;
      console.log('📝 Полученные данные:', { name, lastName, phone });

      if (!userId) {
        console.log('❌ UserID не определен');
        return res.status(400).json({
          success: false,
          error: 'UserID не определен'
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        console.log('❌ Пользователь не найден в БД');
        return res.status(404).json({
          success: false,
          error: 'Пользователь не найден'
        });
      }

      console.log('📊 Текущие данные пользователя:', {
        name: user.userName,
        lastName: user.userLastName,
        phone: user.userPhone
      });

      // Обновляем поля
      let changesMade = false;

      if (name !== undefined && name !== user.userName) {
        console.log(`✏️ Изменение имени: "${user.userName}" -> "${name}"`);
        user.userName = name;
        changesMade = true;
      }

      if (lastName !== undefined && lastName !== user.userLastName) {
        console.log(`✏️ Изменение фамилии: "${user.userLastName}" -> "${lastName}"`);
        user.userLastName = lastName;
        changesMade = true;
      }

      if (phone !== undefined && phone !== user.userPhone) {
        console.log(`✏️ Изменение телефона: "${user.userPhone}" -> "${phone}"`);
        user.userPhone = phone;
        changesMade = true;
      }

      if (!changesMade) {
        console.log('ℹ️  Изменений нет, пропускаем сохранение');
        return res.json({
          success: true,
          message: 'Данные не изменились',
          user: user.toJSON()
        });
      }

      console.log('💾 Сохранение пользователя в БД...');
      const saveResult = await user.save();
      console.log('✅ Результат сохранения:', saveResult);

      // Получаем обновленные данные из БД для проверки
      const updatedUser = await User.findById(userId);
      console.log('🔍 Проверка обновленных данных в БД:', {
        name: updatedUser.userName,
        lastName: updatedUser.userLastName,
        phone: updatedUser.userPhone
      });

      res.json({
        success: true,
        message: 'Профиль успешно обновлен',
        user: updatedUser.toJSON()
      });

    } catch (error) {
      console.error('❌ Ошибка обновления профиля:', error);
      console.error('🔍 Stack trace:', error.stack);
      res.status(500).json({
        success: false,
        error: 'Ошибка сервера при обновлении профиля',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  async uploadPhoto(req,res)
  {
    try
    {
      const userId = req.user.userId;
      if(!req.file)
      {
        return res.status(400).json({
          success: false,
          error: 'Файл не загружен'
        });
      }
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Пользователь не найден'
        });
      }
      const photoPath = `/uploads/profiles/${req.file.filename}`;
      user.userPhoto = photoPath;
      await user.save();
      res.json({
        success: true,
        message: 'Фото успешно загружено',
        photoUrl: photoPath
      });
    }
    catch (error)
    {
      console.error('Ошибка загрузки фото:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка сервера'
      });
    }
  }
  async changePassword(req,res)
  {
    try
    {
      const userId = req.user.userId;
      const {currentPassword,newPassword} = req.body;
      const user = await User.findById(userId);
      if(!user)
      {
        return res.status(404).json(
          {
            success:false,
            message:'Пользователь не найден'
          });
      }
      const isCurrentPasswordValid = await user.validatePassword(currentPassword);
      if (!isCurrentPasswordValid)
      {
        return res.status(400).json({
          success: false,
          error: 'Текущий пароль неверен'
        });
      }
      await user.changePassword(newPassword);
      res.json({
        success: true,
        message: 'Пароль успешно изменен'
      });
    }catch(error)
    {
      console.error('Ошибка смены пароля:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка сервера'
      });
    }
  }
}
module.exports = new ProfileController();