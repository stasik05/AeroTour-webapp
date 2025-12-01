const pool = require('../config/database');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

class PasswordResetService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  generateCode() {
    return crypto.randomInt(100000, 999999).toString();
  }

  async createResetCode(email) {
    try {
      await this.deleteExpiredCodes(email);

      const code = this.generateCode();
      const expiresAt = new Date(Date.now() + 120 * 1000);
      const expiresAtMySQL = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

      const [result] = await pool.execute(
        'INSERT INTO password_reset_codes (email, code, expires_at) VALUES (?, ?, ?)',
        [email, code, expiresAtMySQL]
      );

      await this.sendResetCode(email, code);

      return {
        id: result.insertId,
        code,
        expiresAt
      };
    } catch (error) {
      throw new Error(`Ошибка при создании кода восстановления: ${error.message}`);
    }
  }
  async verifyCode(email, code, markAsUsed = false) {
    try {
      const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

      const [rows] = await pool.execute(
        `SELECT * FROM password_reset_codes 
         WHERE email = ? AND code = ? AND used = FALSE AND expires_at > ?`,
        [email, code, currentTime]
      );
      if (rows.length === 0) {
        return null;
      }

      if (markAsUsed) {
        await pool.execute(
          'UPDATE password_reset_codes SET used = TRUE WHERE id = ?',
          [rows[0].id]
        );
      }

      return rows[0];
    } catch (error) {
      console.error('Ошибка при проверке кода:', error);
      throw new Error(`Ошибка при проверке кода: ${error.message}`);
    }
  }

  async deleteExpiredCodes(email = null) {
    try {
      const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

      if (email) {
        await pool.execute(
          'DELETE FROM password_reset_codes WHERE email = ? AND (expires_at <= ? OR used = TRUE)',
          [email, currentTime]
        );
      } else {
        await pool.execute(
          'DELETE FROM password_reset_codes WHERE expires_at <= ? OR used = TRUE',
          [currentTime]
        );
      }
    } catch (error) {
      console.error('Ошибка при удалении просроченных кодов:', error);
    }
  }

  async sendResetCode(email, code) {
    try {
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Код восстановления пароля - AeroTour',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Восстановление пароля AeroTour</h2>
            <p>Вы запросили восстановление пароля для вашего аккаунта.</p>
            <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
              <h3 style="color: #1f2937; font-size: 24px; letter-spacing: 5px; margin: 0;">${code}</h3>
            </div>
            <p>Этот код действителен в течение 2 минут.</p>
            <p>Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 14px;">С уважением,<br>Команда AeroTour</p>
          </div>
        `
      };
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Ошибка при отправке email:', error);
    }
  }

  async checkEmailExists(email) {
    try {
      const User = require('../models/User');
      const user = await User.findByEmail(email);
      return user !== null;
    } catch (error) {
      throw new Error(`Ошибка при проверке email: ${error.message}`);
    }
  }
}

module.exports = new PasswordResetService();