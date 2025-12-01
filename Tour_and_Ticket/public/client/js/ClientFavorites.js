import { FavoritesService } from '/shared/js/FavoritesService.js';
class FavoritesManager {
  constructor() {
    this.favorites = [];
    this.currentUser = null;
  }
  async init() {
    try {
      await this.checkAuth();
      await this.loadFavorites();
    } catch (error) {
      console.error('Error initializing FavoritesManager:', error);
      this.showError('Ошибка инициализации: ' + error.message);
    }
  }
  async checkAuth()
  {
    const token = localStorage.getItem('token');
    if (!token)
    {
      return;
    }
    try
    {
      const userData = localStorage.getItem('user');
      if (userData)
      {
        this.currentUser = JSON.parse(userData);
        this.updateUserInfo();
      }
      else
      {
        console.error('User data not found in localStorage');
      }
    } catch (error)
    {
      console.error('Auth check failed, but continuing:', error.message);
    }
  }
  updateUserInfo()
  {
    if (this.currentUser && this.currentUser.photo)
    {
      const avatar = document.getElementById('userAvatar');
      if (avatar) {
        avatar.src = this.currentUser.photo;
        avatar.onerror = () => {
          console.error('Failed to load user avatar');
          this.showError('Ошибка загрузки аватара пользователя');
        };
      }
    }
  }
  async loadFavorites() {
    try {
      const response = await FavoritesService.getFavorites();
      this.favorites = response.data;
      this.renderFavorites();
      this.updateFavoritesCounter();
    } catch (error) {
      console.error('Error loading favorites:', error);
      this.showError('Ошибка при загрузке избранного: ' + (error.error || error.message));
    }
  }

  updateFavoritesCounter() {
    const counterElement = document.getElementById('favoritesCounter');
    if (counterElement) {
      counterElement.textContent = this.favorites.length;
    }
  }

  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
  formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  renderFavorites() {
    const container = document.querySelector('.favorites-grid');
    if (!container) {
      console.error('.favorites-grid not found in DOM');
      return;
    }

    if (this.favorites.length === 0) {
      container.innerHTML = this.getEmptyState();
      return;
    }

    container.innerHTML = this.favorites.map(favorite => `
      <div class="favorite-card ${favorite.item.hasDiscount ? 'has-discount' : ''}" data-id="${favorite.id}">
        <div class="card-image-container">
          <img alt="${favorite.type === 'tour' ? favorite.item.title : `${favorite.item.departure_city} - ${favorite.item.arrival_city}`}" 
               class="card-image" 
               src="${favorite.item.image}"
               onerror="this.src='/images/placeholder.jpg'">
         
          <button class="delete-button" onclick="favoritesManager.removeFavorite(${favorite.id})">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
        <div class="card-content">
          <h3 class="card-title">
            ${favorite.type === 'tour' ?
      favorite.item.title :
      `${favorite.item.departure_city || 'Город вылета'} → ${favorite.item.arrival_city || 'Город прилета'}`}
          </h3>
          ${favorite.type === 'tour' ? `
            <p class="card-description">
              ${favorite.item.description || 'Описание недоступно'}
            </p>
          ` : ''}
          <div class="card-meta">
            ${favorite.type === 'tour' ? `
              <span class="card-location">
                <span class="material-symbols-outlined">location_on</span>
                ${favorite.item.city || 'Город не указан'}, ${favorite.item.country || 'Страна не указана'}
              </span>
              ${favorite.item.start_date && favorite.item.end_date ? `
                <span class="card-date">
                  <span class="material-symbols-outlined">calendar_month</span>
                  ${this.formatDate(favorite.item.start_date)} - ${this.formatDate(favorite.item.end_date)}
                </span>
              ` : favorite.item.start_date ? `
                <span class="card-date">
                  <span class="material-symbols-outlined">calendar_month</span>
                  ${this.formatDate(favorite.item.start_date)}
                </span>
              ` : ''}
            ` : `
              <span class="card-location">
                <span class="material-symbols-outlined">flight</span>
                ${favorite.item.airline || 'Авиакомпания'} • ${favorite.item.flight_number || 'Рейс'}
              </span>
              ${favorite.item.departure_time ? `
                <span class="card-date">
                  <span class="material-symbols-outlined">flight_takeoff</span>
                  Вылет: ${this.formatDateTime(favorite.item.departure_time)}
                </span>
              ` : ''}
              ${favorite.item.arrival_time ? `
                <span class="card-date">
                  <span class="material-symbols-outlined">flight_land</span>
                  Прилет: ${this.formatDateTime(favorite.item.arrival_time)}
                </span>
              ` : ''}
            `}
          </div>
          <div class="card-footer">
            <div class="price-container">
              ${favorite.item.hasDiscount ? `
                <div class="price-with-discount">
                  <span class="original-price">€${favorite.item.originalPrice}</span>
                  <span class="final-price">€${favorite.item.price}</span>
                  <div class="discount-text">Скидка ${favorite.item.discountPercent}%</div>
                </div>
              ` : `
                <span class="card-price">€${favorite.item.price || '0'}</span>
              `}
            </div>
            <div class="card-actions">
              ${this.getQuickActionButton(favorite)}
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  getQuickActionButton(favorite) {
    if (favorite.type === 'tour') {
      return `
        <button class="quick-view-button" onclick="favoritesManager.viewTourDetails(${favorite.item.id})">
          <span class="material-symbols-outlined">visibility</span>
          Подробнее
        </button>
      `;
    } else {
      return `
        <button class="quick-view-button" onclick="favoritesManager.viewFlightDetails(${favorite.item.id})">
          <span class="material-symbols-outlined">flight</span>
          Детали рейса
        </button>
      `;
    }
  }

  getEmptyState() {
    return `
      <div class="empty-state">
        <span class="material-symbols-outlined">favorite</span>
        <h3>В избранном пока пусто</h3>
        <p>Добавляйте туры и авиабилеты, чтобы они появились здесь</p>
        <div class="empty-state-actions">
          <button class="load-more-button" onclick="window.location.href='/client/search'">
            Найти туры
          </button>
        </div>
      </div>
    `;
  }

  async removeFavorite(favoriteId) {
    if (!confirm('Удалить из избранного?')) {
      return;
    }
    try {
      await FavoritesService.removeFromFavorites(favoriteId);
      this.favorites = this.favorites.filter(f => f.id !== favoriteId);
      this.renderFavorites();
      this.updateFavoritesCounter();
      this.showNotification('Удалено из избранного','success');
    } catch (error) {
      this.showError('Ошибка при удалении: ' + (error.error || error.message));
    }
  }

  viewTourDetails(tourId) {
    window.location.href = `/client/tour/${tourId}`;
  }

  viewFlightDetails(flightId) {
    window.location.href = `/client/flight/${flightId}`;
  }

  showError(message) {
    const container = document.querySelector('.favorites-grid');
    if (container) {
      container.innerHTML = `
        <div class="error-message">
          <span class="material-symbols-outlined">error</span>
          <p>${message}</p>
          <button onclick="favoritesManager.loadFavorites()" class="load-more-button">
            Попробовать снова
          </button>
        </div>
      `;
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
  window.favoritesManager = new FavoritesManager();
  window.favoritesManager.init();
});