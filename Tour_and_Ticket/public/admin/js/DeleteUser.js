class DeleteUsers {
  constructor() {
    this.currentUser = null;
    this.allUsers = [];
    this.userToDelete = null;
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
    console.log('Проверка авторизации:', { token: !!token, user: !!user });
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
      await this.loadAllUsers();
      this.isInitialized = true;
      console.log('Удаление пользователей успешно инициализировано');
    } catch (error) {
      console.error('Ошибка инициализации удаления пользователей:', error);
      this.showError('Не удалось загрузить данные пользователей');
    }
  }
  async loadAllUsers() {
    try {
      const response = await fetch('/api/admin/users/all', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        this.allUsers = result.data;
        this.displayUsers();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      throw error;
    }
  }

  displayUsers() {
    const tbody = document.getElementById('usersTableBody');
    const loading = document.getElementById('loadingMessage');
    const container = document.getElementById('usersTableContainer');

    if (!tbody || !loading || !container) return;

    if (this.allUsers.length === 0) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: #94a3b8;">
                        Нет пользователей
                    </td>
                </tr>
            `;
    } else {
      tbody.innerHTML = this.allUsers.map(user => {
        const isCurrentUser = this.currentUser && user.id === this.currentUser.id;
        const roleClass = `role-${user.role.name}`;

        return `
                    <tr class="${isCurrentUser ? 'current-user' : ''}">
                        <td>${this.escapeHtml(user.name)}</td>
                        <td>${this.escapeHtml(user.lastName)}</td>
                        <td>${this.escapeHtml(user.email)}</td>
                        <td>
                            <span class="role-badge ${roleClass}">
                                ${user.role.name === 'admin' ? 'Администратор' :
          user.role.name === 'manager' ? 'Менеджер' : 'Клиент'}
                            </span>
                        </td>
                        <td>${new Date(user.createdAt).toLocaleDateString('ru-RU')}</td>
                        <td>
                            ${isCurrentUser ?
          '<span style="color: #94a3b8;">Недоступно</span>' :
          `<button class="btn btn-danger" onclick="deleteUsers.openDeleteModal(${user.id})">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                                    Удалить
                                </button>`
        }
                        </td>
                    </tr>
                `;
      }).join('');
    }

    loading.style.display = 'none';
    container.style.display = 'block';
  }

  openDeleteModal(userId) {
    this.userToDelete = this.allUsers.find(user => user.id === userId);
    if (!this.userToDelete) return;

    const modalText = document.getElementById('deleteModalText');
    modalText.textContent = `Вы уверены, что хотите удалить пользователя ${this.userToDelete.name} ${this.userToDelete.lastName} (${this.userToDelete.email})?`;

    document.getElementById('deleteModal').style.display = 'flex';
  }

  closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    this.userToDelete = null;
  }

  async confirmDelete() {
    if (!this.userToDelete) return;

    try {
      const response = await fetch(`/api/admin/users/delete/${this.userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        this.showSuccess(result.message || 'Пользователь успешно удален!', 'success');
        this.closeDeleteModal();
        await this.loadAllUsers(); // Перезагружаем данные
      } else {
        throw new Error(result.error || 'Ошибка при удалении пользователя');
      }
    } catch (error) {
      console.error('Error:', error);
      this.showError(error.message || 'Произошла ошибка при удалении пользователя', 'error');
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
const deleteUsers = new DeleteUsers();
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM загружен, инициализация DeleteUsers...');
  deleteUsers.init();
});
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  console.log('DOM уже загружен, немедленная инициализация DeleteUsers...');
  deleteUsers.init();
}