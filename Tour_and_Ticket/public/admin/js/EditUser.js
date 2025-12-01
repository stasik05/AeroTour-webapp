class EditUsers {
  constructor() {
    this.currentUser = null;
    this.managers = [];
    this.userToEdit = null;
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
      await this.loadManagers();
      this.isInitialized = true;
    } catch (error) {
      console.error('Ошибка инициализации редактирования пользователей:', error);
      this.showError('Не удалось загрузить данные менеджеров');
    }
  }
  addStyles() {
    if (document.querySelector('#edit-users-styles')) {
      return;
    }

    const styles = `
      <style id="edit-users-styles">
        .edit-form-group {
          position: relative;
          margin-bottom: 2rem !important;
          min-height: 80px;
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
    const editForm = document.getElementById('editUserForm');
    if (editForm) {
      editForm.addEventListener('submit', (e) => this.handleEditFormSubmit(e));
    }
    const modal = document.getElementById('editModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeEditModal();
        }
      });
    }
    const closeBtn = document.querySelector('#editModal .close-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeEditModal());
    }
  }
  async loadManagers() {
    try {
      const response = await fetch('/api/admin/users/managers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        this.managers = result.data;
        this.displayManagers();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error loading managers:', error);
      throw error;
    }
  }
  displayManagers() {
    const tbody = document.getElementById('usersTableBody');
    const loading = document.getElementById('loadingMessage');
    const container = document.getElementById('usersTableContainer');

    if (!tbody || !loading || !container) return;

    if (this.managers.length === 0) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: #94a3b8;">
                        Нет менеджеров для редактирования
                    </td>
                </tr>
            `;
    } else {
      tbody.innerHTML = this.managers.map(user => `
                <tr>
                    <td>${this.escapeHtml(user.name)}</td>
                    <td>${this.escapeHtml(user.lastName)}</td>
                    <td>${this.escapeHtml(user.email)}</td>
                    <td>${this.escapeHtml(user.phone || 'Не указан')}</td>
                    <td>${new Date(user.createdAt).toLocaleDateString('ru-RU')}</td>
                    <td>
                        <button class="btn btn-primary" onclick="editUsers.openEditModal(${user.id})">
                            <span class="material-symbols-outlined" style="font-size: 16px;">edit</span>
                            Редактировать
                        </button>
                    </td>
                </tr>
            `).join('');
    }

    loading.style.display = 'none';
    container.style.display = 'block';
  }

  openEditModal(userId) {
    this.userToEdit = this.managers.find(user => user.id === userId);
    if (!this.userToEdit) return;

    document.getElementById('editUserId').value = this.userToEdit.id;
    document.getElementById('editName').value = this.userToEdit.name;
    document.getElementById('editLastName').value = this.userToEdit.lastName;
    document.getElementById('editPhone').value = this.userToEdit.phone || '';
    this.clearAllFieldMessages();
    this.setupModalValidation();
    document.getElementById('editModal').style.display = 'flex';
  }
  setupModalValidation() {
    const nameInput = document.getElementById('editName');
    const lastNameInput = document.getElementById('editLastName');
    const phoneInput = document.getElementById('editPhone');
    this.createModalMessageContainers();
    if (nameInput) {
      nameInput.addEventListener('blur', () => this.validateName(nameInput));
      nameInput.addEventListener('input', () => this.clearFieldMessage(nameInput));
    }

    if (lastNameInput) {
      lastNameInput.addEventListener('blur', () => this.validateName(lastNameInput, 'фамилия'));
      lastNameInput.addEventListener('input', () => this.clearFieldMessage(lastNameInput));
    }

    if (phoneInput) {
      phoneInput.addEventListener('blur', () => this.validatePhone(phoneInput));
      phoneInput.addEventListener('input', () => this.clearFieldMessage(phoneInput));
    }
  }

  createModalMessageContainers() {
    const modalInputs = [
      document.getElementById('editName'),
      document.getElementById('editLastName'),
      document.getElementById('editPhone')
    ];
    modalInputs.forEach(input => {
      if (input) {
        let formGroup = input.closest('.form-group');
        if (!formGroup) {
          formGroup = document.createElement('div');
          formGroup.className = 'form-group edit-form-group';
          input.parentNode.insertBefore(formGroup, input);
          formGroup.appendChild(input);
        } else {
          formGroup.classList.add('edit-form-group');
        }

        if (!formGroup.querySelector('.validation-messages')) {
          const messagesContainer = document.createElement('div');
          messagesContainer.className = 'validation-messages';
          formGroup.appendChild(messagesContainer);
        }
      }
    });
  }
  validateName(input, fieldName = 'имя') {
    const value = input.value.trim();
    this.clearFieldMessage(input);

    if (!value) {
      this.showFieldMessage(input, 'error', `❌ ${fieldName} обязательно для заполнения`);
      return false;
    }

    const russianNameRegex = /^[А-ЯЁа-яё]+$/;
    if (!russianNameRegex.test(value)) {
      this.showFieldMessage(input, 'error', `❌ ${fieldName} должно содержать только русские буквы`);
      return false;
    }
    if (value.split(' ').length > 1) {
      this.showFieldMessage(input, 'error', `❌ ${fieldName} должно быть одним словом`);
      return false;
    }
    this.showFieldMessage(input, 'success', `✓ ${fieldName} корректно`);
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
      this.showFieldMessage(input, 'error', '❌ Формат телефона: +375XXXXXXXXX (Беларусь)');
      return false;
    }
    this.showFieldMessage(input, 'success', '✓ Телефон корректный');
    return true;
  }
  validateAllModalFields() {
    const nameInput = document.getElementById('editName');
    const lastNameInput = document.getElementById('editLastName');
    const phoneInput = document.getElementById('editPhone');

    let isValid = true;

    if (!this.validateName(nameInput)) {
      isValid = false;
    }

    if (!this.validateName(lastNameInput, 'фамилия')) {
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
      input.classList.add('success');
    } else if (type === 'success') {
      input.classList.add('success');
    }
    const formGroup = input.closest('.form-group');
    const messagesContainer = formGroup?.querySelector('.validation-messages');

    if (messagesContainer) {
      const messageElement = document.createElement('div');
      messageElement.className = `success-message`;
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

  clearAllFieldMessages() {
    const modalInputs = [
      document.getElementById('editName'),
      document.getElementById('editLastName'),
      document.getElementById('editPhone')
    ];

    modalInputs.forEach(input => {
      if (input) this.clearFieldMessage(input);
    });
  }

  closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    this.userToEdit = null;
    this.clearAllFieldMessages();
  }

  async handleEditFormSubmit(e) {
    e.preventDefault();
    if (!this.validateAllModalFields()) {
      this.showError('Пожалуйста, исправьте ошибки в форме', 'error');
      return;
    }

    const formData = {
      id: document.getElementById('editUserId').value,
      name: document.getElementById('editName').value.trim(),
      lastName: document.getElementById('editLastName').value.trim(),
      phone: document.getElementById('editPhone').value.trim() || null
    };

    try {
      const response = await fetch('/api/admin/users/edit', {
        method: 'PUT',
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
        this.showSuccess(result.message || 'Данные менеджера успешно обновлены!', 'success');
        this.closeEditModal();
        await this.loadManagers();
      } else {
        throw new Error(result.error || 'Ошибка при обновлении данных');
      }
    } catch (error) {
      console.error('Error:', error);
      this.showError(error.message || 'Произошла ошибка при обновлении данных', 'error');
    }
  }

  escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
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
const editUsers = new EditUsers();
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM загружен, инициализация EditUsers...');
  editUsers.init();
});
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  console.log('DOM уже загружен, немедленная инициализация EditUsers...');
  editUsers.init();
}