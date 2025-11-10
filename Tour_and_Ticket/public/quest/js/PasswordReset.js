class PasswordReset {
  constructor() {
    this.currentEmail = '';
    this.expiresAt = null;
    this.timerInterval = null;

    // Ждем полной загрузки DOM перед инициализацией
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.initializeEventListeners();
      });
    } else {
      this.initializeEventListeners();
    }
  }

  initializeEventListeners() {
    // Используем кнопки вместо форм, так как у вас нет sendCodeForm, verifyCodeForm, resetPasswordForm
    const submitCodeBtn = document.getElementById('submitCodeBtn');
    const resendCode = document.getElementById('resendCode');
    const verifyCodeBtn = document.getElementById('verifyCodeBtn');
    const resetPasswordBtn = document.getElementById('resetPasswordBtn');

    if (submitCodeBtn) {
      submitCodeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.sendResetCode();
      });
    } else {
      console.warn('Элемент submitCodeBtn не найден');
    }

    if (resendCode) {
      resendCode.addEventListener('click', () => {
        this.sendResetCode(true);
      });
    } else {
      console.warn('Элемент resendCode не найден');
    }

    if (verifyCodeBtn) {
      verifyCodeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.verifyCode();
      });
    } else {
      console.warn('Элемент verifyCodeBtn не найден');
    }

    if (resetPasswordBtn) {
      resetPasswordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.resetPassword();
      });
    } else {
      console.warn('Элемент resetPasswordBtn не найден');
    }

    // Также добавляем обработчики submit для форм на случай отправки через Enter
    const emailStep = document.getElementById('emailStep');
    const codeStep = document.getElementById('codeStep');
    const passwordResetStep = document.getElementById('passwordResetStep');

    if (emailStep) {
      emailStep.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendResetCode();
      });
    }

    if (codeStep) {
      codeStep.addEventListener('submit', (e) => {
        e.preventDefault();
        this.verifyCode();
      });
    }

    if (passwordResetStep) {
      passwordResetStep.addEventListener('submit', (e) => {
        e.preventDefault();
        this.resetPassword();
      });
    }
  }

  async sendResetCode(isResend = false) {
    const emailInput = document.getElementById('email');
    const submitBtn = document.getElementById('submitCodeBtn');

    if (!emailInput || !submitBtn) {
      this.showNotification('Ошибка: элементы формы не найдены', 'error');
      return;
    }

    const email = emailInput.value;
    const originalText = submitBtn.innerHTML;

    if (!this.validateEmail(email)) {
      this.showNotification('Введите корректный email', 'error');
      return;
    }

    try {
      submitBtn.innerHTML = '<span class="loading">Отправка...</span>';
      submitBtn.disabled = true;

      const response = await fetch('/api/password-reset/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        this.currentEmail = email;
        this.expiresAt = new Date(data.expiresAt);

        this.showNotification(
          isResend ? 'Код отправлен повторно' : 'Код отправлен на вашу почту',
          'success'
        );

        this.showCodeInputStep();
        this.startTimer();
      } else {
        this.showNotification(data.message, 'error');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      this.showNotification('Ошибка при отправке кода', 'error');
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  }

  async verifyCode() {
    const codeInput = document.getElementById('code');
    const verifyBtn = document.getElementById('verifyCodeBtn');

    if (!codeInput || !verifyBtn) {
      this.showNotification('Ошибка: элементы формы не найдены', 'error');
      return;
    }

    const code = codeInput.value;
    const originalText = verifyBtn.innerHTML;

    if (!code || code.length !== 6) {
      this.showNotification('Введите 6-значный код', 'error');
      return;
    }

    try {
      verifyBtn.innerHTML = '<span class="loading">Проверка...</span>';
      verifyBtn.disabled = true;

      const response = await fetch('/api/password-reset/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: this.currentEmail,
          code: code
        })
      });

      const data = await response.json();

      if (data.success) {
        this.showNotification('Код подтвержден', 'success');
        this.showPasswordResetStep();
      } else {
        this.showNotification(data.message, 'error');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      this.showNotification('Ошибка при проверке кода', 'error');
    } finally {
      verifyBtn.innerHTML = originalText;
      verifyBtn.disabled = false;
    }
  }

  async resetPassword() {
    const finalCodeInput = document.getElementById('finalCode');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const resetBtn = document.getElementById('resetPasswordBtn');

    if (!finalCodeInput || !newPasswordInput || !confirmPasswordInput || !resetBtn) {
      this.showNotification('Ошибка: элементы формы не найдены', 'error');
      return;
    }

    const code = finalCodeInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const originalText = resetBtn.innerHTML;

    if (!code || !newPassword || !confirmPassword) {
      this.showNotification('Все поля обязательны', 'error');
      return;
    }

    if (newPassword.length < 8) {
      this.showNotification('Пароль должен содержать минимум 6 символов', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      this.showNotification('Пароли не совпадают', 'error');
      return;
    }

    try {
      resetBtn.innerHTML = '<span class="loading">Смена пароля...</span>';
      resetBtn.disabled = true;

      const response = await fetch('/api/password-reset/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: this.currentEmail,
          code: code,
          newPassword: newPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        this.showNotification('Пароль успешно изменен!', 'success');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        this.showNotification(data.message, 'error');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      this.showNotification('Ошибка при смене пароля', 'error');
    } finally {
      resetBtn.innerHTML = originalText;
      resetBtn.disabled = false;
    }
  }

  showCodeInputStep() {
    const emailStep = document.getElementById('emailStep');
    const codeStep = document.getElementById('codeStep');
    const codeInput = document.getElementById('code');

    if (emailStep) emailStep.style.display = 'none';
    if (codeStep) codeStep.style.display = 'block';
    if (codeInput) codeInput.focus();
  }

  showPasswordResetStep() {
    const codeStep = document.getElementById('codeStep');
    const passwordResetStep = document.getElementById('passwordResetStep');
    const finalCodeInput = document.getElementById('finalCode');
    const codeInput = document.getElementById('code');
    const newPasswordInput = document.getElementById('newPassword');

    if (codeStep) codeStep.style.display = 'none';
    if (passwordResetStep) passwordResetStep.style.display = 'block';

    if (finalCodeInput && codeInput) {
      finalCodeInput.value = codeInput.value;
    }

    if (newPasswordInput) newPasswordInput.focus();
  }

  startTimer() {
    this.clearTimer();

    const timerElement = document.getElementById('timer');
    const resendBtn = document.getElementById('resendCode');

    if (resendBtn) resendBtn.style.display = 'none';

    this.timerInterval = setInterval(() => {
      const now = new Date();
      const timeLeft = this.expiresAt - now;

      if (timeLeft <= 0) {
        this.clearTimer();
        if (timerElement) timerElement.textContent = 'Код истек';
        if (resendBtn) resendBtn.style.display = 'block';
        return;
      }

      const seconds = Math.floor(timeLeft / 1000);
      if (timerElement) timerElement.textContent = `Действителен: ${seconds} сек`;
    }, 1000);
  }

  clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  showNotification(message, type = 'info')
  {
    let notificationContainer = document.querySelector('.notification-container');
    if (!notificationContainer) {
      notificationContainer = document.createElement('div');
      notificationContainer.className = 'notification-container';
      document.body.appendChild(notificationContainer);
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon material-symbols-outlined">${this.getNotificationIcon(type)}</span>
        <span class="notification-message">${message}</span>
      </div>
    `;

    notificationContainer.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }

  getNotificationIcon(type) {
    const icons = {
      success: 'check_circle',
      error: 'error',
      warning: 'warning',
      info: 'info'
    };
    return icons[type] || 'info';
  }
}
document.addEventListener('DOMContentLoaded', () => {
  new PasswordReset();
});