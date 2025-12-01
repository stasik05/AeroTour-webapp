import { ProfileService } from '/shared/js/ProfileService.js';

class PersonalAccount {
  constructor() {
    this.currentUser = null;
    this.bookings = [];
    this.init();
  }

  async init() {
    if (!this.checkAuth()) {
      return;
    }
    await this.loadUserData();
    this.setupEventListeners();
    this.setupPhotoUpload();
    this.setupValidation();
    this.createPasswordToggles();
  }

  checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return false;
    }
    return true;
  }

  async loadUserData() {
    try {
      const profileData = await ProfileService.getProfile();
      if (profileData.success) {
        this.currentUser = profileData.user;
        this.updateProfileUI(profileData.user);
      }
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
      this.showNotification('Ошибка загрузки данных профиля', 'error');
    }
  }

  updateProfileUI(user) {
    const updateField = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.value = value || '';
    };
    updateField('first-name', user.name);
    updateField('last-name', user.lastName);
    updateField('email', user.email);
    updateField('phone', user.phone);

    if (user.photo) {
      this.updateAvatar(user.photo);
    }

    const profileName = document.querySelector('.profile-name');
    const profileEmail = document.querySelector('.profile-email');

    if (profileName) profileName.textContent = `${user.name} ${user.lastName}`;
    if (profileEmail) profileEmail.textContent = user.email;
  }

  updateAvatar(photoUrl) {
    const avatars = document.querySelectorAll('.profile-avatar, .user-avatar');
    avatars.forEach(avatar => {
      avatar.src = photoUrl;
    });
  }

  setupEventListeners() {
    const profileForm = document.querySelector('.profile-form');
    const passwordForm = document.querySelector('.password-form');

    if (profileForm) {
      profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.updateProfile();
      });
    }

    if (passwordForm) {
      passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.changePassword();
      });
    }
  }

  createPasswordToggles() {
    this.createPasswordToggle('current-password');
    this.createPasswordToggle('new-password');
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
    toggle.setAttribute('aria-label', 'Показать/скрыть пароль');
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

  setupValidation() {
    this.addStyles();
    this.setupProfileValidation();
    this.setupPasswordValidation();
  }

  setupProfileValidation() {
    const inputs = [
      { id: 'first-name', validator: (input) => this.validateName(input, 'имя') },
      { id: 'last-name', validator: (input) => this.validateName(input, 'фамилия') },
      { id: 'email', validator: (input) => this.validateEmail(input) },
      { id: 'phone', validator: (input) => this.validatePhone(input) }
    ];

    inputs.forEach(({ id, validator }) => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('blur', () => validator(input));
        input.addEventListener('input', () => this.clearFieldMessage(input));
      }
    });
  }

  setupPasswordValidation() {
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');

    if (currentPasswordInput) {
      currentPasswordInput.addEventListener('blur', () => this.validateCurrentPassword(currentPasswordInput));
      currentPasswordInput.addEventListener('input', () => this.clearFieldMessage(currentPasswordInput));
    }

    if (newPasswordInput) {
      newPasswordInput.addEventListener('blur', () => this.validateNewPassword(newPasswordInput));
      newPasswordInput.addEventListener('input', () => this.clearFieldMessage(newPasswordInput));
    }
  }

  addStyles() {
    if (document.querySelector('#personal-account-styles')) {
      return;
    }

    const styles = `
      <style id="personal-account-styles">
        .form-group {
          position: relative;
          margin-bottom: 1.5rem !important;
          min-height: 75px;
        }
        
        .password-input-container {
          position: relative;
          margin-bottom: 1.5rem !important;
        }
        
        .password-toggle {
          position: absolute;
          right: 12px;
          top: 70%;
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
        }
        
        .form-input.success {
          border-color: #10b981 !important;
        }
        
        .field-message {
          position: absolute;
          bottom: -18px;
          left: 0;
          font-size: 12px;
          line-height: 1.2;
          opacity: 0;
         
          transform: translateY(-3px);
          transition: all 0.2s ease;
        }
        
        .field-message.error {
          color: #e74c3c;
        }
        
        .field-message.success {
          color: #10b981;
        }
        
        .field-message.show {
          opacity: 1;
          transform: translateY(0);
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
  }

  validateName(input, fieldName = 'имя') {
    const value = input.value.trim();
    this.clearFieldMessage(input);

    if (!value) {
      return true;
    }

    const russianNameRegex = /^[А-ЯЁа-яё]+$/;
    if (!russianNameRegex.test(value)) {
      this.showFieldMessage(input, 'error', `✕ ${fieldName} должно содержать только русские буквы`);
      return false;
    }

    if (value.split(' ').length > 1) {
      this.showFieldMessage(input, 'error', `✕ ${fieldName} должно быть одним словом`);
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
      this.showFieldMessage(input, 'error', '✕ Введите корректный email адрес');
      return false;
    }

    this.showFieldMessage(input, 'success', '✓ Email корректный');
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
      this.showFieldMessage(input, 'error', '✕ Формат телефона: +375XXXXXXXXX (Беларусь)');
      return false;
    }

    this.showFieldMessage(input, 'success', '✓ Телефон корректный');
    return true;
  }

  validateCurrentPassword(input) {
    const value = input.value;
    this.clearFieldMessage(input);

    if (!value) {
      return true;
    }

    if (value.length < 8) {
      this.showFieldMessage(input, 'error', '✕ Пароль должен содержать не менее 8 символов');
      return false;
    }

    this.showFieldMessage(input, 'success', '✓ Пароль введен');
    return true;
  }

  validateNewPassword(input) {
    const value = input.value;
    this.clearFieldMessage(input);

    if (!value) {
      return true;
    }

    if (value.length < 8) {
      this.showFieldMessage(input, 'error', '✕ Пароль должен содержать не менее 8 символов');
      return false;
    }

    const hasLetter = /[a-zA-Zа-яА-Я]/.test(value);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?0-9]/.test(value);

    if (!hasLetter || !hasSpecialChar) {
      this.showFieldMessage(input, 'error', '✕ Пароль должен содержать буквы и специальные символы/цифры');
      return false;
    }

    this.showFieldMessage(input, 'success', '✓ Пароль надежный');
    return true;
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
    let messageElement = formGroup?.querySelector('.field-message');

    if (!messageElement) {
      messageElement = document.createElement('div');
      messageElement.className = 'field-message';
      formGroup.appendChild(messageElement);
    }

    messageElement.className = `field-message ${type}`;
    messageElement.textContent = message;

    setTimeout(() => {
      messageElement.classList.add('show');
    }, 10);
  }

  clearFieldMessage(input) {
    input.classList.remove('error', 'success');
    const formGroup = input.closest('.form-group');
    const messageElement = formGroup?.querySelector('.field-message');
    if (messageElement) {
      messageElement.remove();
    }
  }

  setupPhotoUpload() {
    const avatar = document.querySelector('.profile-avatar');
    if (!avatar) return;

    const photoInput = document.createElement('input');
    photoInput.type = 'file';
    photoInput.id = 'photo-input';
    photoInput.accept = 'image/*';
    photoInput.style.display = 'none';
    document.body.appendChild(photoInput);

    avatar.style.cursor = 'pointer';
    avatar.title = 'Нажмите чтобы изменить фото';

    avatar.addEventListener('click', () => {
      photoInput.click();
    });

    photoInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.uploadPhoto(e.target.files[0]);
      }
    });
  }

  async updateProfile() {
    const firstNameInput = document.getElementById('first-name');
    const lastNameInput = document.getElementById('last-name');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');

    if (!firstNameInput || !lastNameInput || !emailInput) {
      this.showNotification('Форма профиля не найдена', 'error');
      return;
    }

    let isValid = true;

    if (!firstNameInput.value.trim()) {
      this.showFieldMessage(firstNameInput, 'error', 'Имя обязательно для заполнения');
      isValid = false;
    } else if (!this.validateName(firstNameInput, 'имя')) {
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

    if (phoneInput && phoneInput.value.trim() && !this.validatePhone(phoneInput)) {
      isValid = false;
    }

    if (!isValid) {
      this.showNotification('Пожалуйста, исправьте ошибки в форме', 'error');
      return;
    }

    const formData = {
      name: firstNameInput.value.trim(),
      lastName: lastNameInput.value.trim(),
      phone: phoneInput ? phoneInput.value.trim() : ''
    };

    try {
      const result = await ProfileService.updateProfile(formData);
      if (result.success) {
        this.showNotification('Профиль успешно обновлен', 'success');
        this.updateProfileUI(result.user);
      }
    } catch (error) {
      this.showNotification(error.error || 'Ошибка обновления профиля', 'error');
    }
  }

  async changePassword() {
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');

    if (!currentPasswordInput || !newPasswordInput) {
      this.showNotification('Форма смены пароля не найдена', 'error');
      return;
    }

    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;

    let isValid = true;

    if (!currentPassword) {
      this.showFieldMessage(currentPasswordInput, 'error', 'Текущий пароль обязателен для заполнения');
      isValid = false;
    } else if (!this.validateCurrentPassword(currentPasswordInput)) {
      isValid = false;
    }

    if (!newPassword) {
      this.showFieldMessage(newPasswordInput, 'error', 'Новый пароль обязателен для заполнения');
      isValid = false;
    } else if (!this.validateNewPassword(newPasswordInput)) {
      isValid = false;
    }

    if (!isValid) {
      this.showNotification('Пожалуйста, исправьте ошибки в форме пароля', 'error');
      return;
    }

    try {
      const result = await ProfileService.changePassword({
        currentPassword,
        newPassword
      });

      if (result.success) {
        this.showNotification('Пароль успешно изменен', 'success');
        document.querySelector('.password-form').reset();
        this.clearFieldMessage(currentPasswordInput);
        this.clearFieldMessage(newPasswordInput);
      }
    } catch (error) {
      this.showNotification(error.error || 'Ошибка смены пароля', 'error');
    }
  }

  async uploadPhoto(file) {
    if (!file.type.startsWith('image/')) {
      this.showNotification('Выберите файл изображения', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.showNotification('Размер файла не должен превышать 5MB', 'error');
      return;
    }

    try {
      const result = await ProfileService.uploadPhoto(file);
      if (result.success) {
        this.showNotification('Фото успешно загружено', 'success');
        this.updateAvatar(result.photoUrl);
      }
    } catch (error) {
      this.showNotification(error.error || 'Ошибка загрузки фото', 'error');
    }
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
document.addEventListener('DOMContentLoaded', () => {
  window.personalAccount = new PersonalAccount();
});
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    const avatar = document.querySelector('.profile-avatar');
    if (!avatar) return;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    avatar.style.cursor = 'pointer';
    avatar.title = 'Нажмите чтобы изменить фото';

    avatar.addEventListener('click', function() {
      fileInput.click();
    });

    fileInput.addEventListener('change', function(e) {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];

        if (!file.type.startsWith('image/')) {
          alert('Пожалуйста, выберите файл изображения');
          return;
        }

        if (file.size > 5 * 1024 * 1024) {
          alert('Файл слишком большой. Максимальный размер: 5MB');
          return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
          avatar.src = e.target.result;
        };
        reader.readAsDataURL(file);

        if (window.personalAccount) {
          window.personalAccount.uploadPhoto(file);
        }
      }
    });
  }, 1000);
});