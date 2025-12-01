class PasswordReset {
  constructor() {
    this.currentEmail = '';
    this.expiresAt = null;
    this.timerInterval = null;
    this.validationState = {
      newPassword: { isValid: false, messages: [] },
      confirmPassword: { isValid: false, messages: [] }
    };

    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  initialize() {
    this.initializeEventListeners();
    this.createPasswordToggles();
    this.setupValidationStyles();
    this.setupRealTimeValidation();
  }

  initializeEventListeners() {
    this.setupButtonListener('submitCodeBtn', () => this.sendResetCode());
    this.setupButtonListener('resendCode', () => this.sendResetCode(true));
    this.setupButtonListener('verifyCodeBtn', () => this.verifyCode());
    this.setupButtonListener('resetPasswordBtn', () => this.resetPassword());
    this.setupFormListener('emailStep', () => this.sendResetCode());
    this.setupFormListener('codeStep', () => this.verifyCode());
    this.setupFormListener('passwordResetStep', () => this.resetPassword());
    this.setupRealTimeValidation();
  }

  setupButtonListener(elementId, handler) {
    const element = document.getElementById(elementId);
    if (element) {
      element.addEventListener('click', (e) => {
        e.preventDefault();
        handler();
      });
    }
  }

  setupFormListener(formId, handler) {
    const form = document.getElementById(formId);
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        handler();
      });
    }
  }

  createPasswordToggles() {
    this.createPasswordToggle('newPassword');
    this.createPasswordToggle('confirmPassword');
  }

  createPasswordToggle(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const container = input.parentElement;
    if (!container) return;

    container.classList.add('password-input-container');
    input.classList.add('password-field');
    const existingToggle = container.querySelector('.password-toggle');
    if (existingToggle) existingToggle.remove();

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'password-toggle';
    toggle.setAttribute('aria-label', 'Показать/скрыть пароль');
    toggle.innerHTML = this.getToggleIcon(false);

    toggle.addEventListener('click', () => {
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      toggle.innerHTML = this.getToggleIcon(isHidden);
    });

    container.appendChild(toggle);
  }

  getToggleIcon(isPassword) {
    if (isPassword) {
      return `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            `;
    } else {
      return `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
            `;
    }
  }

  setupValidationStyles() {
    if (document.getElementById('password-reset-validation-styles')) return;

    const styles = `
            <style id="password-reset-validation-styles">
                .password-input-container {
                    position: relative;
                    margin-bottom: 1.5rem;
                }

                .password-toggle {
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #6b7280;
                    padding: 4px;
                    border-radius: 4px;
                    transition: all 0.2s;
                }

                .password-toggle:hover {
                    background: #f3f4f6;
                    color: #374151;
                }

                .password-field {
                    padding-right: 45px !important;
                }

                .validation-summary {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 20px;
                    transition: all 0.3s;
                }

                .validation-summary.valid {
                    background: #f0fdf4;
                    border-color: #bbf7d0;
                }

                .validation-summary.invalid {
                    background: #fef2f2;
                    border-color: #fecaca;
                }

                .validation-title {
                    font-weight: 600;
                    margin-bottom: 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                }

                .validation-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: grid;
                    gap: 6px;
                }

                .validation-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 13px;
                    transition: all 0.2s;
                }

                .validation-item.valid {
                    color: #059669;
                }

                .validation-item.invalid {
                    color: #dc2626;
                }

                .validation-icon {
                    width: 16px;
                    height: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .field-message {
                    position: absolute;
                    bottom: -20px;
                    left: 0;
                    font-size: 12px;
                    opacity: 0;
                    transform: translateY(-5px);
                    transition: all 0.3s;
                    pointer-events: none;
                }

                .field-message.show {
                    opacity: 1;
                    transform: translateY(0);
                }

                .field-message.valid {
                    color: #059669;
                }

                .field-message.invalid {
                    color: #dc2626;
                }

                .form-input.valid {
                    border-color: #10b981 !important;
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
                }

                .form-input.invalid {
                    border-color: #ef4444 !important;
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
                }

                .step {
                    transition: all 0.3s ease;
                }

                .step.hidden {
                    display: none !important;
                }

                .step.active {
                    display: block !important;
                    animation: fadeIn 0.3s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            </style>
        `;

    document.head.insertAdjacentHTML('beforeend', styles);
  }

  setupRealTimeValidation() {
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    if (newPasswordInput) {
      newPasswordInput.addEventListener('input', () => {
        this.validateNewPassword();
        this.validatePasswordMatch();
      });
      newPasswordInput.addEventListener('blur', () => this.validateNewPassword());
    }

    if (confirmPasswordInput) {
      confirmPasswordInput.addEventListener('input', () => this.validatePasswordMatch());
      confirmPasswordInput.addEventListener('blur', () => this.validatePasswordMatch());
    }
  }

  validateNewPassword() {
    const input = document.getElementById('newPassword');
    if (!input) return false;

    const value = input.value;
    const validations = [
      {
        test: value.length >= 8,
        message: 'Не менее 8 символов'
      },
      {
        test: /[a-zA-Zа-яА-Я]/.test(value),
        message: 'Содержит буквы'
      },
      {
        test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?0-9]/.test(value),
        message: 'Содержит цифры или специальные символы'
      }
    ];

    const results = validations.map(validation => ({
      ...validation,
      isValid: validation.test
    }));

    const isValid = results.every(result => result.isValid);

    this.validationState.newPassword = {
      isValid,
      messages: results
    };

    this.updateFieldValidation(input, isValid);
    this.updatePasswordValidationSummary();

    return isValid;
  }

  validatePasswordMatch() {
    const confirmInput = document.getElementById('confirmPassword');
    const newPassword = document.getElementById('newPassword')?.value;

    if (!confirmInput) return false;

    const value = confirmInput.value;
    const isValid = value === newPassword && value.length > 0;

    this.validationState.confirmPassword = {
      isValid,
      messages: [{
        test: isValid,
        message: 'Пароли совпадают',
        isValid
      }]
    };

    this.updateFieldValidation(confirmInput, isValid);
    return isValid;
  }

  updateFieldValidation(input, isValid) {
    input.classList.remove('valid', 'invalid');
    input.classList.add(isValid ? 'valid' : 'invalid');

    this.showFieldMessage(input, isValid ? '✓ Проверка пройдена' : '✕ Исправьте ошибки', isValid);
  }

  showFieldMessage(input, message, isValid) {
    let messageElement = input.parentElement.querySelector('.field-message');

    if (!messageElement) {
      messageElement = document.createElement('div');
      messageElement.className = 'field-message';
      input.parentElement.appendChild(messageElement);
    }

    messageElement.textContent = message;
    messageElement.className = `field-message ${isValid ? 'valid' : 'invalid'}`;
    messageElement.classList.add('show');
    setTimeout(() => {
      messageElement.classList.remove('show');
    }, 3000);
  }

  updatePasswordValidationSummary() {
    const container = document.getElementById('passwordResetStep');
    if (!container) return;

    let summary = container.querySelector('.validation-summary');
    if (!summary) {
      summary = document.createElement('div');
      summary.className = 'validation-summary';
      summary.innerHTML = `
                <div class="validation-title">
                    <span class="validation-icon">📋</span>
                    Требования к паролю:
                </div>
                <ul class="validation-list"></ul>
            `;

      const firstInput = container.querySelector('.form-group');
      if (firstInput) {
        container.insertBefore(summary, firstInput);
      } else {
        container.prepend(summary);
      }
    }

    const allValid = this.validationState.newPassword.messages.every(msg => msg.isValid);
    summary.className = `validation-summary ${allValid ? 'valid' : 'invalid'}`;

    const list = summary.querySelector('.validation-list');
    list.innerHTML = this.validationState.newPassword.messages.map(validation => `
            <li class="validation-item ${validation.isValid ? 'valid' : 'invalid'}">
                <span class="validation-icon">
                    ${validation.isValid ? '✓' : '✕'}
                </span>
                ${validation.message}
            </li>
        `).join('');
  }

  async sendResetCode(isResend = false) {
    const emailInput = document.getElementById('email');
    const submitBtn = document.getElementById('submitCodeBtn');

    if (!emailInput || !submitBtn) {
      this.showNotification('Ошибка: элементы формы не найдены', 'error');
      return;
    }

    const email = emailInput.value.trim();

    if (!this.validateEmail(email)) {
      this.showNotification('Введите корректный email адрес', 'error');
      return;
    }

    await this.executeWithLoading(submitBtn, async () => {
      try {
        const response = await fetch('/api/password-reset/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

          this.showStep('codeStep');
          this.startTimer();
        } else {
          this.showNotification(data.message, 'error');
        }
      } catch (error) {
        console.error('Ошибка:', error);
        this.showNotification('Ошибка при отправке кода', 'error');
      }
    });
  }

  async verifyCode() {
    const codeInput = document.getElementById('code');
    const verifyBtn = document.getElementById('verifyCodeBtn');

    if (!codeInput || !verifyBtn) {
      this.showNotification('Ошибка: элементы формы не найдены', 'error');
      return;
    }

    const code = codeInput.value.trim();

    if (!code || code.length !== 6) {
      this.showNotification('Введите 6-значный код', 'error');
      return;
    }

    await this.executeWithLoading(verifyBtn, async () => {
      try {
        const response = await fetch('/api/password-reset/verify-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: this.currentEmail,
            code: code
          })
        });

        const data = await response.json();

        if (data.success) {
          this.showNotification('Код подтвержден', 'success');
          this.showStep('passwordResetStep');
          const finalCodeInput = document.getElementById('finalCode');
          if (finalCodeInput) {
            finalCodeInput.value = code;
          }
        } else {
          this.showNotification(data.message, 'error');
        }
      } catch (error) {
        console.error('Ошибка:', error);
        this.showNotification('Ошибка при проверке кода', 'error');
      }
    });
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
    const isNewPasswordValid = this.validateNewPassword();
    const isPasswordMatchValid = this.validatePasswordMatch();

    if (!isNewPasswordValid || !isPasswordMatchValid) {
      this.showNotification('Исправьте ошибки в форме пароля', 'error');
      return;
    }

    await this.executeWithLoading(resetBtn, async () => {
      try {
        const response = await fetch('/api/password-reset/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: this.currentEmail,
            code: finalCodeInput.value,
            newPassword: newPasswordInput.value
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
      }
    });
  }

  async executeWithLoading(button, action) {
    const originalText = button.innerHTML;
    button.innerHTML = '<span class="loading">Загрузка...</span>';
    button.disabled = true;

    try {
      await action();
    } finally {
      button.innerHTML = originalText;
      button.disabled = false;
    }
  }

  showStep(stepId) {
    const steps = ['emailStep', 'codeStep', 'passwordResetStep'];
    steps.forEach(step => {
      const element = document.getElementById(step);
      if (element) {
        element.classList.remove('active');
        element.classList.add('hidden');
      }
    });
    const targetStep = document.getElementById(stepId);
    if (targetStep) {
      targetStep.classList.remove('hidden');
      targetStep.classList.add('active');
    }
    const firstInput = targetStep?.querySelector('input');
    if (firstInput) {
      firstInput.focus();
    }
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
      if (timerElement) {
        timerElement.textContent = `Действителен: ${seconds} сек`;
        timerElement.style.color = seconds < 30 ? '#ef4444' : '#059669';
      }
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