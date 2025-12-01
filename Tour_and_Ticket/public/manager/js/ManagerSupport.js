
class ManagerSupport {
  constructor() {
    this.currentChat = null;
    this.chats = [];
    this.filter = 'all';
    this.isInitialized = false;
  }

  async init()
  {
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
  async initializeApp() {
    try {
      await this.initUI();
      await this.loadChats();
      this.setupEventListeners();
      this.startAutoRefresh();
      this.isInitialized = true;
    } catch (error) {
      console.error('Ошибка инициализации мессенджера:', error);
      this.showError('Не удалось инициализировать мессенджер');
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
      const isManager = userRole === 'manager';
      return isManager;
    } catch (e) {
      console.error('Ошибка парсинга данных пользователя:', e);
      return false;
    }
  }

  async initUI() {
    this.createMessengerLayout();
    this.addStyles();
  }

  createMessengerLayout() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) {
      return;
    }

    const messengerHTML = `
      <div class="messenger-container">
        <div class="chats-sidebar">
          <div class="chats-header">
            <h3>Чаты</h3>
            <div class="chat-filters">
              <button class="filter-btn active" data-filter="all">Все чаты</button>
              <button class="filter-btn" data-filter="open">Открытые</button>
              <button class="filter-btn" data-filter="answered">Отвеченные</button>
              <button class="filter-btn" data-filter="closed">Закрытые</button>
            </div>
          </div>
          <div class="chats-list">
            <div class="loading-chats">Загрузка чатов...</div>
          </div>
        </div>
        <div class="chat-area">
          <div class="no-chat-selected">
            <span class="material-symbols-outlined">forum</span>
            <h3>Выберите чат для начала общения</h3>
            <p>Выберите чат из списка слева чтобы начать переписку с клиентом</p>
          </div>
        </div>
      </div>
    `;
    mainContent.innerHTML = messengerHTML;
    this.chatsList = document.querySelector('.chats-list');
    this.chatArea = document.querySelector('.chat-area');
    this.filterButtons = document.querySelectorAll('.filter-btn');
  }

  addStyles() {
    if (document.querySelector('#manager-support-styles')) {
      return;
    }
    const styles = `
      <style id="manager-support-styles">
        .messenger-container {
          display: flex;
          width: 100%;
          height: calc(100vh - 80px);
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(20px);
          gap: 0;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 1.2rem;
        }
        
        .chats-sidebar {
          width: 350px;
          background: rgba(15, 23, 42, 0.8);
          border-right: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          margin: 0;
        }
        
        .chats-header {
          padding: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .chats-header h3 {
          color: #E2E8F0;
          margin-bottom: 1rem;
          font-size: 1.25rem;
        }
        
        .chat-filters {
          display: flex;
          gap: 0.5rem;
        }
        
        .filter-btn {
          flex: 1;
          padding: 0.5rem;
          background: rgba(71, 85, 105, 0.5);
          border: none;
          border-radius: 0.5rem;
          color: #CBD5E1;
          cursor: pointer;
          transition: all 0.3s;
          font-size: 0.75rem;
        }
        
        .filter-btn:hover {
          background: rgba(71, 85, 105, 0.7);
          color: #F1F5F9;
        }
        
        .filter-btn.active {
          background: rgba(79, 70, 229, 0.8);
          color: #F1F5F9;
        }
        
        .chats-list {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
        }
        
        .loading-chats {
          color: #94A3B8;
          text-align: center;
          padding: 2rem;
        }
        
        .chat-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          cursor: pointer;
          transition: all 0.3s;
          margin-bottom: 0.5rem;
        }
        
        .chat-item:hover {
          background: rgba(71, 85, 105, 0.3);
        }
        
        .chat-item.active {
          background: rgba(79, 70, 229, 0.3);
        }
        
        .chat-avatar {
          width: 3rem;
          height: 3rem;
          border-radius: 50%;
          object-fit: cover;
          background: rgba(255, 255, 255, 0.1);
        }
        
        .chat-info {
          flex: 1;
          overflow: hidden;
        }
        
        .chat-name {
          color: #F1F5F9;
          font-weight: 500;
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .chat-preview {
          color: #94A3B8;
          font-size: 0.875rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .chat-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.25rem;
        }
        
        .chat-time {
          color: #64748B;
          font-size: 0.75rem;
        }
        
        .chat-status {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 50%;
        }
        
        .status-open {
          background: #3B82F6;
        }
        
        .status-answered {
          background: #10B981;
        }
        
        .status-closed {
          background: #6B7280;
        }
        
        .chat-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          margin: 0;
        }
        
        .no-chat-selected {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #94A3B8;
          text-align: center;
          padding: 2rem;
        }
        
        .no-chat-selected .material-symbols-outlined {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }
        
        .chat-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          margin: 0;
          background: rgba(15, 23, 42, 0.6);
        }
        
        .chat-header {
          display: flex;
          align-items: center;
          padding: 1rem;
          background: rgba(15, 23, 42, 0.8);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          margin: 0;
        }
        
        .back-to-chats {
          display: none;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          color: #F1F5F9;
          background: none;
          border: none;
          cursor: pointer;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .chat-user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
        }
        
        .user-avatar {
          position: relative;
        }
        
        .user-avatar .avatar-image {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 50%;
          object-fit: cover;
          background: rgba(255, 255, 255, 0.1);
        }
        
        .online-indicator {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 0.75rem;
          height: 0.75rem;
          background: #10B981;
          border: 2px solid rgba(15, 23, 42, 0.8);
          border-radius: 50%;
        }
        
        .user-details h2 {
          color: #F1F5F9;
          font-size: 1rem;
          margin: 0;
        }
        
        .online-status {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #10B981;
          font-size: 0.75rem;
          margin: 0;
        }
        
        .online-status .material-symbols-outlined {
          font-size: 0.5rem;
          color: #10B981;
        }
        
        .menu-button {
          background: none;
          border: none;
          color: #F1F5F9;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 0.5rem;
          transition: background 0.3s;
        }
        
        .menu-button:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        
        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin: 0;
        }
        
        .message {
          display: flex;
          align-items: flex-end;
          gap: 0.5rem;
        }
        
        .message.received {
          justify-content: flex-start;
        }
        
        .message.sent {
          justify-content: flex-end;
        }
        
        .message-avatar .avatar-image {
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          object-fit: cover;
          background: rgba(255, 255, 255, 0.1);
        }
        
        .message-content {
          max-width: 100%;
        }
        
        .message-bubble {
          padding: 0.75rem 1rem;
          border-radius: 1rem;
          position: relative;
        }
        
        .message-bubble.received {
          background: rgba(71, 85, 105, 0.5);
          color: #F1F5F9;
          border-bottom-left-radius: 0.25rem;
        }
        
        .message-bubble.sent {
          background: rgba(79, 70, 229, 0.8);
          color: #F1F5F9;
          border-bottom-right-radius: 0.25rem;
        }
        
        .message-text {
          margin: 0 0 0.5rem 0;
          word-wrap: break-word;
        }
        
        .message-time {
          font-size: 0.75rem;
          opacity: 0.7;
        }
        
        .chat-footer {
          padding: 1rem;
          background: rgba(15, 23, 42, 0.8);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          margin: 0;
        }
        
        .message-form {
          display: flex;
          gap: 0.5rem;
        }
        
   
        
        
        
       
        
        
        
        
        
        .manager-details h3 {
          color: #E2E8F0;
          font-size: 0.875rem;
          margin: 0;
          font-weight: 500;
        }
        
        .manager-details p {
          color: #94A3B8;
          font-size: 0.75rem;
          margin: 0;
        }
        
        @media (max-width: 768px) {
          .back-to-chats {
            display: flex;
          }
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

/* Убедитесь, что message-bubble имеет правильные отступы */
.message-bubble {
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  position: relative;
}

.message-bubble.received {
  background: rgba(71, 85, 105, 0.5);
  color: #F1F5F9;
  border-bottom-left-radius: 0.25rem;
}

.message-bubble.sent {
  background: rgba(79, 70, 229, 0.8);
  color: #F1F5F9;
  border-bottom-right-radius: 0.25rem;
}
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
  }

  async loadChats() {
    try {
      const response = await fetch(`/api/manager-support/tickets?status=${this.filter}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        this.chats = data.tickets;
        this.renderChats();
      } else {
        throw new Error(data.error || 'Ошибка загрузки чатов');
      }
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
      this.showError('Не удалось загрузить чаты');
      if (this.chatsList) {
        this.chatsList.innerHTML = `
          <div class="loading-chats">
            <p>Ошибка загрузки чатов</p>
            <button onclick="managerSupport.loadChats()">Повторить</button>
          </div>
        `;
      }
    }
  }

  renderChats() {
    if (!this.chatsList) {
      console.error('Элемент списка чатов не найден');
      return;
    }

    if (this.chats.length === 0) {
      this.chatsList.innerHTML = `
        <div class="loading-chats">
          <p>Нет доступных чатов</p>
        </div>
      `;
      return;
    }
    const uniqueChats = this.removeDuplicateChats(this.chats);
    this.chatsList.innerHTML = this.chats.map(chat => `
      <div class="chat-item ${this.currentChat?.id === chat.id ? 'active' : ''}" 
           data-chat-id="${chat.id}" 
           data-user-id="${chat.userId}">
        <img class="chat-avatar" src="${chat.userPhoto || ''}" 
             alt="${chat.userName}" 
             onerror="this.style.display='none'">
        <div class="chat-info">
          <div class="chat-name">${this.escapeHtml(chat.userName)}</div>
          <div class="chat-preview">${this.escapeHtml(this.getChatPreview(chat))}</div>
        </div>
        <div class="chat-meta">
          <div class="chat-time">${this.formatTime(chat.lastMessageTime || chat.updatedAt || chat.created_at)}</div>
          <div class="chat-status status-${chat.status}"></div>
        </div>
      </div>
    `).join('');
    this.setupChatClickHandlers();
  }
  removeDuplicateChats(chats) {
    const seen = new Map();
    const uniqueChats = [];

    for (const chat of chats) {
      const key = `${chat.userId}-${chat.status}-${chat.feedbackId || chat.id}`;

      if (!seen.has(key)) {
        seen.set(key, true);
        uniqueChats.push(chat);
      }
    }

    return uniqueChats;
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

  getChatPreview(chat) {
    const message = chat.lastMessage || chat.initialMessage;
    return message && message.length > 30 ? message.substring(0, 30) + '...' : (message || 'Нет сообщений');
  }

  formatTime(dateString) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now - date;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days === 0) {
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      } else if (days === 1) {
        return 'Вчера';
      } else if (days < 7) {
        return `${days} дн.`;
      } else {
        return date.toLocaleDateString('ru-RU');
      }
    } catch (e) {
      return '--:--';
    }
  }

  setupChatClickHandlers() {
    document.querySelectorAll('.chat-item').forEach(item => {
      item.addEventListener('click', () => {
        const chatId = item.dataset.chatId;
        const userId = item.dataset.userId;
        this.selectChat(chatId, userId);
      });
    });
  }

  async selectChat(chatId, userId) {
    try {
      const response = await fetch(`/api/manager-support/chat/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        this.currentChat = {
          id: chatId,
          userId: userId,
          feedbackId: data.feedbackId,
          user: data.user,
          manager: data.manager,
          messages: data.messages
        };

        this.renderChat();
        this.updateActiveChat(chatId);

      } else {
        throw new Error(data.error || 'Ошибка загрузки чата');
      }
    } catch (error) {
      console.error('Ошибка загрузки чата:', error);
      this.showError('Не удалось загрузить чат');
    } finally {
    }
  }

  renderChat() {
    let chatContainer = this.chatArea.querySelector('.chat-container');
    if (chatContainer) {
      chatContainer.remove();
    }
      chatContainer = document.createElement('div');
      chatContainer.className = 'chat-container active';
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const managerName = userData.name || 'Менеджер';
      const managerPhoto = userData.photo;
      chatContainer.innerHTML = `
        <header class="chat-header">
          <button class="back-to-chats">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>К чатам</span>
          </button>
          <div class="chat-user-info">
            <div class="message-avatar">
              <img class="user-avatar" src="${this.currentChat.user.photo || ''}" alt="${this.currentChat.user.name}" onerror="this.style.display='none'">
              <span class="online-indicator"></span>
            </div>
            <div class="user-details">
              <h2>${this.escapeHtml(this.currentChat.user.name)}</h2>
              <p class="online-status">
                <span class="material-symbols-outlined">circle</span>
                <span>Онлайн</span>
              </p>
            </div>
          </div>
         
          <button class="menu-button" onclick="managerSupport.closeCurrentChat()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>
        <div class="messages-container"></div>
        <footer class="chat-footer">
          <form class="message-form">
            <input class="message-input" placeholder="Напишите сообщение..." type="text"/>
            <button class="send-button" type="submit">
              <span class="material-symbols-outlined">send</span>
            </button>
          </form>
        </footer>
      `;

      this.chatArea.innerHTML = '';
      this.chatArea.appendChild(chatContainer);

      this.setupBackButton();
      this.setupMessageForm();

    const messagesContainer = chatContainer.querySelector('.messages-container');
    messagesContainer.innerHTML = '';

    this.currentChat.messages.forEach(message => {
      const messageElement = this.createMessageElement(message);
      messagesContainer.appendChild(messageElement);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  createMessageElement(message) {
    const isReceived = !message.isFromManager;
    const messageTime = new Date(message.createdAt).toLocaleTimeString('ru-RU', {
      hour: '2-digit', minute: '2-digit'
    });

    const messageText = message.message;
    const managerName = this.currentChat?.manager?.name || 'Менеджер';
    const managerPhoto = this.currentChat?.manager?.photo;
    const userPhoto = this.currentChat?.user?.photo;
    const userName = this.currentChat?.user?.name || 'Пользователь';
    const avatarSrc = isReceived ?
      (message.userPhoto || userPhoto) :
      managerPhoto;

    const avatarAlt = isReceived ?
      (message.userName || userName) :
      managerName;
    const senderName = isReceived ?
      (message.userName || userName) :
      managerName;
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isReceived ? 'received' : 'sent'}`;

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

  updateActiveChat(chatId) {
    document.querySelectorAll('.chat-item').forEach(item => {
      item.classList.remove('active');
    });

    const activeChat = document.querySelector(`[data-chat-id="${chatId}"]`);
    if (activeChat) {
      activeChat.classList.add('active');
    }
  }

  setupBackButton() {
    const backButton = this.chatArea.querySelector('.back-to-chats');
    if (backButton) {
      backButton.addEventListener('click', () => {
        this.chatArea.innerHTML = `
          <div class="no-chat-selected">
            <span class="material-symbols-outlined">forum</span>
            <h3>Выберите чат для начала общения</h3>
            <p>Выберите чат из списка слева чтобы начать переписку с клиентом</p>
          </div>
        `;
        this.currentChat = null;
        this.updateActiveChat(null);
      });
    }
  }

  setupEventListeners() {
    this.filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        this.filter = button.dataset.filter;
        this.loadChats();
      });
    });
  }

  setupMessageForm() {
    const messageForm = this.chatArea.querySelector('.message-form');
    if (messageForm) {
      messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendMessage();
      });
    }
  }

  async sendMessage() {
    const messageForm = this.chatArea.querySelector('.message-form');
    const messageInput = messageForm.querySelector('.message-input');
    const message = messageInput.value.trim();

    if (!message || !this.currentChat) {
      return;
    }

    try {
      const response = await fetch('/api/manager-support/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: this.currentChat.userId,
          message: message,
          feedbackId: this.currentChat.feedbackId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        messageInput.value = '';
        await this.selectChat(this.currentChat.id, this.currentChat.userId);
        await this.loadChats();
      } else {
        throw new Error(data.error || 'Ошибка отправки сообщения');
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      this.showError('Не удалось отправить сообщение');
    }
  }

  async closeCurrentChat() {
    if (!this.currentChat) return;

    try {
      const response = await fetch(`/api/manager-support/ticket/${this.currentChat.id}/close`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        this.chatArea.innerHTML = `
          <div class="no-chat-selected">
            <span class="material-symbols-outlined">forum</span>
            <h3>Выберите чат для начала общения</h3>
            <p>Выберите чат из списка слева чтобы начать переписку с клиентом</p>
          </div>
        `;
        this.currentChat = null;
        this.updateActiveChat(null);
        await this.loadChats();
        this.showSuccess('Чат закрыт');
      }
    } catch (error) {
      console.error('Ошибка закрытия чата:', error);
      this.showError('Не удалось закрыть чат');
    }
  }

  startAutoRefresh() {
    setInterval(() => {
      if (this.isInitialized) {
        if (this.currentChat) {
          this.selectChat(this.currentChat.id, this.currentChat.userId);
        }
        this.loadChats();
      }
    }, 300000);
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
const managerSupport = new ManagerSupport();
document.addEventListener('DOMContentLoaded', () => {
  managerSupport.init();
});
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  managerSupport.init();
}