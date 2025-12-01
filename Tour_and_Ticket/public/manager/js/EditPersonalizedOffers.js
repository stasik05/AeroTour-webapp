class EditPersonalizedOfferManager {
  constructor() {
    this.form = document.getElementById('editPersonalizedOfferForm');
    this.statusBadge = document.getElementById('statusBadge');
    this.userInfo = document.getElementById('userInfo');
    this.offers = [];
    this.currentOffer = null;

    this.isLoading = false;
    this.dataLoaded = false;

    this.init();
  }

  async init() {
    if (this.isLoading) return;

    this.isLoading = true;

    try {
      this.showLoadingState();
      await Promise.all([
        this.loadAllOffers(),
        this.loadTours(),
        this.loadFlights(),
        this.loadUserData()
      ]);
      if (this.offers.length > 0) {
        this.createOfferSelector();
        this.selectOffer(this.offers[0]);
      } else {
        this.showError('Нет доступных предложений для редактирования');
      }

      this.setupEventListeners();
      this.dataLoaded = true;

    } catch (error) {
      console.error('Initialization error:', error);
      this.showError('Ошибка загрузки данных');
    } finally {
      this.isLoading = false;
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
  showLoadingState() {
    if (this.statusBadge) {
      this.statusBadge.textContent = 'Загрузка...';
      this.statusBadge.className = 'status-badge status-active';
    }
  }

  async loadAllOffers() {
    try {
      const response = await fetch('/api/discount/personalized-offers/all');
      const result = await response.json();

      if (result.success && result.offers) {
        this.offers = result.offers;
      } else {
        this.showError('Ошибка загрузки списка предложений');
      }
    } catch (error) {
      console.error('Error loading offers:', error);
      this.showError('Ошибка загрузки данных предложений');
    }
  }

  createOfferSelector() {
    const formTitle = document.querySelector('.form-title');
    if (!formTitle) return;
    const existingSelector = document.querySelector('.offer-selector');
    if (existingSelector) {
      existingSelector.remove();
    }

    const selectorContainer = document.createElement('div');
    selectorContainer.className = 'offer-selector';
    selectorContainer.style.cssText = `
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: rgba(30, 41, 59, 0.6);
      border-radius: 0.5rem;
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;

    const selectorLabel = document.createElement('label');
    selectorLabel.className = 'form-label';
    selectorLabel.textContent = 'Выберите предложение для редактирования:';
    selectorLabel.style.marginBottom = '0.5rem';
    selectorLabel.style.display = 'block';

    const select = document.createElement('select');
    select.className = 'form-select';
    select.style.marginBottom = '0';

    this.offers.forEach((offer, index) => {
      const userInfo = offer.user ? `${offer.user.name} ${offer.user.last_name}` : 'Неизвестный клиент';
      const offerInfo = this.getOfferInfoText(offer);

      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${userInfo} - ${offer.discount_percent}% (${offerInfo})`;
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      const selectedIndex = parseInt(e.target.value);
      this.selectOffer(this.offers[selectedIndex]);
    });

    selectorContainer.appendChild(selectorLabel);
    selectorContainer.appendChild(select);
    formTitle.parentNode.insertBefore(selectorContainer, formTitle.nextSibling);
  }

  selectOffer(offer) {
    this.currentOffer = offer;
    this.populateForm(offer);
  }

  populateForm(offer) {
    try {
      document.getElementById('offerId').value = offer.id;
      document.getElementById('discount_percent').value = offer.discount_percent;
      document.getElementById('valid_until').value = offer.valid_until.split('T')[0];
      document.getElementById('description').value = offer.description || '';
      if (offer.user) {
        this.userInfo.innerHTML = `
          <div class="user-details">
            <img src="${offer.user.photo || '/shared/images/default-avatar.png'}" alt="${offer.user.name}" class="user-ava">
            <div class="user-text">
              <div class="user-name">${offer.user.name} ${offer.user.last_name}</div>
              <div class="user-email">${offer.user.email}</div>
            </div>
          </div>
        `;
      } else {
        this.userInfo.innerHTML = `
          <div class="user-details">
            <img src="/shared/images/default-avatar.png" alt="Неизвестный клиент" class="user-ava">
            <div class="user-text">
              <div class="user-name">Неизвестный клиент</div>
              <div class="user-email">Информация о клиенте недоступна</div>
            </div>
          </div>
        `;
      }
      const offerType = offer.offer_type || 'general';
      this.setRadioValue('offer_type', offerType);
      this.loadProductData(offerType, offer);
      this.updateStatusBadge(offer);
      this.updateDiscountPreview();

    } catch (error) {
      console.error('Error populating form:', error);
      this.showError('Ошибка заполнения формы');
    }
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

  setRadioValue(name, value) {
    const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (radio) {
      radio.checked = true;
    }
  }

  loadProductData(offerType, offer) {

    this.toggleOfferType(offerType);
    setTimeout(() => {
      if (offerType === 'tour' && offer.tour_id) {
        document.getElementById('tour_id').value = offer.tour_id;
      } else if (offerType === 'flight' && offer.flight_id) {
        document.getElementById('flight_id').value = offer.flight_id;
      }
    }, 100);
  }
  toggleOfferType(offerType) {
    const tourSelection = document.getElementById('tourSelection');
    const flightSelection = document.getElementById('flightSelection');

    if (tourSelection) tourSelection.style.display = 'none';
    if (flightSelection) flightSelection.style.display = 'none';

    switch (offerType) {
      case 'tour':
        if (tourSelection) tourSelection.style.display = 'block';
        break;
      case 'flight':
        if (flightSelection) flightSelection.style.display = 'block';
        break;
    }
  }

  async loadTours() {
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

  async loadFlights() {
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

  updateStatusBadge(offer) {
    if (!this.statusBadge) return;

    this.statusBadge.textContent = offer.status;
    this.statusBadge.className = `status-badge ${offer.status_class}`;
  }

  setupEventListeners() {
    const discountPercentInput = document.getElementById('discount_percent');
    if (discountPercentInput) {
      discountPercentInput.addEventListener('input', () => {
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
    const discountPercent = parseFloat(document.getElementById('discount_percent')?.value) || 0;
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
    if (!this.dataLoaded || !this.currentOffer) {
      this.showError('Данные еще не загружены или предложение не выбрано');
      return;
    }
    const formData = new FormData(this.form);
    const data = Object.fromEntries(formData);
    if (this.currentOffer.user && this.currentOffer.user.id) {
      data.user_id = this.currentOffer.user.id;
    } else if (this.currentOffer.user_id) {
      data.user_id = this.currentOffer.user_id;
    } else {
      this.showError('Не удалось определить пользователя для предложения');
      return;
    }

    if (!this.validateForm(data)) {
      return;
    }

    try {
      const submitBtn = this.form.querySelector('button[type="submit"]');
      var originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span class="material-symbols-outlined">pending</span>Обновление...';
      submitBtn.disabled = true;
      const response = await fetch(`/api/discount/personalized-offers/${this.currentOffer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccess('Предложение успешно обновлено!');
        setTimeout(() => {
          this.loadAllOffers().then(() => {
            this.createOfferSelector();
            const currentIndex = this.offers.findIndex(o => o.id === this.currentOffer.id);
            if (currentIndex !== -1) {
              this.selectOffer(this.offers[currentIndex]);
            }
          });
        }, 1000);
      } else {
        this.showError(result.message || 'Ошибка при обновлении предложения');
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
      break;
    case 'flight':
      if (flightSelection) flightSelection.style.display = 'block';
      break;
  }
}

let editOfferManager;

document.addEventListener('DOMContentLoaded', () => {
  editOfferManager = new EditPersonalizedOfferManager();
});