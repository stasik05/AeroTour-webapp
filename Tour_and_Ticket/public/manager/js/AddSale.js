class AddDiscountManager
{
  constructor() {
    this.form = document.getElementById('addDiscountForm');
    this.discountPercentInput = document.getElementById('discount_percent');
    this.discountPreview = document.getElementById('discountPreview');

    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.updateDiscountPreview();
    this.loadInitialData();
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
  setupEventListeners() {
    this.discountPercentInput.addEventListener('input', () => {
      this.updateDiscountPreview();
    });
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
  }
  async loadInitialData() {
    await this.loadAirlines();
  }
  updateDiscountPreview() {
    const discountPercent = parseFloat(this.discountPercentInput.value) || 0;
    const originalPrice = 1000;
    const discountAmount = (originalPrice * discountPercent) / 100;
    const finalPrice = originalPrice - discountAmount;

    if (discountPercent > 0 && this.discountPreview) {
      this.discountPreview.textContent = `${finalPrice.toFixed(2)}€`;
      const previewElement = this.discountPreview.parentElement;
      if (previewElement) {
        previewElement.innerHTML =
          `При цене ${originalPrice}€: <span class="discount-amount">${finalPrice.toFixed(2)}€</span> (экономия ${discountAmount.toFixed(2)}€)`;
      }
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
      submitBtn.innerHTML = '<span class="material-symbols-outlined">pending</span>Сохранение...';
      submitBtn.disabled = true;

      const response = await fetch('/api/discount/sales/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
      }

      const result = await response.json();

      if (result.success) {
        this.showSuccess('Скидка успешно добавлена!');
      } else {
        this.showError(result.message || 'Ошибка при добавлении скидки');
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

    if (!data.discount_percent || data.discount_percent <= 0 || data.discount_percent > 100) {
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
function toggleProductSelection() {
  const applyTo = document.querySelector('input[name="apply_to"]:checked')?.value;
  const tourSelection = document.getElementById('tourSelection');
  const flightSelection = document.getElementById('flightSelection');
  const airlineSelection = document.getElementById('airlineSelection');

  if (!applyTo) return;
  const tourSelect = document.getElementById('tour_id');
  const flightSelect = document.getElementById('flight_id');
  const airlineSelect = document.getElementById('airline');
  if (tourSelect) tourSelect.value = '';
  if (flightSelect) flightSelect.value = '';
  if (airlineSelect) airlineSelect.value = '';
  if (applyTo === 'tour') {
    if (tourSelection) tourSelection.style.display = 'block';
    if (flightSelection) flightSelection.style.display = 'none';
    if (airlineSelection) airlineSelection.style.display = 'none';
    loadTours();
  } else if (applyTo === 'flight') {
    if (tourSelection) tourSelection.style.display = 'none';
    if (flightSelection) flightSelection.style.display = 'block';
    if (airlineSelection) airlineSelection.style.display = 'block';
    loadFlights();
  } else {
    if (tourSelection) tourSelection.style.display = 'none';
    if (flightSelection) flightSelection.style.display = 'none';
    if (airlineSelection) airlineSelection.style.display = 'none';
  }
}
function toggleFlightSelection() {
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
    const tourSelect = document.getElementById('tour_id');
    if (tourSelect) {
      tourSelect.innerHTML = '<option value="">Ошибка загрузки туров</option>';
    }
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
    flightSelect.addEventListener('change', toggleFlightSelection);

  } catch (error) {
    console.error('Error loading flights:', error);
    const flightSelect = document.getElementById('flight_id');
    if (flightSelect) {
      flightSelect.innerHTML = '<option value="">Ошибка загрузки перелетов</option>';
    }
  }

}
document.addEventListener('DOMContentLoaded', () => {
  new AddDiscountManager();
  const airlineSelect = document.getElementById('airline');
  if (airlineSelect) {
    airlineSelect.addEventListener('change', toggleFlightSelection);
  }
});