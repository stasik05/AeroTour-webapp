class AddPersonalizedOfferManager {
  constructor() {
    this.form = document.getElementById('addPersonalizedOfferForm');
    this.usersList = document.getElementById('usersList');
    this.selectedUserId = document.getElementById('selectedUserId');
    this.discountPercentInput = document.getElementById('discount_percent');

    this.init();
  }

  async init() {
    await this.loadUsers();
    this.setupEventListeners();
    await this.loadUserData();
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
  async loadUsers() {
    try {
      const response = await fetch('/api/discount/users');
      const result = await response.json();

      if (result.success && result.users) {
        this.renderUsers(result.users);
      } else {
        this.showError('Ошибка загрузки списка клиентов');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      this.showError('Ошибка загрузки клиентов');
    }
  }

  renderUsers(users) {
    if (users.length === 0) {
      this.usersList.innerHTML = '<div class="empty-state">Клиенты не найдены</div>';
      return;
    }

    this.usersList.innerHTML = users.map(user => `
      <div class="user-card" onclick="addOfferManager.selectUser(${user.id}, this)">
        <img src="${user.photo || '/shared/images/default-avatar.png'}" alt="${user.name}" class="user-avatar">
        <div class="user-info">
          <div class="user-name">${user.name} ${user.last_name}</div>
          <div class="user-email">${user.email}</div>
        </div>
      </div>
    `).join('');
  }

  selectUser(userId, element) {
    document.querySelectorAll('.user-card').forEach(card => {
      card.classList.remove('selected');
    });
    element.classList.add('selected');
    this.selectedUserId.value = userId;
  }

  setupEventListeners() {
    if (this.discountPercentInput) {
      this.discountPercentInput.addEventListener('input', () => {
        this.updateDiscountPreview();
      });
    }

    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }
  }

  updateDiscountPreview() {
    const discountPercent = parseFloat(this.discountPercentInput?.value) || 0;
    const originalPrice = 1000;
    const discountAmount = (originalPrice * discountPercent) / 100;
    const finalPrice = originalPrice - discountAmount;

    const discountPreview = document.getElementById('discountPreview');
    const previewElement = discountPreview?.parentElement;

    if (previewElement) {
      previewElement.innerHTML =
        `При цене ${originalPrice}€: <span class="discount-amount">${finalPrice.toFixed(2)}€</span> (экономия ${discountAmount.toFixed(2)}€)`;
    }
  }

  async handleSubmit() {
    const formData = new FormData(this.form);
    const data = Object.fromEntries(formData);

    if (!this.validateForm(data)) {
      return;
    }

    try {
      const submitBtn = this.form.querySelector('button[type="submit"]');
      var originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span class="material-symbols-outlined">pending</span>Создание...';
      submitBtn.disabled = true;

      const response = await fetch('/api/discount/personalized-offers/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccess('Персонализированное предложение успешно создано!');
      } else {
        this.showError(result.message || 'Ошибка при создании предложения');
      }
    } catch (error) {
      console.error('Error:', error);
      this.showError('Ошибка сети. Попробуйте еще раз.');
    } finally {
      const submitBtn = this.form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    }
  }

  validateForm(data) {
    if (!data.user_id) {
      this.showError('Выберите клиента для предложения');
      return false;
    }

    const discountPercent = parseFloat(data.discount_percent);
    if (!discountPercent || discountPercent <= 0 || discountPercent > 100) {
      this.showError('Введите корректный процент скидки (1-100%)');
      return false;
    }

    if (!data.valid_until) {
      this.showError('Выберите дату окончания действия');
      return false;
    }

    const validUntil = new Date(data.valid_until);
    const today = new Date();
    if (validUntil <= today) {
      this.showError('Дата окончания должна быть в будущем');
      return false;
    }

    const offerType = document.querySelector('input[name="offer_type"]:checked')?.value;
    if (offerType === 'tour' && !data.tour_id) {
      this.showError('Выберите тур для предложения');
      return false;
    }

    if (offerType === 'flight' && !data.flight_id) {
      this.showError('Выберите перелет для предложения');
      return false;
    }

    return true;
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
function toggleOfferType() {
  const offerType = document.querySelector('input[name="offer_type"]:checked')?.value;
  const tourSelection = document.getElementById('tourSelection');
  const flightSelection = document.getElementById('flightSelection');

  if (tourSelection) tourSelection.style.display = 'none';
  if (flightSelection) flightSelection.style.display = 'none';

  switch (offerType) {
    case 'tour':
      if (tourSelection) tourSelection.style.display = 'block';
      loadTours();
      break;
    case 'flight':
      if (flightSelection) flightSelection.style.display = 'block';
      loadFlights();
      break;
  }
}

async function loadTours() {
  try {
    const response = await fetch('/api/discount/tours');
    const result = await response.json();

    const tourSelect = document.getElementById('tour_id');
    if (!tourSelect) return;

    tourSelect.innerHTML = '<option value="">-- Выберите тур --</option>';

    if (result.success && result.tours) {
      result.tours.forEach(tour => {
        const option = document.createElement('option');
        option.value = tour.id;
        option.textContent = `${tour.title} (${tour.country}, ${tour.city}) - ${tour.price}€`;
        tourSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading tours:', error);
  }
}

async function loadFlights() {
  try {
    const response = await fetch('/api/discount/flights');
    const result = await response.json();

    const flightSelect = document.getElementById('flight_id');
    if (!flightSelect) return;

    flightSelect.innerHTML = '<option value="">-- Выберите авиаперелет --</option>';

    if (result.success && result.flights) {
      result.flights.forEach(flight => {
        const option = document.createElement('option');
        option.value = flight.id;
        option.textContent = `${flight.airline} ${flight.flight_number} (${flight.departure_city} → ${flight.arrival_city}) - ${flight.price}€`;
        flightSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading flights:', error);
  }
}

let addOfferManager;
document.addEventListener('DOMContentLoaded', () => {
  addOfferManager = new AddPersonalizedOfferManager();
});