const managerMiddleware = (req,res,next)=>
{
  try
  {
    if (req.user.role !== 'manager' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Доступ запрещен. Требуются права менеджера.'
      });
    }
    next();
  }
  catch(error)
  {
    console.error('Ошибка проверки роли:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка проверки прав доступа'
    });
  }
};
module.exports = managerMiddleware;