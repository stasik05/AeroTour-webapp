class DeleteSaleManager
{
  constructor() {
    this.discountsList = document.getElementById('discountsList');
    this.searchBtn = document.getElementById('searchBtn');
    this.searchQuery = document.getElementById('searchQuery');
    this.statusFilter = document.getElementById('statusFilter');
    this.discountTypeFilter = document.getElementById('discountTypeFilter');

    this.selectedDiscounts = new Set();

    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.loadDiscounts();
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

    [this.statusFilter, this.discountTypeFilter].forEach(element => {
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
        discountType: this.discountTypeFilter.value
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
            <div class="discount-card" id="discount-${discount.id}">
                <div class="discount-header">
                    <h3 class="discount-title">
                        <input type="checkbox" id="select-${discount.id}" 
                               onchange="deleteSaleManager.toggleSelection(${discount.id})"
                               style="margin-right: 0.5rem;">
                        ${discount.title}
                    </h3>
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

                <div class="discount-actions">
                    <button class="btn btn-danger btn-sm" onclick="deleteSingleDiscount(${discount.id}, '${this.escapeHtml(discount.title)}')">
                        <span class="material-symbols-outlined">delete_forever</span>
                        Удалить
                    </button>
                  
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

  toggleSelection(discountId) {
    const checkbox = document.getElementById(`select-${discountId}`);
    if (checkbox.checked) {
      this.selectedDiscounts.add(discountId);
    } else {
      this.selectedDiscounts.delete(discountId);
    }
  }

  selectAll() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"][id^="select-"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = true;
      const discountId = parseInt(checkbox.id.replace('select-', ''));
      this.selectedDiscounts.add(discountId);
    });
  }

  deselectAll() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"][id^="select-"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
    this.selectedDiscounts.clear();
  }

  async deleteSelected() {
    if (this.selectedDiscounts.size === 0) {
      this.showError('Выберите хотя бы одну скидку для удаления');
      return;
    }

    const discountList = Array.from(this.selectedDiscounts).join(', ');
    if (!confirm(`Вы уверены, что хотите удалить ${this.selectedDiscounts.size} выбранных скидок? Это действие невозможно отменить.\n\nID скидок: ${discountList}`)) {
      return;
    }

    try {
      const deletePromises = Array.from(this.selectedDiscounts).map(id =>
        fetch(`/api/discount/sales/${id}`, {
          method: 'DELETE'
        })
      );

      const results = await Promise.all(deletePromises);
      const successfulDeletes = results.filter(result => result.ok).length;

      if (successfulDeletes > 0) {
        this.showSuccess(`Успешно удалено ${successfulDeletes} скидок`);
        this.selectedDiscounts.clear();
        setTimeout(() => {
          this.loadDiscounts();
        }, 2000);
      } else {
        this.showError('Не удалось удалить выбранные скидки');
      }
    } catch (error) {
      console.error('Error deleting selected discounts:', error);
      this.showError('Ошибка при удалении скидок');
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
async function deleteSingleDiscount(discountId, discountTitle) {
  if (!confirm(`Вы уверены, что хотите удалить скидку "${discountTitle}"? Это действие невозможно отменить.`)) {
    return;
  }

  try {
    const response = await fetch(`/api/discount/sales/${discountId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
      deleteSaleManager.showSuccess('Скидка успешно удалена!');
      const discountCard = document.getElementById(`discount-${discountId}`);
      if (discountCard) {
        discountCard.style.opacity = '0';
        setTimeout(() => {
          discountCard.remove();
          if (document.querySelectorAll('.discount-card').length === 0) {
            deleteSaleManager.loadDiscounts();
          }
        }, 300);
      }
    } else {
      deleteSaleManager.showError(result.message || 'Ошибка при удалении скидки');
    }
  } catch (error) {
    console.error('Error deleting discount:', error);
    deleteSaleManager.showError('Ошибка сети');
  }

}

let deleteSaleManager;

document.addEventListener('DOMContentLoaded', () => {
  deleteSaleManager = new DeleteSaleManager();
});