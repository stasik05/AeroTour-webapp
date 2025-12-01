class ViewPersonalizedOffersManager {
  constructor() {
    this.offersList = document.getElementById('offersList');
    this.searchBtn = document.getElementById('searchBtn');
    this.searchQuery = document.getElementById('searchQuery');
    this.statusFilter = document.getElementById('statusFilter');
    this.offerTypeFilter = document.getElementById('offerTypeFilter');
    this.dateFrom = document.getElementById('dateFrom');

    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.loadOffers()
    await this.loadUserData()
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
  setupEventListeners() {
    this.searchBtn.addEventListener('click', () => {
      this.loadOffers();
    });

    this.searchQuery.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.loadOffers();
      }
    });

    [this.statusFilter, this.offerTypeFilter, this.dateFrom].forEach(element => {
      element.addEventListener('change', () => {
        this.loadOffers();
      });
    });
  }

  async loadOffers() {
    try {
      const params = new URLSearchParams({
        query: this.searchQuery.value,
        status: this.statusFilter.value,
        offerType: this.offerTypeFilter.value,
        dateFrom: this.dateFrom.value
      });

      const response = await fetch(`/api/discount/personalized-offers/search?${params}`);
      const result = await response.json();

      if (result.success) {
        this.renderOffers(result.offers);
      } else {
        this.showError('Ошибка загрузки предложений');
      }
    } catch (error) {
      console.error('Error loading offers:', error);
      this.showError('Ошибка загрузки предложений');
    }
  }

  renderOffers(offers) {
    if (offers.length === 0) {
      this.offersList.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-outlined">search_off</span>
          <h3>Предложения не найдены</h3>
          <p>Попробуйте изменить параметры поиска</p>
        </div>
      `;
      return;
    }

    this.offersList.innerHTML = offers.map(offer => `
      <div class="offer-card" id="offer-${offer.id}">
        ${offer.user ? `
          <div class="user-info">
            <img src="${offer.user.photo || '/shared/images/default-avatar.png'}" alt="${offer.user.name}" class="user-ava">
            <div class="user-details">
              <div class="user-name">${offer.user.name} ${offer.user.last_name}</div>
              <div class="user-email">${offer.user.email}</div>
            </div>
          </div>
        ` : ''}
        
        <div class="offer-header">
          <h3 class="offer-title">
            Персональное предложение
            <span class="type-badge">${this.getTypeBadgeText(offer.offer_type)}</span>
          </h3>
          <div class="offer-percent">-${offer.discount_percent}%</div>
        </div>
        
        ${offer.description ? `
          <div class="offer-description">${offer.description}</div>
        ` : ''}
        
        <div class="offer-info">
          <div class="info-item">
            <span class="info-label">Действует до</span>
            <span class="info-value">${new Date(offer.valid_until).toLocaleDateString('ru-RU')}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Тип предложения</span>
            <span class="info-value">
              ${this.getOfferInfoText(offer)}
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">Статус</span>
            <span class="status-badge ${offer.status_class}">${offer.status}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Дата создания</span>
            <span class="info-value">${new Date(offer.created_at).toLocaleDateString('ru-RU')}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  getOfferInfoText(offer) {
    if (offer.tour_id && offer.tour) {
      return `Тур: ${offer.tour.title}`;
    } else if (offer.flight_id && offer.flight) {
      return `Рейс: ${offer.flight.flight_number}`;
    } else {
      return 'Общее предложение';
    }
  }

  getTypeBadgeText(type) {
    const types = {
      'general': 'Общее',
      'tour': 'На тур',
      'flight': 'На рейс'
    };
    return types[type] || type;
  }

  editOffer(offerId) {
    window.location.href = `/manager/main-menu/personalized-offers/edit/${offerId}`;
  }

  async deleteOffer(offerId, userName) {
    if (!confirm(`Вы уверены, что хотите удалить персонализированное предложение для ${userName}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/discount/personalized-offers/${offerId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccess('Предложение успешно удалено!');
        const offerCard = document.getElementById(`offer-${offerId}`);
        if (offerCard) {
          offerCard.style.opacity = '0';
          setTimeout(() => {
            offerCard.remove();
            if (document.querySelectorAll('.offer-card').length === 0) {
              this.loadOffers();
            }
          }, 300);
        }
      } else {
        this.showError(result.message || 'Ошибка при удалении предложения');
      }
    } catch (error) {
      console.error('Error deleting offer:', error);
      this.showError('Ошибка сети');
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

let viewOffersManager;

document.addEventListener('DOMContentLoaded', () => {
  viewOffersManager = new ViewPersonalizedOffersManager();
});