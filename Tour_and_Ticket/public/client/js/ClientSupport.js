class ClientSupport {
  constructor() {
    this.currentChat = null;
    this.isInitialized = false;
    this.isSendingMessage = false;
  }
  async init() {
    await this.loadUserData();
    if (!this.checkAuth()) {
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
      return false;
    }
    try {
      const userData = JSON.parse(user);
      const userRole = userData.role?.name || userData.role;
      const isClient = userRole === 'client' || userRole === 'user';
      return isClient;
    } catch (e) {
      console.error('Ошибка парсинга данных пользователя:', e);
      return false;
    }
  }

  async initializeApp() {
    try {
      this.addStyles();
      await this.loadChat();
      this.setupEventListeners();
      this.startAutoRefresh();
      this.isInitialized = true;
    } catch (error) {
      console.error('Ошибка инициализации чата поддержки:', error);
      this.showError('Не удалось инициализировать чат поддержки');
    }
  }

  addStyles() {
    if (document.querySelector('#client-support-styles')) {
      return;
    }

    const styles = `
      <style id="client-support-styles">
        .chat-container {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(20px);
          border-radius: 1.2rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .chat-header {
          background: rgba(15, 23, 42, 0.8);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .messages-container {
          background: rgba(15, 23, 42, 0.4);
          max-height: 60vh;
          overflow-y: auto;
        }

        .chat-footer {
          background: rgba(15, 23, 42, 0.8);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .message-form {
          display: flex;
          gap: 0.5rem;
        }

        .message-input {
          flex: 1;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 0.75rem;
          color: #F1F5F9;
          font-size: 0.875rem;
          transition: all 0.3s;
        }

        .message-input:focus {
          outline: none;
          border-color: rgba(79, 70, 229, 0.8);
          background: rgba(255, 255, 255, 0.15);
        }

        .message-input::placeholder {
          color: #94A3B8;
        }

        .send-button {
          padding: 0.75rem;
          background: rgba(79, 70, 229, 0.8);
          border: none;
          border-radius: 0.75rem;
          color: #F1F5F9;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .send-button:hover {
          background: rgba(79, 70, 229, 1);
        }

        .send-button:disabled {
          background: rgba(71, 85, 105, 0.5);
          cursor: not-allowed;
          opacity: 0.6;
        }

        .loading-messages {
          text-align: center;
          color: #94A3B8;
          padding: 2rem;
        }

        .no-messages {
          text-align: center;
          color: #94A3B8;
          padding: 2rem;
        }

        .notification-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
        }

        .notification {
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 0.75rem;
          padding: 1rem;
          margin-bottom: 0.5rem;
          backdrop-filter: blur(10px);
          transform: translateX(100%);
          transition: transform 0.3s ease;
        }

        .notification.show {
          transform: translateX(0);
        }

        .notification-success {
          border-left: 4px solid #10B981;
        }

        .notification-error {
          border-left: 4px solid #EF4444;
        }

        .notification-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #F1F5F9;
        }

        .sender-name {
          font-size: 0.75rem;
          font-weight: 500;
          margin-bottom: 0.25rem;
          padding: 0 0.25rem;
        }

        .sender-name.received {
          color: rgba(255, 255, 255, 0.7);
          text-align: left;
        }

        .sender-name.sent {
          color: rgba(255, 255, 255, 0.7);
          text-align: right;
        }

        .new-messages-indicator {
          position: sticky;
          bottom: 10px;
          margin: 10px auto;
          text-align: center;
          z-index: 100;
        }

        .indicator-content {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(79, 70, 229, 0.9);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 0.875rem;
          backdrop-filter: blur(10px);
          animation: pulse 2s infinite;
        }

        .indicator-content button {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
        }

        .indicator-content button:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .message {
          transition: opacity 0.3s ease, transform 0.3s ease;
        }

        .message-optimistic {
          opacity: 0.7;
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
  }

  async loadChat(silent = false) {
    try {
      if (!silent) {
        this.showLoading();
      }
      const response = await fetch(`/api/support/chat?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        cache: 'no-cache'
      });
      if (!response.ok) return;
      const data = await response.json();
      if (!data.success) return;
      const previousMessages = this.currentChat?.messages || [];
      this.currentChat = {
        feedbackId: data.feedbackId,
        user: data.user,
        manager: data.manager,
        messages: data.messages || []
      };
      this.updateManagerInfo();
      if (silent) {
        this.smartRender(previousMessages);
      } else {
        this.renderChat();
      }
    } catch (error) {
      if (!silent) {
        this.showError('Не удалось загрузить историю чата');
      }
      console.error('Ошибка загрузки чата:', error);
    }
  }
  updateManagerInfo() {
    if (this.currentChat && this.currentChat.manager) {
      const managerAvatar = document.querySelector('.manager-avatar .avatar-image');
      const managerName = document.querySelector('.manager-name');
      if (managerAvatar && this.currentChat.manager.photo) {
        managerAvatar.src = this.currentChat.manager.photo;
        managerAvatar.alt = this.currentChat.manager.name;
      }
      if (managerName) {
        managerName.textContent = this.currentChat.manager.name;
      }
    } else {
      const managerName = document.querySelector('.manager-name');
      if (managerName) {
        managerName.textContent = 'Поддержка';
      }
    }
  }
  renderChat() {
    const messagesContainer = document.querySelector('.messages-container');
    if (!messagesContainer) {
      console.error('Контейнер сообщений не найден');
      return;
    }
    if (!this.currentChat || !this.currentChat.messages || this.currentChat.messages.length === 0) {
      messagesContainer.innerHTML = `
        <div class="no-messages">
          <span class="material-symbols-outlined">forum</span>
          <h3>Нет сообщений</h3>
          <p>Начните общение с поддержкой</p>
        </div>
      `;
      return;
    }
    messagesContainer.innerHTML = '';
    this.currentChat.messages.forEach(message => {
      const messageElement = this.createMessageElement(message);
      messagesContainer.appendChild(messageElement);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  smartRender(previousMessages = []) {
    const messagesContainer = document.querySelector('.messages-container');
    if (!messagesContainer || !this.currentChat?.messages) return;
    const currentMessages = this.currentChat.messages;
    if (!previousMessages.length || !currentMessages.length) {
      this.renderChat();
      return;
    }
    const previousIds = new Set(previousMessages.map(msg => msg.id));
    const newMessages = currentMessages.filter(msg => !previousIds.has(msg.id));
    if (!newMessages.length) {
      return;
    }
    this.addNewMessages(newMessages);
  }
  addNewMessages(newMessages) {
    const messagesContainer = document.querySelector('.messages-container');
    if (!messagesContainer) return;
    const wasScrolledToBottom = this.isScrolledToBottom();
    const previousScrollHeight = messagesContainer.scrollHeight;
    newMessages.forEach(message => {
      const messageElement = this.createMessageElement(message);
      messagesContainer.appendChild(messageElement);
      setTimeout(() => {
        messageElement.style.opacity = '0';
        messageElement.style.transform = 'translateY(10px)';
        messageElement.style.transition = 'all 0.3s ease';
        requestAnimationFrame(() => {
          messageElement.style.opacity = '1';
          messageElement.style.transform = 'translateY(0)';
        });
      }, 10);
    });
    if (wasScrolledToBottom) {
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 100);
    } else {
      this.showNewMessagesIndicator(messagesContainer.scrollHeight - previousScrollHeight);
    }
  }
  isScrolledToBottom() {
    const messagesContainer = document.querySelector('.messages-container');
    if (!messagesContainer) return true;
    const tolerance = 100;
    return messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight <= tolerance;
  }
  showNewMessagesIndicator(newContentHeight) {
    if (newContentHeight <= 0) return;
    const existingIndicator = document.querySelector('.new-messages-indicator');
    if (existingIndicator) existingIndicator.remove();
    const indicator = document.createElement('div');
    indicator.className = 'new-messages-indicator';
    indicator.innerHTML = `
      <div class="indicator-content">
        <span class="material-symbols-outlined">arrow_downward</span>
        <span>Новые сообщения</span>
        <button onclick="clientSupport.scrollToBottom()">↓</button>
      </div>
    `;
    const messagesContainer = document.querySelector('.messages-container');
    messagesContainer.parentNode.insertBefore(indicator, messagesContainer.nextSibling);
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.remove();
      }
    }, 5000);
  }
  scrollToBottom() {
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      const indicator = document.querySelector('.new-messages-indicator');
      if (indicator) indicator.remove();
    }
  }
  createMessageElement(message) {
    const isReceived = message.isFromManager;
    const messageTime = new Date(message.createdAt).toLocaleTimeString('ru-RU', {
      hour: '2-digit', minute: '2-digit'
    });
    const messageText = message.message;
    let senderName, avatarSrc, avatarAlt;
    if (isReceived) {
      if (message.userName && message.userPhoto) {
        senderName = message.userName;
        avatarSrc = message.userPhoto;
      }
      else if (this.currentChat?.manager) {
        senderName = this.currentChat.manager.name;
        avatarSrc = this.currentChat.manager.photo;
      }
      else {
        senderName = 'Менеджер';
        avatarSrc = '/shared/images/default-avatar.png';
      }
      avatarAlt = senderName;
    } else {
      senderName = this.currentUser?.name || 'Вы';
      avatarSrc = this.currentUser?.photo || '/shared/images/default-avatar.png';
      avatarAlt = senderName;
    }
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isReceived ? 'received' : 'sent'} ${message.isOptimistic ? 'message-optimistic' : ''}`;
    messageDiv.dataset.messageId = message.id;
    messageDiv.innerHTML = `
      ${isReceived ? `
        <div class="message-avatar">
          <img class="avatar-image" src="${avatarSrc}" alt="${avatarAlt}" 
               onerror="this.onerror=null; this.src='/shared/images/default-avatar.png'">
        </div>
      ` : ''}
      <div class="message-content">
        <div class="message-bubble ${isReceived ? 'received' : 'sent'}">
          <div class="sender-name ${isReceived ? 'received' : 'sent'}">
            ${this.escapeHtml(senderName)}
          </div>
          <p class="message-text">${this.escapeHtml(messageText || '')}</p>
          <span class="message-time">${messageTime}</span>
        </div>
      </div>
      ${!isReceived ? `
        <div class="message-avatar">
          <img class="avatar-image" src="${avatarSrc}" alt="${avatarAlt}" 
               onerror="this.onerror=null; this.src='/shared/images/default-avatar.png'">
        </div>
      ` : ''}
    `;
    return messageDiv;
  }
  setupEventListeners() {
    const messageForm = document.querySelector('.message-form');
    if (messageForm) {
      messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendMessage();
      });
    }
  }
  async sendMessage() {
    if (this.isSendingMessage) return;
    const messageForm = document.querySelector('.message-form');
    const messageInput = messageForm.querySelector('.message-input');
    const message = messageInput.value.trim();
    if (!message) return;
    this.isSendingMessage = true;
    try {
      messageInput.disabled = true;
      const sendButton = messageForm.querySelector('.send-button');
      if (sendButton) sendButton.disabled = true;
      const previousMessages = this.currentChat?.messages ? [...this.currentChat.messages] : [];
      this.addOptimisticMessage(message);
      const response = await fetch('/api/support/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: message,
          feedbackId: this.currentChat?.feedbackId
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        messageInput.value = '';
        await this.loadChatAfterSend(previousMessages);
      } else {
        throw new Error(data.error || 'Ошибка отправки сообщения');
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      this.showError('Не удалось отправить сообщение');
      this.removeOptimisticMessage();
    } finally {
      const messageInput = document.querySelector('.message-input');
      const sendButton = document.querySelector('.send-button');
      if (messageInput) messageInput.disabled = false;
      if (sendButton) sendButton.disabled = false;
      this.isSendingMessage = false;
    }
  }
  addOptimisticMessage(messageText) {
    const messagesContainer = document.querySelector('.messages-container');
    if (!messagesContainer) return;
    const tempMessage = {
      id: 'temp_' + Date.now(),
      message: messageText,
      isFromManager: false,
      createdAt: new Date().toISOString(),
      isOptimistic: true
    };
    if (!this.currentChat.messages) {
      this.currentChat.messages = [];
    }
    this.currentChat.messages.push(tempMessage);
    const messageElement = this.createMessageElement(tempMessage);
    messagesContainer.appendChild(messageElement);
    setTimeout(() => {
      messageElement.style.opacity = '0';
      messageElement.style.transform = 'translateY(10px)';
      messageElement.style.transition = 'all 0.3s ease';
      requestAnimationFrame(() => {
        messageElement.style.opacity = '0.7';
        messageElement.style.transform = 'translateY(0)';
      });
    }, 10);
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
  }
  removeOptimisticMessage() {
    if (!this.currentChat?.messages) return;
    this.currentChat.messages = this.currentChat.messages.filter(msg => !msg.isOptimistic);
    const tempMessages = document.querySelectorAll('[data-message-id^="temp_"]');
    tempMessages.forEach(msg => {
      msg.style.opacity = '0';
      msg.style.transform = 'translateY(-10px)';
      setTimeout(() => msg.remove(), 300);
    });
  }
  async loadChatAfterSend(previousMessages) {
    try {
      const response = await fetch(`/api/support/chat?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        cache: 'no-cache'
      });
      if (!response.ok) return;
      const data = await response.json();
      if (!data.success) return;
      this.currentChat = {
        feedbackId: data.feedbackId,
        user: data.user,
        manager: data.manager,
        messages: data.messages || []
      };
      this.updateManagerInfo();
      this.replaceOptimisticMessages(previousMessages);
    } catch (error) {
      console.error('Ошибка обновления чата после отправки:', error);
    }
  }
  replaceOptimisticMessages(previousMessages) {
    const messagesContainer = document.querySelector('.messages-container');
    if (!messagesContainer || !this.currentChat?.messages) return;
    const tempMessages = document.querySelectorAll('[data-message-id^="temp_"]');
    tempMessages.forEach(msg => msg.remove());
    const previousIds = new Set(previousMessages.map(msg => msg.id));
    const newMessages = this.currentChat.messages.filter(msg => !previousIds.has(msg.id));
    if (newMessages.length > 0) {
      this.addNewMessages(newMessages);
    }
  }
  startAutoRefresh() {
    setInterval(() => {
      if (this.isInitialized && this.currentChat) {
        this.loadChat(true);
      }
    }, 10000);
  }
  showLoading() {
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
      messagesContainer.innerHTML = `
        <div class="loading-messages">
          <span class="material-symbols-outlined">refresh</span>
          <p>Загрузка сообщений...</p>
        </div>
      `;
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

const clientSupport = new ClientSupport();
document.addEventListener('DOMContentLoaded', () => {
  clientSupport.init();
});
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  clientSupport.init();
}