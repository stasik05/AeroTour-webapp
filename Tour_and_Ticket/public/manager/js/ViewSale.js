class ViewSalesManager {
  constructor() {
    this.discountsList = document.getElementById('discountsList');
    this.searchBtn = document.getElementById('searchBtn');
    this.searchQuery = document.getElementById('searchQuery');
    this.statusFilter = document.getElementById('statusFilter');
    this.discountTypeFilter = document.getElementById('discountTypeFilter');
    this.dateFrom = document.getElementById('dateFrom');
    this.statsContainer = document.getElementById('statsContainer');

    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.loadDiscounts();
    this.loadStats();
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
      this.loadDiscounts();
    });

    this.searchQuery.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.loadDiscounts();
      }
    });

    [this.statusFilter, this.discountTypeFilter, this.dateFrom].forEach(element => {
      element.addEventListener('change', () => {
        this.loadDiscounts();
      });
    });
  }

  async loadDiscounts() {
    try {
      const params = new URLSearchParams({
        query: this.searchQuery.value,
        status: this.statusFilter.value,
        discountType: this.discountTypeFilter.value,
        dateFrom: this.dateFrom.value
      });

      const response = await fetch(`/api/discount/sales/search?${params}`);
      const result = await response.json();

      if (result.success) {
        this.renderDiscounts(result.discounts);
      } else {
        this.showError('Ошибка загрузки скидок');
      }
    } catch (error) {
      console.error('Error loading discounts:', error);
      this.showError('Ошибка загрузки скидок');
    }
  }

  async loadStats() {
    try {
      const response = await fetch('/api/discount/stats');
      const result = await response.json();

      if (result.success) {
        this.renderStats(result.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  renderDiscounts(discounts) {
    if (discounts.length === 0) {
      this.discountsList.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined">search_off</span>
                    <h3>Скидки не найдены</h3>
                    <p>Попробуйте изменить параметры поиска</p>
                </div>
            `;
      return;
    }

    this.discountsList.innerHTML = discounts.map(discount => `
            <div class="discount-card">
                <div class="discount-header">
                    <h3 class="discount-title">${discount.title}</h3>
                    <div class="discount-percent">-${discount.discount_percent}%</div>
                </div>
                
                ${discount.description ? `
                    <div class="discount-description">${discount.description}</div>
                ` : ''}
                
                <div class="discount-info">
                    <div class="info-item">
                        <span class="info-label">Период действия</span>
                        <span class="info-value">${discount.date_info}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Тип скидки</span>
                        <span class="info-value">
                            ${this.getDiscountInfoText(discount)}
                            <span class="type-badge">${this.getTypeBadgeText(discount.discount_type)}</span>
                        </span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Статус</span>
                        <span class="status-badge ${discount.status_class}">${discount.status}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Дата создания</span>
                        <span class="info-value">${new Date(discount.created_at).toLocaleDateString('ru-RU')}</span>
                    </div>
                </div>
            </div>
        `).join('');
  }

  getDiscountInfoText(discount) {
    if (discount.tour_id && discount.tour) {
      return `Тур: ${discount.tour.title}`;
    } else if (discount.flight_id && discount.flight) {
      return `Рейс: ${discount.flight.flight_number}`;
    } else if (discount.airline) {
      return `Авиакомпания: ${discount.airline}`;
    } else {
      return 'Общая скидка';
    }
  }

  getTypeBadgeText(type) {
    const types = {
      'all': 'Общая',
      'tour': 'На тур',
      'flight': 'На рейс',
      'airline': 'На авиакомпанию'
    };
    return types[type] || type;
  }

  renderStats(stats) {
    const totalDiscounts = stats.discounts.reduce((sum, item) => sum + item.count, 0);
    const activeDiscounts = stats.discounts.find(s => s.status === 'Активна')?.count || 0;

    this.statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${totalDiscounts}</div>
                <div class="stat-label">Всего скидок</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${activeDiscounts}</div>
                <div class="stat-label">Активных скидок</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.discount_types?.length || 0}</div>
                <div class="stat-label">Типов скидок</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.offers?.reduce((sum, item) => sum + item.count, 0) || 0}</div>
                <div class="stat-label">Персональных предложений</div>
            </div>
        `;
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
document.addEventListener('DOMContentLoaded', () => {
  new ViewSalesManager();
});