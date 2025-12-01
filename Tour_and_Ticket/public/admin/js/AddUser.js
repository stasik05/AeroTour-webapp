class AddUser {
  constructor() {
    this.currentUser = null;
    this.isInitialized = false;
  }
  async init() {
    await this.loadUserData();
    if (!this.checkAuth()) {
      console.log('Пользователь не авторизован, перенаправление...');
      window.location.href = '/login';
      return;
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.initializeApp();
      });
    } else {
      this.initializeApp();
    }
  }
  async loadUserData() {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        this.currentUser = JSON.parse(userData);
        this.updateUserInfo();
      }
    } catch (error) {
      console.error('Ошибка загрузки данных пользователя:', error);
    }
  }
  updateUserInfo() {
    if (this.currentUser && this.currentUser.photo) {
      const avatar = document.querySelector('.user-avatar');
      if (avatar) {
        avatar.src = this.currentUser.photo;
      }
    }
  }
  checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) {
      console.log('Токен или пользователь не найдены в localStorage');
      return false;
    }
    try {
      const userData = JSON.parse(user);
      const userRole = userData.role?.name || userData.role;
      const isAdmin = userRole === 'admin';

      if (!isAdmin) {
        console.log('Доступ запрещен: требуется роль администратора');
        return false;
      }

      return true;
    } catch (e) {
      console.error('Ошибка парсинга данных пользователя:', e);
      return false;
    }
  }

  async initializeApp() {
    try {
      this.addStyles();
      this.setupEventListeners();
      this.isInitialized = true;
    } catch (error) {
      console.error('Ошибка инициализации добавления пользователя:', error);
      this.showError('Не удалось инициализировать форму');
    }
  }
  addStyles() {
    if (document.querySelector('#add-user-styles')) {
      return;
    }

    const styles = `
      <style id="add-user-styles">
        .form-group {
          position: relative;
          margin-bottom: 2rem !important;
          min-height: 80px;
        }
        .password-input-container {
          position: relative;
        }
        .password-toggle {
          position: absolute;
          right: 12px;
          top: 65%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }
        .password-toggle:hover {
          color: #374151;
        }
        .password-toggle svg {
          width: 18px;
          height: 18px;
        }
        .form-input.password-field {
          padding-right: 40px;
        }
        .form-input.error {
          border-color: #e74c3c !important;
          box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.1) !important;
        }
        .form-input.success {
          border-color: #10b981 !important;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1) !important;
        }
        .validation-messages {
          position: absolute;
          bottom: -20px;
          left: 0;
          right: 0;
          height: 20px;
          pointer-events: none;
        }
        .error-message {
          color: #e74c3c;
          font-size: 12px;
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          opacity: 0;
          transform: translateY(-5px);
          transition: all 0.3s ease;
        }
        .error-message.show {
          opacity: 1;
          transform: translateY(0);
        }
        .success-message {
          color: #10b981;
          font-size: 12px;
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          opacity: 0;
          transform: translateY(-5px);
          transition: all 0.3s ease;
        }
        .success-message.show {
          opacity: 1;
          transform: translateY(0);
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
  }

  setupEventListeners() {
    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
      addUserForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }
    this.createPasswordToggle('password');
    this.setupValidation();
  }
  setupValidation() {
    const nameInput = document.getElementById('name');
    const lastNameInput = document.getElementById('lastName');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const phoneInput = document.getElementById('phone');
    this.createMessageContainers();
    if (nameInput) {
      nameInput.addEventListener('blur', () => this.validateName(nameInput));
      nameInput.addEventListener('input', () => this.clearFieldMessage(nameInput));
    }
    if (lastNameInput) {
      lastNameInput.addEventListener('blur', () => this.validateName(lastNameInput, 'фамилия'));
      lastNameInput.addEventListener('input', () => this.clearFieldMessage(lastNameInput));
    }
    if (emailInput) {
      emailInput.addEventListener('blur', () => this.validateEmail(emailInput));
      emailInput.addEventListener('input', () => this.clearFieldMessage(emailInput));
    }
    if (passwordInput) {
      passwordInput.addEventListener('blur', () => this.validatePassword(passwordInput));
      passwordInput.addEventListener('input', () => this.clearFieldMessage(passwordInput));
    }
    if (phoneInput) {
      phoneInput.addEventListener('blur', () => this.validatePhone(phoneInput));
      phoneInput.addEventListener('input', () => this.clearFieldMessage(phoneInput));
    }
  }
  createMessageContainers() {
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
      const formGroup = input.closest('.form-group');
      if (formGroup && !formGroup.querySelector('.validation-messages')) {
        const messagesContainer = document.createElement('div');
        messagesContainer.className = 'validation-messages';
        formGroup.appendChild(messagesContainer);
      }
    });
  }
  validateName(input, fieldName = 'имя') {
    const value = input.value.trim();
    this.clearFieldMessage(input);
    if (!value) {
      return true;
    }

    const russianNameRegex = /^[А-ЯЁа-яё]+$/;
    if (!russianNameRegex.test(value)) {
      this.showFieldMessage(input, 'error', `${fieldName} должно содержать только русские буквы`);
      return false;
    }
    if (value.split(' ').length > 1) {
      this.showFieldMessage(input, 'error', `${fieldName} должно быть одним словом`);
      return false;
    }
    this.showFieldMessage(input, 'success', `✓ ${fieldName} корректно`);
    return true;
  }
  validateEmail(input) {
    const value = input.value.trim();
    this.clearFieldMessage(input);
    if (!value) {
      return true;
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value)) {
      this.showFieldMessage(input, 'error', 'Введите корректный email адрес');
      return false;
    }
    this.showFieldMessage(input, 'success', '✓ Email корректный');
    return true;
  }
  validatePassword(input) {
    const value = input.value;
    this.clearFieldMessage(input);
    if (!value) {
      return true;
    }
    if (value.length < 8) {
      this.showFieldMessage(input, 'error', 'Пароль должен содержать не менее 6 символов');
      return false;
    }
    const hasLetter = /[a-zA-Zа-яА-Я]/.test(value);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?0-9]/.test(value);
    if (!hasLetter || !hasSpecialChar) {
      this.showFieldMessage(input, 'error', 'Пароль должен содержать буквы и специальные символы/цифры');
      return false;
    }
    this.showFieldMessage(input, 'success', '✓ Пароль надежный');
    return true;
  }
  validatePhone(input) {
    const value = input.value.trim();
    this.clearFieldMessage(input);
    if (!value) {
      return true;
    }
    const phoneRegex = /^\+375(25|29|33|44|17)\d{7}$/;
    if (!phoneRegex.test(value)) {
      this.showFieldMessage(input, 'error', 'Формат телефона: +375XXXXXXXXX (Беларусь)');
      return false;
    }
    this.showFieldMessage(input, 'success', '✓ Телефон корректный');
    return true;
  }
  validateAllFields() {
    const nameInput = document.getElementById('name');
    const lastNameInput = document.getElementById('lastName');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const phoneInput = document.getElementById('phone');
    let isValid = true;
    if (!nameInput.value.trim()) {
      this.showFieldMessage(nameInput, 'error', 'Имя обязательно для заполнения');
      isValid = false;
    } else if (!this.validateName(nameInput)) {
      isValid = false;
    }
    if (!lastNameInput.value.trim()) {
      this.showFieldMessage(lastNameInput, 'error', 'Фамилия обязательна для заполнения');
      isValid = false;
    } else if (!this.validateName(lastNameInput, 'фамилия')) {
      isValid = false;
    }
    if (!emailInput.value.trim()) {
      this.showFieldMessage(emailInput, 'error', 'Email обязателен для заполнения');
      isValid = false;
    } else if (!this.validateEmail(emailInput)) {
      isValid = false;
    }
    if (!passwordInput.value) {
      this.showFieldMessage(passwordInput, 'error', 'Пароль обязателен для заполнения');
      isValid = false;
    } else if (!this.validatePassword(passwordInput)) {
      isValid = false;
    }
    if (phoneInput.value.trim() && !this.validatePhone(phoneInput)) {
      isValid = false;
    }
    return isValid;
  }
  showFieldMessage(input, type, message) {
    this.clearFieldMessage(input);
    input.classList.remove('error', 'success');
    if (type === 'error') {
      input.classList.add('error');
    } else if (type === 'success') {
      input.classList.add('success');
    }
    const formGroup = input.closest('.form-group');
    const messagesContainer = formGroup?.querySelector('.validation-messages');
    if (messagesContainer) {
      const messageElement = document.createElement('div');
      messageElement.className = `${type}-message`;
      messageElement.textContent = message;
      messagesContainer.appendChild(messageElement);
      setTimeout(() => {
        messageElement.classList.add('show');
      }, 10);
    }
  }
  clearFieldMessage(input) {
    input.classList.remove('error', 'success');
    const formGroup = input.closest('.form-group');
    const messagesContainer = formGroup?.querySelector('.validation-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = '';
    }
  }
  createPasswordToggle(inputId) {
    const passwordInput = document.getElementById(inputId);
    if (!passwordInput) return;
    const container = passwordInput.parentNode;
    container.classList.add('password-input-container');
    passwordInput.classList.add('password-field');
    const existingToggle = container.querySelector('.password-toggle');
    if (existingToggle) {
      existingToggle.remove();
    }
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'password-toggle';
    toggle.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
      </svg>
    `;
    toggle.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      toggle.innerHTML = isPassword ? `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m9.02 9.02l3.29 3.29m-3.29-3.29l-3.29-3.29"/>
        </svg>
      ` : `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
        </svg>
      `;
    });
    container.appendChild(toggle);
  }
  async handleFormSubmit(e) {
    e.preventDefault();
    if (!this.validateAllFields()) {
      this.showError('Пожалуйста, исправьте ошибки в форме', 'error');
      return;
    }
    const formData = {
      name: document.getElementById('name').value.trim(),
      lastName: document.getElementById('lastName').value.trim(),
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value,
      phone: document.getElementById('phone').value.trim() || null
    };
    try {
      const response = await fetch('/api/admin/users/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        this.showSuccess(result.message || 'Менеджер успешно добавлен!', 'success');
        document.getElementById('addUserForm').reset();
        this.clearAllFieldMessages();
      } else {
        throw new Error(result.error || 'Ошибка при добавлении менеджера');
      }
    } catch (error) {
      console.error('Error:', error);
      this.showError(error.message || 'Произошла ошибка при отправке формы', 'error');
    }
  }
  clearAllFieldMessages() {
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => this.clearFieldMessage(input));
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showNotification(message, type = 'info') {
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
const addUser = new AddUser();
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM загружен, инициализация AddUser...');
  addUser.init();
});
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  console.log('DOM уже загружен, немедленная инициализация AddUser...');
  addUser.init();
}