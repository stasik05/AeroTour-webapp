import { SearchService } from '/shared/js/SearchService.js';
import {DetailsService} from '/shared/js/DetailsService.js';

class SearchUI
{
  constructor()
  {
    this.elements = this.initializeElements();
    this.bindEvents();
    this.loadSavedSearch();
  }
  async init()
  {
    try
    {
      await this.checkAuth();
      this.setupEventListeners();
    }
    catch (error) {
      console.error('Error initializing FavoritesManager:', error);
      this.showError('Ошибка инициализации: ' + error.message);
    }
  }
  async checkAuth()
  {
    const token = localStorage.getItem('token');
    console.log('🔐 Токен в checkAuth:', token ? 'Есть' : 'Нет');
    if (!token)
    {
      console.log('❌ No token found');
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
        console.log('⚠️ User data not found in localStorage');
      }
    } catch (error)
    {
      console.log('Auth check failed, but continuing:', error.message);
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
  initializeElements()
  {
    return {
      searchType: document.getElementById('searchType'),
      tourForm: document.getElementById('tourForm'),
      flightForm: document.getElementById('flightForm'),
      searchButton: document.getElementById('searchButton'),
      searchForm: document.getElementById('searchForm'),
      resultsSection: document.getElementById('resultsSection'),
      resultsGrid: document.getElementById('resultsGrid'),
      resultsTitle: document.getElementById('resultsTitle'),
      searchCount: document.getElementById('searchCount'),
      defaultDestinations: document.getElementById('defaultDestinations'),
      dateRangeStart: document.getElementById('dateRangeStart'),
      dateRangeEnd: document.getElementById('dateRangeEnd'),
      destination: document.getElementById('destination'),
      departureCity: document.getElementById('departureCity'),
      arrivalCity: document.getElementById('arrivalCity'),
      tourPrice: document.getElementById('tourPrice'),
      flightPrice: document.getElementById('flightPrice'),
      flightDate: document.getElementById('flightDate')
    };
  }
  saveSearchState()
  {
    const searchState = {
      searchType: this.elements.searchType.value,
      destination: this.elements.destination?.value || '',
      departureCity: this.elements.departureCity?.value || '',
      arrivalCity: this.elements.arrivalCity?.value || '',
      startDate: this.elements.dateRangeStart?.value || '',
      endDate: this.elements.dateRangeEnd?.value || '',
      duration: this.elements.duration?.value || '',
      tourPrice: this.elements.tourPrice?.value || '',
      flightPrice: this.elements.flightPrice?.value || '',
      flightDate: this.elements.flightDate?.value || '',
      timestamp: Date.now()
    };

    localStorage.setItem('searchState', JSON.stringify(searchState));
  }
  loadSavedSearch()
  {
    try
    {
      const savedState = localStorage.getItem('searchState');
      if (savedState)
      {
        const state = JSON.parse(savedState);
        if (Date.now() - state.timestamp < 3600000) {
          this.elements.searchType.value = state.searchType || '';
          if (state.searchType === 'tour')
          {
            this.elements.tourForm.style.display = 'block';
            if (state.destination) this.elements.destination.value = state.destination;
            if (state.startDate) this.elements.dateRangeStart.value = state.startDate;
            if (state.endDate) this.elements.dateRangeEnd.value = state.endDate;
            if (state.duration) this.elements.duration.value = state.duration;
            if (state.tourPrice) this.elements.tourPrice.value = state.tourPrice;
          }
          else if (state.searchType === 'flight') {
            this.elements.flightForm.style.display = 'block';
            if (state.departureCity) this.elements.departureCity.value = state.departureCity;
            if (state.arrivalCity) this.elements.arrivalCity.value = state.arrivalCity;
            if (state.flightDate) this.elements.flightDate.value = state.flightDate;
            if (state.flightPrice) this.elements.flightPrice.value = state.flightPrice;
          }
          this.elements.searchButton.disabled = !state.searchType;
        }
      }
    } catch (error) {
      console.warn('Ошибка загрузки сохраненного состояния:', error);
    }
  }
  bindEvents() {
    this.elements.searchType.addEventListener('change', (e) => this.handleSearchTypeChange(e));
    this.elements.searchForm.addEventListener('submit', (e) => this.handleSearchSubmit(e));
    const inputs = this.elements.searchForm.querySelectorAll('input, select');
    inputs.forEach(input => {
      input.addEventListener('input', () => this.saveSearchState());
      input.addEventListener('change', () => this.saveSearchState());
    });

    this.elements.resultsGrid.addEventListener('click', (e) => this.handleResultsClick(e));
    if (this.elements.dateRangeStart && this.elements.dateRangeEnd) {
      this.elements.dateRangeStart.addEventListener('change', () => {
        this.calculateDuration();
        this.saveSearchState();
      });
      this.elements.dateRangeEnd.addEventListener('change', () => {
        this.calculateDuration();
        this.saveSearchState();
      });
    }
  }
  handleResultsClick(event) {
    const target = event.target;
    const button = target.closest('button');
    if (!button) return;
    const card = target.closest('.destination-card');
    if (!card) return;
    if (button.classList.contains('favorite-btn'))
    {
      if (button.disabled) {
        this.showNotification('Уже в избранном', 'info');
        return;
      }
      const tourId = button.getAttribute('data-tour-id');
      const flightId = button.getAttribute('data-flight-id');
      this.handleAddToFavorites(
        tourId ? parseInt(tourId) : null,
        flightId ? parseInt(flightId) : null
      );
      return;
    }
    if (button.classList.contains('btn-primary')) {
      const tourId = button.getAttribute('data-tour-id');
      const flightId = button.getAttribute('data-flight-id');
      if (tourId) {
        this.showTourDetails(parseInt(tourId));
      } else if (flightId) {
        this.showFlightDetails(parseInt(flightId));
      }
    } else if (button.classList.contains('btn-outline')) {
      const tourId = button.getAttribute('data-tour-id');
      const flightId = button.getAttribute('data-flight-id');
      if (tourId) {
        this.bookTour(parseInt(tourId));
      } else if (flightId) {
        this.bookFlight(parseInt(flightId));
      }
    }
  }
  calculateDuration() {
    const startDate = this.elements.dateRangeStart.value;
    const endDate = this.elements.dateRangeEnd.value;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

      if (duration > 0) {
        const durationInput = document.getElementById('duration');
        if (durationInput) {
          durationInput.value = duration;
        }
      }
    }
  }

