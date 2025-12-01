class EditSaleManager {
  constructor() {
    this.form = document.getElementById('editDiscountForm');
    this.statusBadge = document.getElementById('statusBadge');
    this.discounts = [];
    this.currentDiscount = null;

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
        this.loadAllDiscounts(),
        this.loadAirlines(),
        this.loadUserData()
      ]);
      if (this.discounts.length > 0) {
        this.createDiscountSelector();
        this.selectDiscount(this.discounts[0]);
      } else {
        this.showError('Нет доступных скидок для редактирования');
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
      this.statusBadge.className = 'status-badge status-planned';
    }
  }

  async loadAllDiscounts() {
    try {
      const response = await fetch('/api/discount/sales/all');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success && result.discounts) {
        this.discounts = result.discounts;
      } else {
        this.showError('Ошибка загрузки списка скидок');
      }
    } catch (error) {
      console.error('Error loading discounts:', error);
      this.showError('Ошибка загрузки данных скидок');
    }
  }

  createDiscountSelector() {
    const formTitle = document.querySelector('.form-title');
    if (!formTitle) return;
    const existingSelector = document.querySelector('.discount-selector');
    if (existingSelector) {
      existingSelector.remove();
    }

    const selectorContainer = document.createElement('div');
    selectorContainer.className = 'discount-selector';
    selectorContainer.style.cssText = `
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: rgba(30, 41, 59, 0.6);
      border-radius: 0.5rem;
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;

    const selectorLabel = document.createElement('label');
    selectorLabel.className = 'form-label';
    selectorLabel.textContent = 'Выберите скидку для редактирования:';
    selectorLabel.style.marginBottom = '0.5rem';
    selectorLabel.style.display = 'block';

    const select = document.createElement('select');
    select.className = 'form-select';
    select.style.marginBottom = '0';

    this.discounts.forEach((discount, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${discount.title} (ID: ${discount.id}) - ${discount.discount_percent}%`;
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      const selectedIndex = parseInt(e.target.value);
      this.selectDiscount(this.discounts[selectedIndex]);
    });

    selectorContainer.appendChild(selectorLabel);
    selectorContainer.appendChild(select);
    formTitle.parentNode.insertBefore(selectorContainer, formTitle.nextSibling);
  }

  selectDiscount(discount) {
    this.currentDiscount = discount;
    this.populateForm(discount);
  }

  populateForm(discount) {
    try {
      this.setFormValue('discountId', discount.id);
      this.setFormValue('title', discount.title);
      this.setFormValue('description', discount.description);
      this.setFormValue('discount_percent', discount.discount_percent);
      this.setFormValue('start_date', this.formatDateForInput(discount.start_date));
      this.setFormValue('end_date', this.formatDateForInput(discount.end_date));

      const isActiveCheckbox = document.getElementById('is_active');
      if (isActiveCheckbox) {
        isActiveCheckbox.checked = Boolean(discount.is_active);
      }
      const applyTo = discount.discount_type || this.determineApplyToType(discount);
      this.setRadioValue('apply_to', applyTo);
      this.loadProductData(applyTo, discount);
      this.updateStatusBadge(discount);
      this.updateDiscountPreview();
    } catch (error) {
      console.error('Error populating form:', error);
      this.showError('Ошибка заполнения формы');
    }
  }

  setFormValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.value = value || '';
    }
  }

  setRadioValue(name, value) {
    const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (radio) {
      radio.checked = true;
    }
  }

  formatDateForInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }

  determineApplyToType(discount) {
    if (discount.tour_id) return 'tour';
    if (discount.flight_id || discount.airline) return 'flight';
    return 'all';
  }

  async loadProductData(applyTo, discount) {
    this.toggleProductSelection(applyTo);
    switch (applyTo) {
      case 'tour':
        if (discount.tour_id) {
          await this.loadAndSelectTour(discount.tour_id);
        }
        break;
      case 'flight':
        if (discount.flight_id) {
          await this.loadAndSelectFlight(discount.flight_id);
        } else if (discount.airline) {
          this.selectAirline(discount.airline);
        }
        break;
    }
  }

  toggleProductSelection(applyTo) {
    const tourSelection = document.getElementById('tourSelection');
    const flightSelection = document.getElementById('flightSelection');

    if (tourSelection) tourSelection.style.display = 'none';
    if (flightSelection) flightSelection.style.display = 'none';

    switch (applyTo) {
      case 'tour':
        if (tourSelection) tourSelection.style.display = 'block';
        this.loadTours();
        break;
      case 'flight':
        if (flightSelection) flightSelection.style.display = 'block';
        this.loadFlights();
        break;
    }
  }

  toggleFlightSelection() {
    const flightSelect = document.getElementById('flight_id');
    const airlineSelect = document.getElementById('airline');

    if (!flightSelect || !airlineSelect) return;

    if (flightSelect.value) {
      airlineSelect.value = '';
    }
    if (airlineSelect.value) {
      flightSelect.value = '';
    }
  }

  async loadAndSelectTour(tourId) {
    await this.loadTours();
    const tourSelect = document.getElementById('tour_id');
    if (tourSelect && tourId) {
      setTimeout(() => {
        tourSelect.value = tourId;
      }, 100);
    }
  }

  async loadAndSelectFlight(flightId) {
    await this.loadFlights();
    const flightSelect = document.getElementById('flight_id');
    if (flightSelect && flightId) {
      setTimeout(() => {
        flightSelect.value = flightId;
      }, 100);
    }
  }

  selectAirline(airline) {
    const airlineSelect = document.getElementById('airline');
    if (airlineSelect && airline) {
      airlineSelect.value = airline;
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
      const tourSelect = document.getElementById('tour_id');
      if (tourSelect) {
        tourSelect.innerHTML = '<option value="">Ошибка загрузки туров</option>';
      }
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
      const flightSelect = document.getElementById('flight_id');
      if (flightSelect) {
        flightSelect.innerHTML = '<option value="">Ошибка загрузки перелетов</option>';
      }
    }
  }

  async loadAirlines() {
    try {
      const response = await fetch('/api/discount/airlines');
      const result = await response.json();

      const airlineSelect = document.getElementById('airline');
      if (!airlineSelect) return;

      airlineSelect.innerHTML = '<option value="">-- Выберите авиакомпанию --</option>';

      if (result.success && result.airlines) {
        result.airlines.forEach(airline => {
          const option = document.createElement('option');
          option.value = airline;
          option.textContent = airline;
          airlineSelect.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Error loading airlines:', error);
      const airlineSelect = document.getElementById('airline');
      if (airlineSelect) {
        airlineSelect.innerHTML = '<option value="">Ошибка загрузки авиакомпаний</option>';
      }
    }
  }

  updateStatusBadge(discount) {
    if (!this.statusBadge) return;
    const status = discount.status || 'Активна';
    this.statusBadge.textContent = status;
    let statusClass = 'status-active';
    if (discount.status_class) {
      statusClass = discount.status_class;
    } else if (!discount.is_active) {
      statusClass = 'status-inactive';
    } else if (new Date(discount.end_date) < new Date()) {
      statusClass = 'status-expired';
    } else if (new Date(discount.start_date) > new Date()) {
      statusClass = 'status-planned';
    }
    this.statusBadge.className = `status-badge ${statusClass}`;
  }

  setupEventListeners() {
    const discountPercentInput = document.getElementById('discount_percent');
    if (discountPercentInput) {
      discountPercentInput.addEventListener('input', () => {
        this.updateDiscountPreview();
      });
    }
    const radioButtons = document.querySelectorAll('input[name="apply_to"]');
    radioButtons.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.toggleProductSelection(e.target.value);
      });
    });

    const flightSelect = document.getElementById('flight_id');
    const airlineSelect = document.getElementById('airline');

    if (flightSelect) {
      flightSelect.addEventListener('change', () => {
        this.toggleFlightSelection();
      });
    }

    if (airlineSelect) {
      airlineSelect.addEventListener('change', () => {
        this.toggleFlightSelection();
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
    if (!this.dataLoaded || !this.currentDiscount) {
      this.showError('Данные еще не загружены или скидка не выбрана');
      return;
    }

    const formData = new FormData(this.form);
    const data = Object.fromEntries(formData);
    data.is_active = data.is_active === 'true' ? 1 : 0;
    const airlineSelect = document.getElementById('airline');
    if (airlineSelect) {
      data.airline = airlineSelect.value;
    }
    if (!this.validateForm(data)) {
      return;
    }

    try {
      const submitBtn = this.form.querySelector('button[type="submit"]');
      var originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span class="material-symbols-outlined">pending</span>Обновление...';
      submitBtn.disabled = true;
      const response = await fetch(`/api/discount/sales/${this.currentDiscount.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
      }
      const result = await response.json();
      if (result.success) {
        setTimeout(() => {
          this.loadAllDiscounts().then(() => {
            this.showSuccess('Скидка успешно обновлена!');
            this.createDiscountSelector();
            const currentIndex = this.discounts.findIndex(d => d.id === this.currentDiscount.id);
            if (currentIndex !== -1) {
              this.selectDiscount(this.discounts[currentIndex]);
            }
          });
        }, 1000);
      } else {
        this.showError(result.message || 'Ошибка при обновлении скидки');
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
    if (!data.title || !data.title.trim()) {
      this.showError('Введите название скидки');
      return false;
    }

    const discountPercent = parseFloat(data.discount_percent);
    if (!discountPercent || discountPercent <= 0 || discountPercent > 100) {
      this.showError('Введите корректный процент скидки (1-100%)');
      return false;
    }

    if (!data.start_date) {
      this.showError('Выберите дату начала действия');
      return false;
    }

    if (!data.end_date) {
      this.showError('Выберите дату окончания действия');
      return false;
    }

    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    if (endDate <= startDate) {
      this.showError('Дата окончания должна быть позже даты начала');
      return false;
    }

    const applyTo = document.querySelector('input[name="apply_to"]:checked')?.value;
    if (applyTo === 'tour' && !data.tour_id) {
      this.showError('Выберите тур для применения скидки');
      return false;
    }

    if (applyTo === 'flight') {
      const hasFlight = !!data.flight_id;
      const hasAirline = !!data.airline;

      if (!hasFlight && !hasAirline) {
        this.showError('Выберите авиаперелет или авиакомпанию для применения скидки');
        return false;
      }

      if (hasFlight && hasAirline) {
        this.showError('Выберите либо конкретный рейс, либо авиакомпанию, но не оба варианта одновременно');
        return false;
      }
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

document.addEventListener('DOMContentLoaded', () => {
  new EditSaleManager();
});