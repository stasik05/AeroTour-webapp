const jwt = require('jsonwebtoken');
const User = require('../models/User.js');
class AuthController
{
  async register(req, res)
  {
    try
    {
      const{name,lastName,email,password,phone} = req.body;
      if(!name || !lastName||!email||!password)
      {
        return res.status(400).json({
          success:false,
          error: 'Все обязательные поля должны быть заполнены'
        });
      }
      const existingUser =  await User.findByEmail(email);
      if(existingUser)
      {
        return res.status(400).json({
          success:false,
          error: 'Пользователь с таким email уже существует'
        });
      }
      const user = await User.create(
        {
          name,lastName,email,password,phone,role:'client'
        });
      const token = jwt.sign(
        {
          userId: user.userId,
          role: user.role.roleName,
          email:user.userEmail
        },
        process.env.JWT_SECRET,
        {expiresIn: '24h'}
      );
      res.status(201).json({
        success: true,
        message:'Пользователь успешно зарегистрирован',
        token,
        user: user.toJSON()
      });
    }
    catch(error)
    {
      console.error('Ошибка регистрации:',error);
      res.status(500).json(
        {
          success:false,
          error: 'Внутренняя ошибка сервера при регистрации',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
  }
  async login(req,res)
  {
    try
    {
      const {email, password} = req.body;
      if(!email || !password)
      {
        return res.status(400).json({
          success: false,
          error: 'Email и пароль обязательны'
        });
      }
      const user = await User.findByEmail(email);
      if(!user)
      {
        return res.status(400).json({
          success: false,
          error: 'Пользователь с таким email не найден'
        });
      }
      const isPasswordValid = await user.validatePassword(password);
      if(!isPasswordValid)
      {
        return res.status(400).json({
          success: false,
          error: 'Неверный пароль'
        });
      }
      const token = jwt.sign(
        {
          userId:user.userId,
          role:user.role.roleName,
          email:user.userEmail
        },
        process.env.JWT_SECRET,
        {expiresIn: '24h'}
      );
      res.json({
        success: true,
        message: 'Успешный вход в систему',
        token,
        user: user.toJSON()
      });
    }
    catch (error)
    {
      console.error('Ошибка входа:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера при входе'
      });
    }
  }
  async validateToken(req,res)
  {
    try
    {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if(!token)
      {
        return res.status(401).json({
          success:false,
          error: 'Токен не предоставлен'
        });
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET||'fallback-secret');
      const user = await User.findById(decoded.userId);
      if(!user)
      {
        return res.status(401).json({
          success:false,
          error:'Пользователь не найден'
        })
      }
      res.json(
        {
          success:true,
          message: 'Токен валиден',
          user:user.toJSON()
        });
    }
    catch(error)
    {
      res.status(401).json(
        {
          success:false,
          error:'Невалидный токен'
        });
    }
  }
}
module.exports = new AuthController();