  handleSearchTypeChange(event) {
    const type = event.target.value;

    this.elements.tourForm.style.display = type === 'tour' ? 'block' : 'none';
    this.elements.flightForm.style.display = type === 'flight' ? 'block' : 'none';
    this.elements.searchButton.disabled = !type;

    this.resetResults();
    this.saveSearchState();
  }

  async handleSearchSubmit(event) {
    event.preventDefault();

    const searchTypeValue = this.elements.searchType.value;
    const formData = new FormData(this.elements.searchForm);
    const searchParams = Object.fromEntries(formData.entries());

    try {
      this.showLoading();

      let result;
      if (searchTypeValue === 'tour') {
        result = await SearchService.searchTours(searchParams);
      } else {
        result = await SearchService.searchFlights(searchParams);
      }

      if (result.success) {
        this.displayResults(result.results, result.type);
        this.saveSearchState();
      } else {
        this.showNoResults('Ошибка при поиске');
      }
    } catch (error) {
      console.error('Ошибка поиска:', error);

      if (SearchService.handleAuthError(error)) {
        return;
      }

      this.showNoResults(this.getErrorMessage(error));
    }
  }

  showLoading() {
    this.elements.defaultDestinations.style.display = 'none';
    this.elements.resultsSection.style.display = 'block';
    this.elements.resultsGrid.innerHTML = '<div class="loading">🔍 Поиск...</div>';
  }

  resetResults() {
    this.elements.resultsSection.style.display = 'none';
    this.elements.defaultDestinations.style.display = 'grid';
  }

