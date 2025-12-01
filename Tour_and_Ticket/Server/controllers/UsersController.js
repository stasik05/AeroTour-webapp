const User = require('../models/User');
class UsersController
{
  static async getAllUsers(req, res) {
    try {
      const users = await User.findAll();

      res.json({
        success: true,
        data: users.map(user => user.toJSON())
      });
    } catch (error) {
      console.error('Ошибка при получении пользователей:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка сервера при получении пользователей'
      });
    }
  }
  static async getManagers(req, res) {
    try {
      const managers = await User.findByRole('manager');

      res.json({
        success: true,
        data: managers.map(user => user.toJSON())
      });
    } catch (error) {
      console.error('Ошибка при получении менеджеров:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка сервера при получении менеджеров'
      });
    }
  }

  static async addManager(req, res) {
    try {
      const { name, lastName, email, password, phone } = req.body;
      const userRole = UsersController.getUserRole(req.user);
      if (!req.user || userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Доступ запрещен. Только администратор может добавлять менеджеров'
        });
      }
      if (!name || !lastName || !email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Все обязательные поля должны быть заполнены'
        });
      }
      const userData = {
        name,
        lastName,
        email,
        password,
        phone,
        role: 'manager'
      };

      const user = await User.create(userData);

      res.json({
        success: true,
        data: user.toJSON(),
        message: 'Менеджер успешно добавлен'
      });
    } catch (error) {
      console.error('Ошибка при добавлении менеджера:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async updateManager(req, res) {
    try {
      const { id, name, lastName, phone } = req.body;
      const userRole = UsersController.getUserRole(req.user);
      if (!req.user || userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Доступ запрещен. Только администратор может редактировать менеджеров'
        });
      }
      if (!id || !name || !lastName) {
        return res.status(400).json({
          success: false,
          error: 'ID, имя и фамилия обязательны для заполнения'
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Пользователь не найден'
        });
      }
      const targetUserRole = UsersController.getUserRole(user);
      if (targetUserRole !== 'manager') {
        return res.status(403).json({
          success: false,
          error: 'Можно редактировать только менеджеров'
        });
      }
      user.userName = name;
      user.userLastName = lastName;
      user.userPhone = phone;

      await user.save();

      res.json({
        success: true,
        data: user.toJSON(),
        message: 'Данные менеджера успешно обновлены'
      });
    } catch (error) {
      console.error('Ошибка при обновлении менеджера:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  static getUserRole(user) {
    if (!user) return null;
    if (typeof user.role === 'string') {
      return user.role;
    }
    if (user.role && user.role.name) {
      return user.role.name;
    }
    if (user.role && user.role.roleName) {
      return user.role.roleName;
    }

    return null;
  }
  static async deleteUser(req, res) {
    try {
      const userId = req.params.id;
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Пользователь не аутентифицирован'
        });
      }
      const userRole = req.user.role?.name || req.user.role;
      if (userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Доступ запрещен. Только администратор может удалять пользователей'
        });
      }
      if (parseInt(userId) === req.user.id || parseInt(userId) === req.user.userId) {
        return res.status(400).json({
          success: false,
          error: 'Нельзя удалить свой собственный аккаунт'
        });
      }
      await User.deleteById(userId);
      res.json({
        success: true,
        message: 'Пользователь успешно удален'
      });
    } catch (error) {
      console.error('Ошибка при удалении пользователя:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}
module.exports = UsersController;