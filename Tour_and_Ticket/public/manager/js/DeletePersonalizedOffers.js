class DeletePersonalizedOffersManager {
  constructor() {
    this.offersList = document.getElementById('offersList');
    this.searchBtn = document.getElementById('searchBtn');
    this.searchQuery = document.getElementById('searchQuery');
    this.statusFilter = document.getElementById('statusFilter');
    this.offerTypeFilter = document.getElementById('offerTypeFilter');

    this.selectedOffers = new Set();

    this.init();
  }


  async init() {
    this.setupEventListeners();
    this.loadOffers();
    await this.loadUserData();
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

    [this.statusFilter, this.offerTypeFilter].forEach(element => {
      element.addEventListener('change', () => {
        this.loadOffers();
      });
    });
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
  async loadOffers() {
    try {
      const params = new URLSearchParams({
        query: this.searchQuery.value,
        status: this.statusFilter.value,
        offerType: this.offerTypeFilter.value
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
            <input type="checkbox" id="select-${offer.id}" 
                   onchange="deleteOffersManager.toggleSelection(${offer.id})"
                   style="margin-right: 0.5rem;">
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

        <div class="offer-actions">
          <button class="btn btn-danger btn-sm" onclick="deleteSingleOffer(${offer.id}, '${this.escapeHtml(offer.user ? offer.user.name : 'предложение')}')">
            <span class="material-symbols-outlined">delete_forever</span>
            Удалить
          </button>
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

  toggleSelection(offerId) {
    const checkbox = document.getElementById(`select-${offerId}`);
    if (checkbox.checked) {
      this.selectedOffers.add(offerId);
    } else {
      this.selectedOffers.delete(offerId);
    }
  }
  selectAll() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"][id^="select-"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = true;
      const offerId = parseInt(checkbox.id.replace('select-', ''));
      this.selectedOffers.add(offerId);
    });
  }
  deselectAll() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"][id^="select-"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
    this.selectedOffers.clear();
  }

  async deleteSelected() {
    if (this.selectedOffers.size === 0) {
      this.showError('Выберите хотя бы одно предложение для удаления');
      return;
    }

    const offerList = Array.from(this.selectedOffers).join(', ');
    if (!confirm(`Вы уверены, что хотите удалить ${this.selectedOffers.size} выбранных предложений? Это действие невозможно отменить.\n\nID предложений: ${offerList}`)) {
      return;
    }

    try {
      const deletePromises = Array.from(this.selectedOffers).map(id =>
        fetch(`/api/discount/personalized-offers/${id}`, {
          method: 'DELETE'
        })
      );

      const results = await Promise.all(deletePromises);
      const successfulDeletes = results.filter(result => result.ok).length;

      if (successfulDeletes > 0) {
        this.showSuccess(`Успешно удалено ${successfulDeletes} предложений`);
        this.selectedOffers.clear();
        setTimeout(() => {
          this.loadOffers();
        }, 2000);
      } else {
        this.showError('Не удалось удалить выбранные предложения');
      }
    } catch (error) {
      console.error('Error deleting selected offers:', error);
      this.showError('Ошибка при удалении предложений');
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
async function deleteSingleOffer(offerId, userName) {
  if (!confirm(`Вы уверены, что хотите удалить персонализированное предложение для ${userName}? Это действие невозможно отменить.`)) {
    return;
  }
  try {
    const response = await fetch(`/api/discount/personalized-offers/${offerId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
      deleteOffersManager.showSuccess('Предложение успешно удалено!');
      const offerCard = document.getElementById(`offer-${offerId}`);
      if (offerCard) {
        offerCard.style.opacity = '0';
        setTimeout(() => {
          offerCard.remove();
          if (document.querySelectorAll('.offer-card').length === 0) {
            deleteOffersManager.loadOffers();
          }
        }, 300);
      }
    } else {
      deleteOffersManager.showError(result.message || 'Ошибка при удалении предложения');
    }
  } catch (error) {
    console.error('Error deleting offer:', error);
    deleteOffersManager.showError('Ошибка сети');
  }
}

let deleteOffersManager;
document.addEventListener('DOMContentLoaded', () => {
  deleteOffersManager = new DeletePersonalizedOffersManager();
});