  displayResults(results, type) {
    if (!results || results.length === 0) {
      this.showNoResults('Ничего не найдено');
      return;
    }

    this.elements.resultsTitle.textContent = `Найдено ${results.length} ${this.getResultWord(results.length, type)}`;
    this.elements.searchCount.textContent = this.getSearchDescription(type);
    if (type === 'tours') {
      this.renderTours(results);
    } else if (type === 'flights') {
      this.renderFlights(results);
    }
    this.checkAndUpdateFavoriteButtons(results, type);
  }
  renderTours(tours) {
    this.elements.resultsGrid.innerHTML = tours.map(tour => `
    <div class="destination-card">
      <div class="card-image-container">
        <img src="${tour.imageUrl}" alt="${tour.title}" class="destination-image">
        <button class="favorite-btn" data-tour-id="${tour.id}">
          <span class="material-symbols-outlined">favorite</span>
        </button>
      </div>
      <div class="card-content">
        <h3 class="destination-title">${tour.title}</h3>
        <div class="destination-price-container">
          ${tour.originalPrice ? `<span class="destination-price-old">${tour.originalPrice} ₽</span>` : ''}
          <span class="destination-price">${tour.price} €</span>
        </div>
        <div class="destination-meta">
          <span class="destination-duration">${tour.duration} дней</span>
        </div>
        <p class="destination-description">
         <span class="material-symbols-outlined">location_on</span>
          ${tour.country}<br>
           <span class="material-symbols-outlined">calendar_month</span>
          ${new Date(tour.startDate).toLocaleDateString()} - ${new Date(tour.endDate).toLocaleDateString()}
        </p>
        <div class="card-actions">
          <button class="btn btn-primary" data-tour-id="${tour.id}">
            <span class="material-symbols-outlined">info</span>
            Подробнее
          </button>
        </div>
      </div>
    </div>
  `).join('');
  }
  async checkAndUpdateFavoriteButtons(results, type) {
    try {
      for (const result of results) {
        const isFavorite = await DetailsService.checkIfFavorite(
          type === 'tours' ? result.id : null,
          type === 'flights' ? result.id : null
        );

        if (isFavorite) {
          const button = this.elements.resultsGrid.querySelector(
            `[data-${type === 'tours' ? 'tour' : 'flight'}-id="${result.id}"]`
          );
          if (button) {
            button.style.color = 'gold';
            button.querySelector('span').textContent = 'favorite';
            button.disabled = true;
            button.title = 'Уже в избранном';
          }
        }
      }
    } catch (error) {
      console.warn('Ошибка при проверке избранного:', error);
    }
  }
  renderFlights(flights) {
    this.elements.resultsGrid.innerHTML = flights.map(flight => `
    <div class="destination-card">
      <div class="card-image-container">
        <img src="${flight.imageUrl}" alt="${flight.airline}" class="destination-image">
        <button class="favorite-btn" data-flight-id="${flight.id}">
          <span class="material-symbols-outlined">favorite</span>
        </button>
      </div>
      <div class="card-content">
        <h3 class="destination-title">${flight.airline} ${flight.flightNumber}</h3>
        <div class="destination-price">${flight.price} €</div>
        
        <div class="flight-details">
          <div class="flight-from">
            <div class="flight-city">${flight.departureCity}</div>
            <div class="flight-time">${this.formatDateTime(flight.departureTime)}</div>
          </div>
          <div class="flight-arrow">→</div>
          <div class="flight-to">
            <div class="flight-city">${flight.arrivalCity}</div>
            <div class="flight-time">${this.formatDateTime(flight.arrivalTime)}</div>
          </div>
        </div>
        
        <div class="card-actions">
          <button class="btn btn-primary" data-flight-id="${flight.id}">
            <span class="material-symbols-outlined">info</span>
            Подробнее
          </button>
        </div>
      </div>
    </div>
  `).join('');
  }
  showNoResults(message) {
    this.elements.resultsTitle.textContent = 'Результаты поиска';
    this.elements.searchCount.textContent = '';
    this.elements.resultsGrid.innerHTML = `<div class="no-results">${message}</div>`;
  }
  async handleAddToFavorites(tourId, flightId) {
    try {
      const button = event.target.closest('.favorite-btn');

      // Проверяем, не заблокирована ли уже кнопка
      if (button && button.disabled) {
        this.showNotification('Уже в избранном', 'info');
        return;
      }

      const result = await SearchService.addToFavorites(tourId, flightId);
      if (result.success) {
        this.showNotification('Добавлено в избранное!', 'success');
        // Блокируем кнопку после успешного добавления
        if (button) {
          button.style.color = 'gold';
          button.querySelector('span').textContent = 'favorite';
          button.disabled = true;
          button.title = 'Уже в избранном';
        }
      } else {
        this.showNotification(result.message, 'warning');
      }
    } catch (error) {
      if (error.isAlreadyFavorite) {
        this.showNotification('Уже в избранном', 'info');
        // Блокируем кнопку при ошибке "уже в избранном"
        const button = event.target.closest('.favorite-btn');
        if (button) {
          button.style.color = 'gold';
          button.querySelector('span').textContent = 'favorite';
          button.disabled = true;
          button.title = 'Уже в избранном';
        }
        return;
      }

      if (SearchService.handleAuthError(error)) {
        return;
      }

      this.showNotification(this.getErrorMessage(error), 'error');
    }
  }
  showTourDetails(tourId)
  {
    window.location.href = `/client/tour/${tourId}`;
  }
  bookTour(tourId) {
    this.showNotification(`Бронирование тура #${tourId}`, 'info');
  }

  showFlightDetails(flightId)
  {
    window.location.href = `/client/flight/${flightId}`;
  }

  bookFlight(flightId) {
    this.showNotification(`Бронирование рейса #${flightId}`, 'info');
  }

  showNotification(message, type = 'info')
  {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
    <div class="notification-content">
      <span class="material-symbols-outlined notification-icon">${this.getNotificationIcon(type)}</span>
      <span class="notification-message">${message}</span>
    </div>
  `;

    document.body.appendChild(notification);

    // Принудительный reflow для анимации
    notification.offsetHeight;
    notification.classList.add('show');

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
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

  getErrorMessage(error) {
    if (error.message) return error.message;
    if (error.error) return error.error;
    return 'Произошла ошибка при поиске';
  }

  getResultWord(count, type) {
    if (type === 'tours') {
      return count === 1 ? 'тур' : count < 5 ? 'тура' : 'туров';
    } else {
      return count === 1 ? 'рейс' : count < 5 ? 'рейса' : 'рейсов';
    }
  }

  getSearchDescription(type) {
    return type === 'tours' ? 'Подобранные туры по вашему запросу' : 'Найденные авиарейсы';
  }

  formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  setupEventListeners()
  {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', function() {
  window.searchUI = new SearchUI();
  window.searchUI.init();
});