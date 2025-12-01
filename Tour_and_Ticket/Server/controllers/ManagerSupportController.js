const pool = require('../config/database');

class ManagerSupportController {
  async getTickets(req, res) {
    try {
      const { status = 'all', page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = '';
      let params = [];

      if (status !== 'all') {
        whereClause = 'WHERE f.status = ?';
        params = [status];
      }

      const query = `
                SELECT 
                    f.id,
                    f.user_id,
                    u.name as user_name,
                    u.last_name as user_last_name,
                    u.email as user_email,
                    u.photo as user_photo,
                    f.manager_id,
                    m.name as manager_name,
                    m.photo as manager_photo,
                    f.message as initial_message,
                    f.created_at,
                    f.status,
                    f.updated_at,
                    (SELECT COUNT(*) FROM chat_messages WHERE feedback_id = f.id) as message_count,
                    (SELECT message_text FROM chat_messages 
                     WHERE feedback_id = f.id 
                     ORDER BY created_at DESC 
                     LIMIT 1) as last_message,
                    (SELECT created_at FROM chat_messages 
                     WHERE feedback_id = f.id 
                     ORDER BY created_at DESC 
                     LIMIT 1) as last_message_time
                FROM feedback f
                LEFT JOIN users u ON f.user_id = u.id
                LEFT JOIN users m ON f.manager_id = m.id
                ${whereClause}
                ORDER BY 
                    CASE WHEN f.status = 'open' THEN 1 
                         WHEN f.status = 'answered' THEN 2 
                         ELSE 3 END,
                    COALESCE(last_message_time, f.updated_at) DESC
                LIMIT ? OFFSET ?
            `;

      const parsedLimit = parseInt(limit) || 20;
      const parsedOffset = parseInt(offset) || 0;
      const [tickets] = await pool.execute(query, [
        ...params,
        parsedLimit.toString(),
        parsedOffset.toString()
      ]);

      const countQuery = status !== 'all'
        ? 'SELECT COUNT(*) as total FROM feedback WHERE status = ?'
        : 'SELECT COUNT(*) as total FROM feedback';

      const countParams = status !== 'all' ? [status] : [];
      const [countResult] = await pool.execute(countQuery, countParams);

      res.json({
        success: true,
        tickets: tickets.map(ticket => ({
          id: ticket.id,
          userId: ticket.user_id,
          userName: `${ticket.user_name} ${ticket.user_last_name}`,
          userEmail: ticket.user_email,
          userPhoto: ticket.user_photo,
          managerId: ticket.manager_id,
          managerName: ticket.manager_name,
          managerPhoto: ticket.manager_photo,
          initialMessage: ticket.initial_message,
          lastMessage: ticket.last_message,
          createdAt: ticket.created_at,
          updatedAt: ticket.updated_at,
          status: ticket.status,
          messageCount: ticket.message_count,
          lastMessageTime: ticket.last_message_time
        })),
        pagination: {
          page: parseInt(page),
          limit: parsedLimit,
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / parsedLimit)
        }
      });
    } catch (error) {
      console.error('Ошибка получения обращений:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении списка обращений'
      });
    }
  }

  async getChat(req, res) {
    try {
      const { userId } = req.params;
      const managerId = req.user.userId;
      const [managerInfo] = await pool.execute(
        'SELECT id, name, last_name, email, photo FROM users WHERE id = ?',
        [managerId]
      );

      const [userInfo] = await pool.execute(
        'SELECT id, name, last_name, email, photo FROM users WHERE id = ?',
        [userId]
      );

      if (userInfo.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Пользователь не найден'
        });
      }

      const [tickets] = await pool.execute(
        `SELECT id, message, created_at, status 
       FROM feedback 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 1`,
        [userId]
      );

      let feedbackId;
      let initialMessage = '';
      if (tickets.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'У пользователя нет обращений'
        });
      } else {
        feedbackId = tickets[0].id;
        initialMessage = tickets[0].message;
      }

      const [messages] = await pool.execute(
        `SELECT 
        cm.id,
        cm.feedback_id,
        cm.user_id,
        cm.manager_id,
        cm.message_text,
        cm.is_from_manager,
        cm.created_at,
        u.name as user_name,
        u.last_name as user_last_name,
        u.photo as user_photo,
        m.name as manager_name,
        m.last_name as manager_last_name,
        m.photo as manager_photo
      FROM chat_messages cm
      LEFT JOIN users u ON cm.user_id = u.id
      LEFT JOIN users m ON cm.manager_id = m.id
      WHERE cm.feedback_id = ?
      ORDER BY cm.created_at ASC`,
        [feedbackId]
      );

      const chatMessages = [];
      if (initialMessage) {
        chatMessages.push({
          id: 'initial_' + feedbackId,
          feedbackId: feedbackId,
          userId: parseInt(userId),
          userName: `${userInfo[0].name} ${userInfo[0].last_name}`,
          userPhoto: userInfo[0].photo,
          message: initialMessage,
          isFromManager: false,
          createdAt: tickets[0].created_at
        });
      }

      messages.forEach(msg => {
        chatMessages.push({
          id: msg.id,
          feedbackId: msg.feedback_id,
          userId: msg.user_id,
          managerId: msg.manager_id,
          userName: msg.is_from_manager ?
            `${msg.manager_name} ${msg.manager_last_name}` :
            `${msg.user_name} ${msg.user_last_name}`,
          userPhoto: msg.is_from_manager ? msg.manager_photo : msg.user_photo,
          message: msg.message_text,
          isFromManager: msg.is_from_manager,
          createdAt: msg.created_at
        });
      });

      if (tickets[0].status === 'open') {
        await pool.execute(
          'UPDATE feedback SET status = "answered", manager_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [managerId, feedbackId]
        );
      }

      res.json({
        success: true,
        user: {
          id: userInfo[0].id,
          name: `${userInfo[0].name} ${userInfo[0].last_name}`,
          email: userInfo[0].email,
          photo: userInfo[0].photo
        },
        manager: {
          id: managerInfo[0].id,
          name: `${managerInfo[0].name} ${managerInfo[0].last_name}`,
          email: managerInfo[0].email,
          photo: managerInfo[0].photo
        },
        feedbackId: feedbackId,
        messages: chatMessages
      });

    } catch (error) {
      console.error('Ошибка получения чата:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении истории чата'
      });
    }
  }
  async sendMessage(req, res) {
    try {
      const { userId, message, feedbackId } = req.body;
      const managerId = req.user.userId;
      if (!userId || !message) {
        return res.status(400).json({
          success: false,
          error: 'ID пользователя и сообщение обязательны'
        });
      }
      if (!feedbackId) {
        return res.status(400).json({
          success: false,
          error: 'ID обращения обязателен'
        });
      }
      const [ticket] = await pool.execute(
        'SELECT id FROM feedback WHERE id = ? AND user_id = ?',
        [feedbackId, userId]
      );

      if (ticket.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Обращение не найдено'
        });
      }
      const [messageResult] = await pool.execute(
        `INSERT INTO chat_messages 
                 (feedback_id, user_id, manager_id, message_text, is_from_manager, created_at) 
                 VALUES (?, ?, ?, ?, TRUE, CURRENT_TIMESTAMP)`,
        [feedbackId, userId, managerId, message]
      );
      await pool.execute(
        'UPDATE feedback SET status = "answered", manager_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [managerId, feedbackId]
      );
      res.json({
        success: true,
        message: 'Сообщение отправлено',
        feedbackId: feedbackId,
        messageId: messageResult.insertId
      });
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при отправке сообщения'
      });
    }
  }
  async closeTicket(req, res) {
    try {
      const { ticketId } = req.params;
      const [result] = await pool.execute(
        'UPDATE feedback SET status = "closed", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [ticketId]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'Обращение не найдено'
        });
      }
      res.json({
        success: true,
        message: 'Обращение закрыто'
      });
    } catch (error) {
      console.error('Ошибка закрытия обращения:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при закрытии обращения'
      });
    }
  }
  async getClientChat(req,res)
  {
    try
    {
      const userId = req.user.userId;
      const [userInfo] = await pool.execute(
        'SELECT id, name, last_name, email, photo FROM users WHERE id = ?',
        [userId]
      );
      if (userInfo.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Пользователь не найден'
        });
      }
      const [tickets] = await pool.execute(
        `SELECT id, message, created_at, status, manager_id 
         FROM feedback 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [userId]
      );

      let feedbackId;
      let initialMessage = '';

      if (tickets.length === 0) {
        const [newTicket] = await pool.execute(
          'INSERT INTO feedback (user_id, message, status) VALUES (?, ?, ?)',
          [userId, 'Новое обращение в поддержку', 'open']
        );
        feedbackId = newTicket.insertId;
        initialMessage = 'Новое обращение в поддержку';
      } else {
        feedbackId = tickets[0].id;
        initialMessage = tickets[0].message;
      }
      let managerInfo = null;
      if (tickets.length > 0 && tickets[0].manager_id) {
        const [managerData] = await pool.execute(
          'SELECT id, name, last_name, email, photo FROM users WHERE id = ?',
          [tickets[0].manager_id]
        );
        if (managerData.length > 0) {
          managerInfo = {
            id: managerData[0].id,
            name: `${managerData[0].name} ${managerData[0].last_name}`,
            email: managerData[0].email,
            photo: managerData[0].photo
          };
        }
      }
      const [messages] = await pool.execute(
        `SELECT 
          cm.id,
          cm.feedback_id,
          cm.user_id,
          cm.manager_id,
          cm.message_text,
          cm.is_from_manager,
          cm.created_at,
          u.name as user_name,
          u.last_name as user_last_name,
          u.photo as user_photo,
          m.name as manager_name,
          m.last_name as manager_last_name,
          m.photo as manager_photo
        FROM chat_messages cm
        LEFT JOIN users u ON cm.user_id = u.id
        LEFT JOIN users m ON cm.manager_id = m.id
        WHERE cm.feedback_id = ?
        ORDER BY cm.created_at ASC`,
        [feedbackId]
      );

      const chatMessages = [];
      if (initialMessage && initialMessage !== 'Новое обращение в поддержку') {
        chatMessages.push({
          id: 'initial_' + feedbackId,
          feedbackId: feedbackId,
          userId: parseInt(userId),
          userName: `${userInfo[0].name} ${userInfo[0].last_name}`,
          userPhoto: userInfo[0].photo,
          message: initialMessage,
          isFromManager: false,
          createdAt: tickets[0].created_at
        });
      }
      messages.forEach(msg => {
        chatMessages.push({
          id: msg.id,
          feedbackId: msg.feedback_id,
          userId: msg.user_id,
          managerId: msg.manager_id,
          userName: msg.is_from_manager ?
            `${msg.manager_name} ${msg.manager_last_name}` :
            `${msg.user_name} ${msg.user_last_name}`,
          userPhoto: msg.is_from_manager ? msg.manager_photo : msg.user_photo,
          message: msg.message_text,
          isFromManager: msg.is_from_manager,
          createdAt: msg.created_at
        });
      });

      res.json({
        success: true,
        user: {
          id: userInfo[0].id,
          name: `${userInfo[0].name} ${userInfo[0].last_name}`,
          email: userInfo[0].email,
          photo: userInfo[0].photo
        },
        manager: managerInfo,
        feedbackId: feedbackId,
        messages: chatMessages
      });
    }
    catch (error) {
      console.error('Ошибка получения чата клиента:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении истории чата'
      });
    }
  }
  async sendClientMessage(req, res) {
    try {
      const { message, feedbackId } = req.body;
      const userId = req.user.userId;

      if (!message) {
        return res.status(400).json({
          success: false,
          error: 'Сообщение обязательно'
        });
      }

      let actualFeedbackId = feedbackId;
      if (!actualFeedbackId) {
        const [newTicket] = await pool.execute(
          'INSERT INTO feedback (user_id, message, status) VALUES (?, ?, ?)',
          [userId, message, 'open']
        );
        actualFeedbackId = newTicket.insertId;
      } else {
        const [ticket] = await pool.execute(
          'SELECT id FROM feedback WHERE id = ? AND user_id = ?',
          [actualFeedbackId, userId]
        );

        if (ticket.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Обращение не найдено'
          });
        }
      }
      const [messageResult] = await pool.execute(
        `INSERT INTO chat_messages 
         (feedback_id, user_id, message_text, is_from_manager, created_at) 
         VALUES (?, ?, ?, FALSE, CURRENT_TIMESTAMP)`,
        [actualFeedbackId, userId, message]
      );
      await pool.execute(
        'UPDATE feedback SET status = "open", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [actualFeedbackId]
      );

      res.json({
        success: true,
        message: 'Сообщение отправлено',
        feedbackId: actualFeedbackId,
        messageId: messageResult.insertId
      });

    } catch (error) {
      console.error('Ошибка отправки сообщения клиента:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при отправке сообщения'
      });
    }
  }

  async getManagerInfo(req, res) {
    try {
      const [managers] = await pool.execute(
        `SELECT u.id, u.name, u.last_name, u.photo 
         FROM users u 
         WHERE u.role_id = (SELECT id FROM roles WHERE name = 'manager')
         ORDER BY RAND() 
         LIMIT 1`
      );

      if (managers.length === 0) {
        return res.json({
          success: true,
          manager: null
        });
      }

      res.json({
        success: true,
        manager: {
          id: managers[0].id,
          name: `${managers[0].name} ${managers[0].last_name}`,
          photo: managers[0].photo
        }
      });

    } catch (error) {
      console.error('Ошибка получения информации о менеджере:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении информации о менеджере'
      });
    }
  }
  async getStats(req, res) {
    try {
      const [statusStats] = await pool.execute(
        `SELECT 
                    status,
                    COUNT(*) as count
                FROM feedback
                GROUP BY status`
      );
      
      const [managerStats] = await pool.execute(
        `SELECT COUNT(*) as count
                 FROM users
                 WHERE role_id = (SELECT id FROM roles WHERE name = 'manager')`
      );
      const [todayStats] = await pool.execute(
        `SELECT COUNT(*) as count 
                 FROM chat_messages 
                 WHERE DATE(created_at) = CURDATE()`
      );
      const [totalMessages] = await pool.execute(
        'SELECT COUNT(*) as count FROM chat_messages'
      );

      const stats = {
        open: 0,
        answered: 0,
        closed: 0,
        total_managers: managerStats[0].count,
        today_messages: todayStats[0].count,
        total_messages: totalMessages[0].count
      };

      statusStats.forEach(stat => {
        stats[stat.status] = stat.count;
      });

      res.json({
        success: true,
        stats: stats
      });
    } catch (error) {
      console.error('Ошибка получения статистики:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении статистики'
      });
    }
  }
}

module.exports = new ManagerSupportController();