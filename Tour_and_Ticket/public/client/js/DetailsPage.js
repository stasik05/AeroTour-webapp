import { DetailsService } from '/shared/js/DetailsService.js';
import {WeatherService} from '/shared/js/WeatherService.js';
class DetailsPage
{
  constructor() {
    this.tourId = this.getTourIdFromURL();
    this.flightId = this.getFlightIdFromURL();
    this.currentUser = null;
    this.currentImages = [];
    this.currentIndex = 0;
    this.isFavorite = false;
    this.isLoading = false;
    this.selectedRating = 0;
    this.currentData = null;
    this.weatherData = null;
    this.selectedCity = null;
    this.selectedDate = null;
    this.isWeatherLoading = false;
    this.weatherViewMode = 'current';
    this.init();
  }

  async init() {
    try {
      await this.loadUserData();
      await this.loadDetailsData();
      this.addWeatherButton();
      this.bindEvents();
      this.initImageGallery();
      this.setupEventListeners();
      setTimeout(() => this.checkFavoriteStatus(), 100);
    } catch (error) {
      console.error('Ошибка инициализации страницы:', error);
      this.showError('Ошибка загрузки данных');
    }
  }
  addWeatherButton() {
    const actionButtons = document.querySelector('.action-buttons');
    if (actionButtons) {
      const weatherButton = document.createElement('button');
      weatherButton.className = 'button button-weather';
      weatherButton.innerHTML = `
        <span class="material-symbols-outlined">cloud</span>
        Погода
      `;
      weatherButton.addEventListener('click', () => {
        this.openWeatherModal();
      });

      actionButtons.appendChild(weatherButton);
    }
  }

  openWeatherModal() {
    const modal = document.createElement('div');
    modal.className = 'weather-modal-overlay';
    modal.innerHTML = `
      <div class="weather-modal">
        <div class="weather-modal-header">
          <h2>
            <span class="material-symbols-outlined">cloud</span>
            Прогноз погоды
          </h2>
          <button class="weather-modal-close">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div class="weather-modal-content">
          <div class="weather-search-section">
            <div class="search-input-container">
              <input 
                type="text" 
                class="weather-search-input" 
                placeholder="Введите город..."
                maxlength="50"
              >
              <button class="weather-search-button">
                <span class="material-symbols-outlined">search</span>
                Найти
              </button>
            </div>
            <div class="search-suggestions" style="display: none;"></div>
            
            <div class="date-selection">
              <div class="view-mode-selector">
                <label class="mode-option">
                  <input type="radio" name="weatherView" value="current" checked>
                  <span class="radio-custom"></span>
                  <span>Текущая погода</span>
                </label>
                <label class="mode-option">
                  <input type="radio" name="weatherView" value="date">
                  <span class="radio-custom"></span>
                  <span>На конкретную дату</span>
                </label>
                <label class="mode-option">
                  <input type="radio" name="weatherView" value="range">
                  <span class="radio-custom"></span>
                  <span>На период</span>
                </label>
              </div>
              
              <div class="date-inputs">
                <div class="date-input-group single-date" style="display: none;">
                  <label>Выберите дату:</label>
                  <input type="date" class="weather-date-input" 
                         min="${WeatherService.getMinDate()}" 
                         max="${WeatherService.getMaxDate()}">
                </div>
                
                <div class="date-input-group range-date" style="display: none;">
                  <div class="date-range-inputs">
                    <div class="date-input-item">
                      <label>С:</label>
                      <input type="date" class="weather-start-date" 
                             min="${WeatherService.getMinDate()}" 
                             max="${WeatherService.getMaxDate()}">
                    </div>
                    <div class="date-input-item">
                      <label>По:</label>
                      <input type="date" class="weather-end-date" 
                             min="${WeatherService.getMinDate()}" 
                             max="${WeatherService.getMaxDate()}">
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="weather-results">
            <div class="weather-loading" style="display: none;">
              <div class="loading-spinner"></div>
              <span>Загружаем прогноз погоды...</span>
            </div>
            
            <div class="weather-content" style="display: none;">
              <div class="weather-header">
                <h3 class="weather-location"></h3>
                <div class="weather-date-info"></div>
                <div class="weather-data-type"></div>
              </div>
              <div class="weather-data"></div>
            </div>
            
            <div class="weather-welcome">
              <div class="welcome-icon">
                <span class="material-symbols-outlined">clear_day</span>
              </div>
              <h3>Узнайте прогноз погоды</h3>
              <p>Введите город и выберите дату для просмотра прогноза погоды</p>
              <div class="welcome-features">
                <div class="feature">
                  <span class="material-symbols-outlined">calendar_today</span>
                  <span>Погода на любую дату до 2026 года</span>
                </div>
                <div class="feature">
                  <span class="material-symbols-outlined">date_range</span>
                  <span>Прогноз на период</span>
                </div>
                <div class="feature">
                  <span class="material-symbols-outlined">history</span>
                  <span>Исторические данные</span>
                </div>
              </div>
            </div>
            
            <div class="weather-error" style="display: none;">
              <span class="material-symbols-outlined">error</span>
              <div class="error-content">
                <h4>Не удалось загрузить данные</h4>
                <p class="error-message"></p>
                <button class="retry-button">Попробовать снова</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.bindWeatherModalEvents(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeWeatherModal();
      }
    });
  }

  bindWeatherModalEvents(modal) {
    const closeBtn = modal.querySelector('.weather-modal-close');
    const searchInput = modal.querySelector('.weather-search-input');
    const searchButton = modal.querySelector('.weather-search-button');
    const suggestionsContainer = modal.querySelector('.search-suggestions');
    const viewModeRadios = modal.querySelectorAll('input[name="weatherView"]');
    const dateInput = modal.querySelector('.weather-date-input');
    const startDateInput = modal.querySelector('.weather-start-date');
    const endDateInput = modal.querySelector('.weather-end-date');
    const retryButton = modal.querySelector('.retry-button');

    let searchTimeout;
    closeBtn.addEventListener('click', () => {
      this.closeWeatherModal();
    });

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();

      clearTimeout(searchTimeout);

      if (query.length < 2) {
        suggestionsContainer.style.display = 'none';
        return;
      }

      searchTimeout = setTimeout(async () => {
        await this.searchCities(query, modal);
      }, 500);
    });
    searchButton.addEventListener('click', () => {
      this.performWeatherSearch(modal);
    });
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.performWeatherSearch(modal);
      }
    });
    viewModeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.handleViewModeChange(e.target.value, modal);
      });
    });
    startDateInput.addEventListener('change', () => {
      if (startDateInput.value) {
        endDateInput.min = startDateInput.value;
        if (endDateInput.value && endDateInput.value < startDateInput.value) {
          endDateInput.value = startDateInput.value;
        }
      }
    });

    endDateInput.addEventListener('change', () => {
      if (endDateInput.value && startDateInput.value && endDateInput.value < startDateInput.value) {
        endDateInput.value = startDateInput.value;
      }
    });
    retryButton.addEventListener('click', () => {
      if (this.selectedCity) {
        this.loadWeatherForCity(
          this.selectedCity.latitude,
          this.selectedCity.longitude,
          this.selectedCity.name,
          modal
        );
      }
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.weather-search-section')) {
        suggestionsContainer.style.display = 'none';
      }
    });
  }

  handleViewModeChange(mode, modal) {
    const singleDateGroup = modal.querySelector('.single-date');
    const rangeDateGroup = modal.querySelector('.range-date');

    singleDateGroup.style.display = 'none';
    rangeDateGroup.style.display = 'none';

    this.weatherViewMode = mode;

    switch (mode) {
      case 'date':
        singleDateGroup.style.display = 'block';
        break;
      case 'range':
        rangeDateGroup.style.display = 'block';
        break;
      default:
        break;
    }
  }

  async performWeatherSearch(modal) {
    const searchInput = modal.querySelector('.weather-search-input');
    const query = searchInput.value.trim();

    if (query.length < 2) {
      this.showNotification('Введите название города (минимум 2 символа)', 'warning');
      return;
    }

    await this.searchCities(query, modal);
  }

  async searchCities(query, modal) {
    const suggestionsContainer = modal.querySelector('.search-suggestions');

    try {
      const cities = await WeatherService.searchCity(query);

      if (cities.length === 0) {
        suggestionsContainer.innerHTML = `
          <div class="suggestion-item no-results">
            <span class="material-symbols-outlined">search_off</span>
            <div class="suggestion-info">
              <div class="suggestion-name">Городы не найдены</div>
              <div class="suggestion-details">Попробуйте изменить запрос</div>
            </div>
          </div>
        `;
        suggestionsContainer.style.display = 'block';
        return;
      }

      suggestionsContainer.innerHTML = cities.map(city => `
        <div class="suggestion-item" data-lat="${city.latitude}" data-lon="${city.longitude}" data-name="${city.name}">
          <span class="material-symbols-outlined">location_on</span>
          <div class="suggestion-info">
            <div class="suggestion-name">${city.name}</div>
            <div class="suggestion-details">
              ${city.admin1 ? `${city.admin1}` : ''}${city.admin1 && city.country ? ', ' : ''}${city.country || ''}
              ${city.population ? ` • ${this.formatPopulation(city.population)}` : ''}
            </div>
          </div>
          <span class="suggestion-arrow material-symbols-outlined">chevron_right</span>
        </div>
      `).join('');

      suggestionsContainer.style.display = 'block';
      suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          const lat = parseFloat(item.dataset.lat);
          const lon = parseFloat(item.dataset.lon);
          const name = item.dataset.name;

          modal.querySelector('.weather-search-input').value = name;
          suggestionsContainer.style.display = 'none';

          this.loadWeatherForCity(lat, lon, name, modal);
        });
        item.addEventListener('mouseenter', () => {
          item.style.backgroundColor = 'rgba(14, 165, 233, 0.1)';
        });

        item.addEventListener('mouseleave', () => {
          item.style.backgroundColor = '';
        });
      });

    } catch (error) {
      console.error('Ошибка поиска городов:', error);
      suggestionsContainer.innerHTML = `
        <div class="suggestion-item no-results">
          <span class="material-symbols-outlined">error</span>
          <div class="suggestion-info">
            <div class="suggestion-name">Ошибка поиска</div>
            <div class="suggestion-details">Попробуйте позже</div>
          </div>
        </div>
      `;
      suggestionsContainer.style.display = 'block';
    }
  }

  formatPopulation(population) {
    if (population >= 1000000) {
      return (population / 1000000).toFixed(1) + ' млн';
    } else if (population >= 1000) {
      return (population / 1000).toFixed(0) + ' тыс';
    }
    return population.toString();
  }

  async loadWeatherForCity(latitude, longitude, cityName, modal) {
    this.isWeatherLoading = true;
    this.selectedCity = { latitude, longitude, name: cityName };

    const resultsContainer = modal.querySelector('.weather-results');
    const loadingElement = resultsContainer.querySelector('.weather-loading');
    const contentElement = resultsContainer.querySelector('.weather-content');
    const welcomeElement = resultsContainer.querySelector('.weather-welcome');
    const errorElement = resultsContainer.querySelector('.weather-error');
    const dateInput = modal.querySelector('.weather-date-input');
    const startDateInput = modal.querySelector('.weather-start-date');
    const endDateInput = modal.querySelector('.weather-end-date');

    let startDate = null;
    let endDate = null;

    switch (this.weatherViewMode) {
      case 'date':
        if (dateInput.value) {
          startDate = dateInput.value;
          endDate = dateInput.value;
        }
        break;
      case 'range':
        if (startDateInput.value && endDateInput.value) {
          startDate = startDateInput.value;
          endDate = endDateInput.value;
        }
        break;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = startDate ? new Date(startDate) : today;
    selectedDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.ceil((selectedDate - today) / (1000 * 60 * 60 * 24));

    if (daysDiff > 365) {
      this.showNotification('Прогноз доступен максимум на год вперед', 'info');
      loadingElement.style.display = 'none';
      return;
    }
    welcomeElement.style.display = 'none';
    loadingElement.style.display = 'flex';
    contentElement.style.display = 'none';
    errorElement.style.display = 'none';

    try {
      this.weatherData = await WeatherService.getWeatherData(
        latitude,
        longitude,
        startDate,
        endDate
      );


      loadingElement.style.display = 'none';
      contentElement.style.display = 'block';

      this.renderWeatherContent(cityName, startDate, endDate, modal, daysDiff);

    } catch (error) {
      console.error('Ошибка загрузки погоды:', error);
      loadingElement.style.display = 'none';
      errorElement.style.display = 'flex';

      if (daysDiff > 16) {
        errorElement.querySelector('.error-message').textContent =
          'Детальный прогноз доступен только на 16 дней. Для выбранных дат показаны климатические средние значения.';
      } else {
        errorElement.querySelector('.error-message').textContent =
          error.message || 'Не удалось загрузить прогноз погоды. Попробуйте позже.';
      }
    } finally {
      this.isWeatherLoading = false;
    }
  }

  renderWeatherContent(cityName, startDate, endDate, modal, daysDiff) {
    const { daily, metadata } = this.weatherData;
    const weatherContent = modal.querySelector('.weather-data');
    const locationElement = modal.querySelector('.weather-location');
    const dateInfoElement = modal.querySelector('.weather-date-info');
    const dataTypeElement = modal.querySelector('.weather-data-type');

    locationElement.textContent = cityName;
    let dataType = 'forecast';
    let dataTypeText = 'Прогноз';
    let reliability = metadata?.reliability || 'unknown';

    if (metadata) {
      switch (metadata.type) {
        case 'historical':
          dataType = 'historical';
          dataTypeText = 'Исторические данные';
          break;
        case 'climate_forecast':
        case 'climate_average':
          dataType = 'climate';
          dataTypeText = 'Климатический прогноз';
          break;
        case 'generated':
          dataType = 'generated';
          dataTypeText = 'Расчетные данные';
          break;
      }
    } else {
      const today = new Date();
      const selectedDate = startDate ? new Date(startDate) : today;
      if (selectedDate < today) {
        dataType = 'historical';
        dataTypeText = 'Исторические данные';
      } else if (daysDiff > 16) {
        dataType = 'climate';
        dataTypeText = 'Климатический прогноз';
      }
    }

    dataTypeElement.textContent = dataTypeText;
    dataTypeElement.className = `weather-data-type ${dataType} ${reliability}`;
    let dateInfo = '';
    if (startDate && endDate) {
      if (startDate === endDate) {
        dateInfo = WeatherService.formatDateDisplay(startDate);
      } else {
        dateInfo = `${WeatherService.formatDateDisplay(startDate)} - ${WeatherService.formatDateDisplay(endDate)}`;
      }
    } else {
      dateInfo = 'Текущая погода и прогноз на 7 дней';
    }
    if (metadata?.note) {
      dateInfo += `<div class="data-reliability-note">${metadata.note}</div>`;
    } else if (reliability === 'medium') {
      dateInfo += `<div class="data-reliability-note">На основе климатических средних</div>`;
    } else if (reliability === 'low') {
      dateInfo += `<div class="data-reliability-note">Расчетные данные</div>`;
    }

    dateInfoElement.innerHTML = dateInfo;
    if (this.weatherViewMode === 'current' || (startDate && endDate && startDate !== endDate)) {
      this.renderWeatherForecast(weatherContent, cityName, startDate, endDate, dataType, reliability);
    } else if (startDate && endDate && startDate === endDate) {
      this.renderSingleDateWeather(weatherContent, startDate, dataType, reliability);
    } else {
      this.renderCurrentWeather(weatherContent, dataType, reliability);
    }
  }

  renderCurrentWeather(container, dataType, reliability) {
    const { daily } = this.weatherData;
    const daysToShow = dataType === 'historical' ? Math.min(daily.time.length, 7) : 7;

    let reliabilityBadge = '';
    if (reliability === 'medium') {
      reliabilityBadge = '<div class="reliability-badge medium">Средняя точность</div>';
    } else if (reliability === 'low') {
      reliabilityBadge = '<div class="reliability-badge low">Примерные данные</div>';
    }

    container.innerHTML = `
      ${reliabilityBadge}
      <div class="current-weather-section">
        <div class="current-weather-main">
          <div class="weather-icon-large">
            <span class="material-symbols-outlined">
              ${WeatherService.getWeatherIcon(daily.weather_code[0])}
            </span>
          </div>
          <div class="current-weather-info">
            <div class="current-temp">${WeatherService.formatTemperature(daily.temperature_2m_max[0])}</div>
            <div class="current-description">
              ${WeatherService.getWeatherDescription(daily.weather_code[0])}
            </div>
            <div class="current-details">
              <span>Мин: ${WeatherService.formatTemperature(daily.temperature_2m_min[0])}</span>
              <span>•</span>
              <span>Ветер: ${Math.round(daily.wind_speed_10m_max?.[0] || 0)} км/ч</span>
            </div>
          </div>
        </div>
      </div>

      <div class="weather-forecast-section">
        <h4>${dataType === 'historical' ? 'Погода в эти даты' : 'Прогноз на 7 дней'}</h4>
        <div class="forecast-grid-modal">
          ${daily.time.slice(0, daysToShow).map((date, index) => `
            <div class="forecast-day-modal ${dataType}">
              <div class="forecast-date">${WeatherService.formatDateShort(date)}</div>
              <div class="forecast-icon">
                <span class="material-symbols-outlined">
                  ${WeatherService.getWeatherIcon(daily.weather_code[index])}
                </span>
              </div>
              <div class="forecast-temps">
                <span class="temp-max">${WeatherService.formatTemperature(daily.temperature_2m_max[index])}</span>
                <span class="temp-min">${WeatherService.formatTemperature(daily.temperature_2m_min[index])}</span>
              </div>
              <div class="forecast-weather">
                ${WeatherService.getWeatherDescription(daily.weather_code[index])}
              </div>
              ${daily.precipitation_probability_max?.[index] > 0 ? `
                <div class="forecast-precipitation">
                  <span class="material-symbols-outlined">umbrella</span>
                  ${daily.precipitation_probability_max[index]}%
                </div>
              ` : daily.precipitation_sum?.[index] > 0 ? `
                <div class="forecast-precipitation">
                  <span class="material-symbols-outlined">water_drop</span>
                  ${daily.precipitation_sum[index]} мм
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderSingleDateWeather(container, date, dataType, reliability) {
    const { daily } = this.weatherData;
    const index = daily.time.findIndex(d => d === date);

    if (index === -1) {
      container.innerHTML = '<div class="no-weather-data">Данные о погоде на выбранную дату недоступны</div>';
      return;
    }

    let reliabilityBadge = '';
    if (reliability === 'medium') {
      reliabilityBadge = '<div class="reliability-badge medium">На основе климатических норм</div>';
    } else if (reliability === 'low') {
      reliabilityBadge = '<div class="reliability-badge low">Расчетные данные</div>';
    }

    container.innerHTML = `
      ${reliabilityBadge}
      <div class="single-date-weather-modal">
        <div class="date-weather-header-modal">
          <div class="weather-icon-xlarge">
            <span class="material-symbols-outlined">
              ${WeatherService.getWeatherIcon(daily.weather_code[index])}
            </span>
          </div>
          <div class="date-weather-summary">
            <div class="selected-date-large">${WeatherService.formatDateDisplay(date)}</div>
            <div class="weather-description-large">
              ${WeatherService.getWeatherDescription(daily.weather_code[index])}
            </div>
            <div class="temperature-range-large">
              ${WeatherService.formatTemperature(daily.temperature_2m_min[index])} - ${WeatherService.formatTemperature(daily.temperature_2m_max[index])}
            </div>
          </div>
        </div>

        <div class="weather-details-grid">
          <div class="weather-detail-card">
            <div class="detail-icon">
              <span class="material-symbols-outlined">thermometer</span>
            </div>
            <div class="detail-content">
              <div class="detail-label">Температура</div>
              <div class="detail-values">
                <div class="detail-value">
                  <span>Максимальная:</span>
                  <span class="value">${WeatherService.formatTemperature(daily.temperature_2m_max[index])}</span>
                </div>
                <div class="detail-value">
                  <span>Минимальная:</span>
                  <span class="value">${WeatherService.formatTemperature(daily.temperature_2m_min[index])}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="weather-detail-card">
            <div class="detail-icon">
              <span class="material-symbols-outlined">air</span>
            </div>
            <div class="detail-content">
              <div class="detail-label">Ветер</div>
              <div class="detail-value-single">
                <span class="value">${Math.round(daily.wind_speed_10m_max?.[index] || 0)} км/ч</span>
              </div>
            </div>
          </div>

          ${(daily.precipitation_probability_max?.[index] > 0) || (daily.precipitation_sum?.[index] > 0) ? `
            <div class="weather-detail-card">
              <div class="detail-icon">
                <span class="material-symbols-outlined">umbrella</span>
              </div>
              <div class="detail-content">
                <div class="detail-label">Осадки</div>
                <div class="detail-values">
                  ${daily.precipitation_probability_max?.[index] > 0 ? `
                    <div class="detail-value">
                      <span>Вероятность:</span>
                      <span class="value">${daily.precipitation_probability_max[index]}%</span>
                    </div>
                  ` : ''}
                  ${daily.precipitation_sum?.[index] > 0 ? `
                    <div class="detail-value">
                      <span>Количество:</span>
                      <span class="value">${daily.precipitation_sum[index]} мм</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          ` : ''}

          <div class="weather-detail-card">
            <div class="detail-icon">
              <span class="material-symbols-outlined">info</span>
            </div>
            <div class="detail-content">
              <div class="detail-label">Тип данных</div>
              <div class="detail-value-single">
                <span class="value ${dataType}">
                  ${this.getDataTypeText(dataType)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderWeatherForecast(container, cityName, startDate, endDate, dataType, reliability) {
    const { daily } = this.weatherData;

    let reliabilityBadge = '';
    if (reliability === 'medium') {
      reliabilityBadge = '<div class="reliability-badge medium">Климатические средние</div>';
    } else if (reliability === 'low') {
      reliabilityBadge = '<div class="reliability-badge low">Расчетные данные</div>';
    }

    container.innerHTML = `
      ${reliabilityBadge}
      <div class="range-weather-section">
        <div class="period-info">
          <h4>${this.getDataTypeText(dataType)}</h4>
          <div class="period-dates">${WeatherService.formatDateDisplay(startDate)} - ${WeatherService.formatDateDisplay(endDate)}</div>
        </div>
        
        <div class="forecast-grid-extended">
          ${daily.time.map((date, index) => `
            <div class="forecast-day-extended ${dataType}">
              <div class="forecast-date">${WeatherService.formatDateShort(date)}</div>
              <div class="forecast-icon">
                <span class="material-symbols-outlined">
                  ${WeatherService.getWeatherIcon(daily.weather_code[index])}
                </span>
              </div>
              <div class="forecast-main">
                <div class="forecast-temp-range">
                  <span class="temp-max">${WeatherService.formatTemperature(daily.temperature_2m_max[index])}</span>
                  <span class="temp-min">${WeatherService.formatTemperature(daily.temperature_2m_min[index])}</span>
                </div>
                <div class="forecast-description">
                  ${WeatherService.getWeatherDescription(daily.weather_code[index])}
                </div>
              </div>
              <div class="forecast-details">
                <div class="forecast-detail">
                  <span class="material-symbols-outlined">air</span>
                  <span>${Math.round(daily.wind_speed_10m_max?.[index] || 0)} км/ч</span>
                </div>
                ${daily.precipitation_probability_max?.[index] > 0 ? `
                  <div class="forecast-detail">
                    <span class="material-symbols-outlined">umbrella</span>
                    <span>${daily.precipitation_probability_max[index]}%</span>
                  </div>
                ` : daily.precipitation_sum?.[index] > 0 ? `
                  <div class="forecast-detail">
                    <span class="material-symbols-outlined">water_drop</span>
                    <span>${daily.precipitation_sum[index]} мм</span>
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  getDataTypeText(dataType) {
    const types = {
      'forecast': 'Прогноз погоды',
      'historical': 'Исторические данные',
      'climate': 'Климатический прогноз',
      'generated': 'Расчетные данные'
    };
    return types[dataType] || 'Данные о погоде';
  }

  closeWeatherModal() {
    const modal = document.querySelector('.weather-modal-overlay');
    if (modal) {
      document.body.removeChild(modal);
    }
  }
  getTourIdFromURL() {
    const path = window.location.pathname;
    const tourMatch = path.match(/\/client\/tour\/(\d+)/);
    return tourMatch ? tourMatch[1] : null;
  }

  getFlightIdFromURL() {
    const path = window.location.pathname;
    const flightMatch = path.match(/\/client\/flight\/(\d+)/);
    return flightMatch ? flightMatch[1] : null;
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

  async loadDetailsData() {
    try {
      if (this.tourId) {
        await this.loadTourDetails();
      } else if (this.flightId) {
        await this.loadFlightDetails();
      } else {
        throw new Error('Не указан ID тура или авиабилета');
      }
    } catch (error) {
      console.error('Ошибка загрузки деталей:', error);
      this.showNotification('Ошибка загрузки данных', 'error');
      throw error;
    }
  }

  async loadTourDetails() {
    try {
      this.showLoading();
      const response = await DetailsService.getTourDetails(this.tourId);
      if (response.success) {
        this.currentData = response.data;
        this.renderTourDetails(response.data);
      } else {
        throw new Error(response.message || 'Ошибка загрузки тура');
      }
    } catch (error) {
      console.error('Ошибка загрузки тура:', error);
      this.showNotification('Ошибка загрузки информации о туре', 'error');
      throw error;
    } finally {
      this.hideLoading();
    }
  }

  async loadFlightDetails() {
    try {
      this.showLoading();
      const response = await DetailsService.getFlightDetails(this.flightId);
      if (response.success) {
        this.currentData = response.data;
        this.renderFlightDetails(response.data);
      } else {
        throw new Error(response.message || 'Ошибка загрузки авиабилета');
      }
    } catch (error) {
      console.error('Ошибка загрузки рейса:', error);
      this.showNotification('Ошибка загрузки информации о рейсе', 'error');
      throw error;
    } finally {
      this.hideLoading();
    }
  }

  async checkFavoriteStatus() {
    if (this.isLoading) return;

    try {
      this.isLoading = true;

      if (!this.currentUser) {
        this.updateFavoriteButton(false);
        return;
      }

      const isFavorite = await DetailsService.checkIfFavorite(
        this.tourId || null,
        this.flightId || null
      );

      this.isFavorite = isFavorite;
      this.updateFavoriteButton(isFavorite);

    } catch (error) {
      console.error('Ошибка при проверке избранного:', error);
      this.updateFavoriteButton(false);
    } finally {
      this.isLoading = false;
    }
  }

  renderTourDetails(tour) {
    document.title = `AeroTour - ${tour.title}`;
    this.renderImageGallery(tour.images);
    this.renderTourInfo(tour);
    this.renderReviews(tour.reviews, tour.rating);
    this.renderSidebar(tour);
  }

  renderFlightDetails(flight) {
    document.title = `AeroTour - ${flight.airline} ${flight.flightNumber}`;
    this.renderSingleImage(flight.image);
    this.renderFlightInfo(flight);
    this.renderReviews(flight.reviews, flight.rating);
    this.renderFlightSidebar(flight);
  }

  renderImageGallery(images) {
    const galleryScroll = document.querySelector('.gallery-scroll');
    const prevButton = document.querySelector('.gallery-button-prev');
    const nextButton = document.querySelector('.gallery-button-next');

    if (!galleryScroll) return;

    this.currentImages = images || [];
    this.currentIndex = 0;

    galleryScroll.innerHTML = '';

    if (this.currentImages.length === 0) {
      this.renderSingleImage(null);
      return;
    }

    const imagesContainer = document.createElement('div');
    imagesContainer.className = 'gallery-images-container';
    imagesContainer.style.display = 'flex';
    imagesContainer.style.width = '100%';
    imagesContainer.style.height = '400px';

    this.currentImages.forEach((image, index) => {
      const galleryImage = document.createElement('div');
      galleryImage.className = 'gallery-image';
      galleryImage.style.flex = '0 0 100%';
      galleryImage.style.width = '100%';
      galleryImage.style.height = '100%';
      galleryImage.style.display = index === 0 ? 'block' : 'none';
      galleryImage.style.position = 'relative';
      galleryImage.innerHTML = `
        <img src="${image.imageUrl}" alt="Image ${index + 1}" loading="lazy" 
             style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
      `;
      imagesContainer.appendChild(galleryImage);
    });

    galleryScroll.appendChild(imagesContainer);
    this.updateGalleryButtons();
  }

  renderSingleImage(image) {
    const galleryScroll = document.querySelector('.gallery-scroll');
    const prevButton = document.querySelector('.gallery-button-prev');
    const nextButton = document.querySelector('.gallery-button-next');

    if (!galleryScroll) return;

    galleryScroll.innerHTML = `
      <div class="gallery-image" style="width: 100%; height: 400px;">
        <img src="${image?.imageUrl || '/images/default-tour.jpg'}" 
             alt="Image" loading="lazy" 
             style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
      </div>
    `;

    if (prevButton) prevButton.style.display = 'none';
    if (nextButton) nextButton.style.display = 'none';
  }

  updateGalleryButtons() {
    const prevButton = document.querySelector('.gallery-button-prev');
    const nextButton = document.querySelector('.gallery-button-next');

    if (this.currentImages.length <= 1) {
      if (prevButton) prevButton.style.display = 'none';
      if (nextButton) nextButton.style.display = 'none';
    } else {
      if (prevButton) prevButton.style.display = 'block';
      if (nextButton) nextButton.style.display = 'block';
    }
  }

  showImage(index) {
    if (this.currentImages.length === 0) return;

    const galleryScroll = document.querySelector('.gallery-scroll');
    const images = galleryScroll.querySelectorAll('.gallery-image');

    images.forEach(img => img.style.display = 'none');

    if (images[index]) {
      images[index].style.display = 'block';
    }

    this.currentIndex = index;
    galleryScroll.scrollTo({
      left: galleryScroll.offsetWidth * index,
      behavior: 'smooth'
    });
  }

  renderTourInfo(tour) {
    const titleElement = document.querySelector('.tour-title');
    const descriptionElement = document.querySelector('.tour-description');

    if (titleElement) {
      titleElement.textContent = tour.title;
    }

    if (descriptionElement) {
      descriptionElement.innerHTML = `
        <div class="tour-details-info">
          <div class="tour-meta-info">
            ${this.renderTourMetaInfo(tour)}
          </div>
          <div class="tour-description-text">
            ${tour.description}
          </div>
        </div>
      `;
    }

    if (tour.images && tour.images.length > 0) {
      this.updateBackgroundImage(tour.images[0].imageUrl);
    }
  }

  renderTourMetaInfo(tour) {
    const startDate = new Date(tour.startDate);
    const endDate = new Date(tour.endDate);
    const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    return `
      <div class="tour-meta-grid">
        <div class="tour-meta-item">
          <span class="material-symbols-outlined tour-meta-icon">location_on</span>
          <div class="tour-meta-content">
            <div class="tour-meta-label">Местоположение</div>
            <div class="tour-meta-value">${tour.city}, ${tour.country}</div>
          </div>
        </div>
        
        <div class="tour-meta-item">
          <span class="material-symbols-outlined tour-meta-icon">calendar_month</span>
          <div class="tour-meta-content">
            <div class="tour-meta-label">Даты тура</div>
            <div class="tour-meta-value">
              ${startDate.toLocaleDateString('ru-RU')} - ${endDate.toLocaleDateString('ru-RU')}
            </div>
          </div>
        </div>
        
        <div class="tour-meta-item">
          <span class="material-symbols-outlined tour-meta-icon">schedule</span>
          <div class="tour-meta-content">
            <div class="tour-meta-label">Продолжительность</div>
            <div class="tour-meta-value">${duration} ${this.getDayText(duration)}</div>
          </div>
        </div>
        
        <div class="tour-meta-item">
          <span class="material-symbols-outlined tour-meta-icon">hotel</span>
          <div class="tour-meta-content">
            <div class="tour-meta-label">Тип тура</div>
            <div class="tour-meta-value">${this.getTourType(tour)}</div>
          </div>
        </div>
      </div>
    `;
  }

  getDayText(days) {
    if (days === 1) return 'день';
    if (days >= 2 && days <= 4) return 'дня';
    return 'дней';
  }

  getTourType(tour) {
    return 'Экскурсионный тур';
  }

  renderFlightInfo(flight) {
    const titleElement = document.querySelector('.tour-title');
    const descriptionElement = document.querySelector('.tour-description');

    if (titleElement) {
      titleElement.textContent = `${flight.airline} ${flight.flightNumber}`;
    }

    if (descriptionElement) {
      descriptionElement.innerHTML = `
        <div class="flight-info-details">
          <div class="flight-meta-info">
            <div class="flight-route">
              <div class="route-item">
                <span class="material-symbols-outlined flight-icon">flight_takeoff</span>
                <div class="route-details">
                  <div class="city">${flight.departureCity}</div>
                  <div class="time">${DetailsService.formatDateTime(flight.departureTime)}</div>
                </div>
              </div>
              
              <div class="route-arrow">
                <span class="material-symbols-outlined">arrow_forward</span>
              </div>
              
              <div class="route-item">
                <span class="material-symbols-outlined flight-icon">flight_land</span>
                <div class="route-details">
                  <div class="city">${flight.arrivalCity}</div>
                  <div class="time">${DetailsService.formatDateTime(flight.arrivalTime)}</div>
                </div>
              </div>
            </div>
            <div class="flight-duration">
              <span class="material-symbols-outlined">schedule</span>
              <span>Продолжительность: ${this.calculateFlightDuration(flight.departureTime, flight.arrivalTime)}</span>
            </div>
          </div>
        </div>
      `;
    }

    if (flight.image) {
      this.updateBackgroundImage(flight.image.imageUrl);
    }
  }
  calculateFlightDuration(departureTime, arrivalTime) {
    const dep = new Date(departureTime);
    const arr = new Date(arrivalTime);
    const durationMs = arr - dep;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours === 0) {
      return `${minutes} мин`;
    } else if (minutes === 0) {
      return `${hours} ч`;
    } else {
      return `${hours} ч ${minutes} мин`;
    }
  }

  renderReviews(reviews, rating) {
    const reviewsContainer = document.querySelector('.reviews-list');
    const ratingElement = document.querySelector('.rating-value');
    const ratingCountElement = document.querySelector('.rating-count');
    const starsContainer = document.querySelector('.rating-stars');

    if (!reviewsContainer) return;

    if (ratingElement) {
      ratingElement.textContent = rating.average.toFixed(1);
    }

    if (ratingCountElement) {
      ratingCountElement.textContent = `на основе ${rating.count} отзывов`;
    }

    if (starsContainer) {
      starsContainer.innerHTML = this.generateStarsHTML(rating.average);
    }

    reviewsContainer.innerHTML = '';

    if (reviews && reviews.length > 0) {
      reviews.forEach(review => {
        const reviewElement = this.createReviewElement(review);
        reviewsContainer.appendChild(reviewElement);
      });
    } else {
      reviewsContainer.innerHTML = `
        <div class="no-reviews">
          <p>Пока нет отзывов. Будьте первым!</p>
        </div>
      `;
    }

    this.renderReviewForm(reviewsContainer);
  }
  createReviewElement(review) {
    const reviewItem = document.createElement('div');
    reviewItem.className = 'review-item';
    reviewItem.innerHTML = `
      <img src="${review.user.photo || '/images/default-avatar.jpg'}" 
           alt="${review.user.name}" class="review-avatar">
      <div class="review-content">
        <p class="review-author">${review.user.name} ${review.user.lastName}</p>
        <div class="review-rating">
          ${this.generateStarsHTML(review.rating)}
        </div>
        <p class="review-text">${review.comment}</p>
        <div class="review-date">
          ${DetailsService.formatDate(review.createdAt)}
        </div>
      </div>
    `;
    return reviewItem;
  }
  renderReviewForm(container) {
    const reviewForm = document.createElement('div');
    reviewForm.className = 'review-form-container';
    reviewForm.innerHTML = `
      <div class="review-form">
        <h4 class="review-form-title">Оставить отзыв</h4>
        <div class="rating-input">
          <label>Ваша оценка:</label>
          <div class="star-rating">
            <span class="star" data-rating="1">★</span>
            <span class="star" data-rating="2">★</span>
            <span class="star" data-rating="3">★</span>
            <span class="star" data-rating="4">★</span>
            <span class="star" data-rating="5">★</span>
          </div>
          <div class="rating-value-display">0/5</div>
        </div>
        <div class="comment-input">
          <label for="review-comment">Ваш отзыв:</label>
          <textarea 
            id="review-comment" 
            placeholder="Поделитесь своими впечатлениями..." 
            rows="4"
            maxlength="1000"
          ></textarea>
          <div class="char-counter">0/1000</div>
        </div>
        <div class="form-actions">
          <button type="button" class="button button-cancel">Отмена</button>
          <button type="button" class="button button-submit" disabled>Добавить отзыв</button>
        </div>
      </div>
    `;
    container.appendChild(reviewForm);
    this.bindReviewFormEvents(reviewForm);
  }
  bindReviewFormEvents(formContainer) {
    const stars = formContainer.querySelectorAll('.star');
    const ratingDisplay = formContainer.querySelector('.rating-value-display');
    const textarea = formContainer.querySelector('#review-comment');
    const charCounter = formContainer.querySelector('.char-counter');
    const submitButton = formContainer.querySelector('.button-submit');
    const cancelButton = formContainer.querySelector('.button-cancel');

    stars.forEach(star => {
      star.addEventListener('click', () => {
        this.selectedRating = parseInt(star.dataset.rating);
        this.updateStarRating(stars, this.selectedRating);
        ratingDisplay.textContent = `${this.selectedRating}/5`;
        this.updateSubmitButton();
      });

      star.addEventListener('mouseover', () => {
        const rating = parseInt(star.dataset.rating);
        this.highlightStars(stars, rating);
      });
    });

    formContainer.querySelector('.star-rating').addEventListener('mouseleave', () => {
      this.highlightStars(stars, this.selectedRating);
    });

    textarea.addEventListener('input', () => {
      const length = textarea.value.length;
      charCounter.textContent = `${length}/1000`;

      if (length > 1000) {
        textarea.value = textarea.value.substring(0, 1000);
        charCounter.textContent = '1000/1000';
        charCounter.style.color = '#ff4444';
      } else {
        charCounter.style.color = '#666';
      }

      this.updateSubmitButton();
    });

    submitButton.addEventListener('click', () => {
      this.submitReview(this.selectedRating, textarea.value.trim());
    });

    cancelButton.addEventListener('click', () => {
      this.resetReviewForm(formContainer);
    });

    this.updateSubmitButton = () => {
      const hasRating = this.selectedRating > 0;
      const hasComment = textarea.value.trim().length > 0;
      submitButton.disabled = !(hasRating && hasComment);
    };
  }

  updateStarRating(stars, rating) {
    stars.forEach(star => {
      const starRating = parseInt(star.dataset.rating);
      if (starRating <= rating) {
        star.classList.add('active');
      } else {
        star.classList.remove('active');
      }
    });
  }

  highlightStars(stars, rating) {
    stars.forEach(star => {
      const starRating = parseInt(star.dataset.rating);
      if (starRating <= rating) {
        star.classList.add('hover');
      } else {
        star.classList.remove('hover');
      }
    });
  }
  resetReviewForm(formContainer) {
    const stars = formContainer.querySelectorAll('.star');
    const ratingDisplay = formContainer.querySelector('.rating-value-display');
    const textarea = formContainer.querySelector('#review-comment');
    const charCounter = formContainer.querySelector('.char-counter');
    const submitButton = formContainer.querySelector('.button-submit');

    stars.forEach(star => star.classList.remove('active', 'hover'));
    ratingDisplay.textContent = '0/5';
    textarea.value = '';
    charCounter.textContent = '0/1000';
    charCounter.style.color = '#666';
    submitButton.disabled = true;
    this.selectedRating = 0;
  }

  async submitReview(rating, comment) {
    try {
      if (!this.currentUser) {
        this.showNotification('Для написания отзыва необходимо авторизоваться', 'warning');
        return;
      }

      if (rating === 0 || !comment) {
        this.showNotification('Пожалуйста, заполните все поля', 'warning');
        return;
      }

      const reviewData = {
        rating: rating,
        comment: comment
      };

      if (this.tourId) {
        reviewData.tourId = this.tourId;
      } else if (this.flightId) {
        reviewData.flightId = this.flightId;
      }

      const response = await DetailsService.submitReview(reviewData);

      if (response.success) {
        this.showNotification('Отзыв успешно добавлен!', 'success');
        this.resetReviewForm(document.querySelector('.review-form-container'));
        setTimeout(() => {
          this.loadDetailsData();
        }, 1000);
      } else {
        throw new Error(response.message || 'Ошибка при добавлении отзыва');
      }

    } catch (error) {
      console.error('Ошибка при отправке отзыва:', error);
      this.showNotification('Ошибка при добавлении отзыва', 'error');
    }
  }

  generateStarsHTML(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let starsHTML = '';

    for (let i = 0; i < fullStars; i++) {
      starsHTML += '<span class="star hover active">★</span>';
    }

    if (hasHalfStar) {
      starsHTML += '<span class="material-symbols-outlined half-star">star_half</span>';
    }

    for (let i = 0; i < emptyStars; i++) {
      starsHTML += '<span class="star">★</span>';
    }

    return starsHTML;
  }

  renderSidebar(tour) {
    const priceAmount = document.querySelector('.price-amount');
    if (priceAmount) {
      priceAmount.textContent = `${tour.price.toLocaleString('ru-RU')} €`;
    }
  }

  renderFlightSidebar(flight) {
    const priceAmount = document.querySelector('.price-amount');
    const priceLabel = document.querySelector('.price-label');

    if (priceAmount) {
      priceAmount.textContent = `${flight.price.toLocaleString('ru-RU')} €`;
    }

    if (priceLabel) {
      priceLabel.textContent = 'Стоимость билета';
    }
  }

  updateBackgroundImage(imageUrl) {
    const backgroundImage = document.querySelector('.background-image');
    if (backgroundImage && imageUrl) {
      backgroundImage.src = imageUrl;
    }
  }

  updateFavoriteButton(isFavorite) {
    const favoriteButton = document.querySelector('.button-favorite');
    if (!favoriteButton) {
      console.warn('Кнопка избранного не найдена');
      return;
    }

    this.isFavorite = isFavorite;

    if (isFavorite) {
      favoriteButton.innerHTML = `
        <span class="material-symbols-outlined" style="color: #ffff00;">favorite</span>
        В избранном
      `;
      favoriteButton.classList.add('favorite-active');
      favoriteButton.style.backgroundColor = '#fff0f0';
      favoriteButton.style.borderColor = '#ff4444';
      favoriteButton.style.color = '#ffff00';
      favoriteButton.title = 'Удалить из избранного';
    } else {
      favoriteButton.innerHTML = `
        <span class="material-symbols-outlined">favorite</span>
        Добавить в избранное
      `;
      favoriteButton.classList.remove('favorite-active');
      favoriteButton.style.backgroundColor = '';
      favoriteButton.style.borderColor = '';
      favoriteButton.style.color = '';
      favoriteButton.title = 'Добавить в избранное';
    }
  }

  initImageGallery() {
    const prevButton = document.querySelector('.gallery-button-prev');
    const nextButton = document.querySelector('.gallery-button-next');

    if (!prevButton || !nextButton) return;

    prevButton.addEventListener('click', () => {
      const newIndex = (this.currentIndex - 1 + this.currentImages.length) % this.currentImages.length;
      this.showImage(newIndex);
    });

    nextButton.addEventListener('click', () => {
      const newIndex = (this.currentIndex + 1) % this.currentImages.length;
      this.showImage(newIndex);
    });
  }

  bindEvents() {
    this.bindFavoriteButton();
    this.bindBookButton();
    this.bindReviewButton();
    this.bindAuthEvents();
  }

  bindFavoriteButton() {
    const favoriteButton = document.querySelector('.button-favorite');
    if (!favoriteButton) return;

    favoriteButton.addEventListener('click', async () => {
      if (this.isLoading) return;

      try {
        if (!this.currentUser) {
          this.showNotification('Для добавления в избранное необходимо авторизоваться', 'warning');
          return;
        }

        this.isLoading = true;
        favoriteButton.disabled = true;

        if (this.isFavorite) {
          await DetailsService.removeFromFavorites(
            this.tourId || null,
            this.flightId || null
          );
          this.isFavorite = false;
          this.updateFavoriteButton(false);
          this.showNotification('Удалено из избранного', 'success');
        } else {
          await DetailsService.addToFavorites(
            this.tourId || null,
            this.flightId || null
          );
          this.isFavorite = true;
          this.updateFavoriteButton(true);
          this.showNotification('Добавлено в избранное', 'success');
        }
      } catch (error) {
        console.error('Ошибка избранного:', error);
        if (error.isAlreadyFavorite) {
          this.isFavorite = true;
          this.updateFavoriteButton(true);
          this.showNotification('Уже в избранном', 'info');
        } else {
          this.showNotification('Ошибка при работе с избранным', 'error');
        }
      } finally {
        this.isLoading = false;
        favoriteButton.disabled = false;
      }
    });
  }

  bindBookButton() {
    const bookButton = document.querySelector('.button-book');
    if (!bookButton) return;

    bookButton.addEventListener('click', () => {
      if (!this.currentUser) {
        this.showNotification('Для бронирования необходимо авторизоваться', 'warning');
        return;
      }
      this.openBookingModal();
    });
  }

  bindReviewButton() {
    const reviewButton = document.querySelector('.button-review');
    if (!reviewButton) return;

    reviewButton.addEventListener('click', () => {
      if (!this.currentUser) {
        this.showNotification('Для написания отзыва необходимо авторизоваться', 'warning');
        return;
      }
      const reviewForm = document.querySelector('.review-form-container');
      if (reviewForm) {
        reviewForm.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  bindAuthEvents() {
    window.addEventListener('storage', (e) => {
      if (e.key === 'user') {
        this.loadUserData().then(() => this.checkFavoriteStatus());
      }
    });
  }

  openBookingModal() {
    if (this.flightId) {
      this.openFlightBookingModal();
    } else if (this.tourId) {
      this.openTourBookingModal();
    }
  }

  openTourBookingModal() {
    const modal = document.createElement('div');
    modal.className = 'booking-modal-overlay';
    modal.innerHTML = `
      <div class="booking-modal">
        <div class="booking-modal-header">
          <h3>Бронирование тура</h3>
          <button class="booking-modal-close">&times;</button>
        </div>
        <div class="booking-modal-content">
          <div class="booking-form">
            <div class="form-section">
              <h4>Количество путешественников</h4>
              <div class="travelers-input">
                <button class="counter-btn" data-action="decrease">-</button>
                <span class="travelers-count">1</span>
                <button class="counter-btn" data-action="increase">+</button>
              </div>
            </div>

            <div class="form-section">
              <h4>Трансфер до места сбора</h4>
              <div class="transportation-options">
                <label class="transport-option">
                  <input type="radio" name="transportation" value="self" ${this.currentData?.transportationIncluded ? 'disabled' : 'checked'}>
                  <span class="radio-custom"></span>
                  <span class="option-content">
                    <span class="option-title">Доберусь самостоятельно</span>
                    <span class="option-description">${this.currentData?.transportationIncluded ? 'Трансфер включен в стоимость' : 'Вы добираетесь до места начала тура самостоятельно'}</span>
                  </span>
                </label>
                <label class="transport-option ${this.currentData?.transportationIncluded ? 'disabled' : ''}">
                  <input type="radio" name="transportation" value="company" ${this.currentData?.transportationIncluded ? 'disabled' : ''}>
                  <span class="radio-custom"></span>
                  <span class="option-content">
                    <span class="option-title">Трансфер от компании</span>
                    <span class="option-description">${this.currentData?.transportationIncluded ? 'Уже включено' : 'Мы организуем трансфер из вашего города (+20%)'}</span>
                  </span>
                </label>
              </div>
            </div>
            <div class="form-section departure-city-section" style="display: none;">
              <h4>Город вылета</h4>
              <select class="departure-city-select">
                <option value="">Выберите город</option>
                ${this.currentData?.availableCities?.map(city =>
      `<option value="${city}">${city}</option>`
    ).join('') || ''}
              </select>
            </div>
            <div class="booking-summary">
              <h4>Итоговая информация</h4>
              <div class="summary-details">
                <div class="summary-row">
                  <span>Тур:</span>
                  <span class="summary-title">${this.currentData?.title || ''}</span>
                </div>
                <div class="summary-row">
                  <span>Количество путешественников:</span>
                  <span class="summary-travelers">1</span>
                </div>
                <div class="summary-row">
                  <span>Трансфер:</span>
                  <span class="summary-transport">${this.currentData?.transportationIncluded ? 'Включен' : 'Самостоятельно'}</span>
                </div>
                <div class="summary-row">
                  <span>Город вылета:</span>
                  <span class="summary-departure">-</span>
                </div>
                <div class="summary-row total-price">
                  <span>Итоговая стоимость:</span>
                  <span class="summary-total">${this.getCurrentPrice()} €</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="booking-modal-footer">
          <button class="button button-cancel">Отмена</button>
          <button class="button button-confirm-booking">Забронировать</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this.bindTourBookingModalEvents(modal);
  }
  openFlightBookingModal()
  {
    const modal = document.createElement('div');
    modal.className = 'booking-modal-overlay';
    modal.innerHTML = `
      <div class="booking-modal flight-booking-modal">
        <div class="booking-modal-header">
          <h3>Бронирование авиабилета</h3>
          <button class="booking-modal-close">&times;</button>
        </div>
        <div class="booking-modal-content">
          <div class="booking-form">
            <div class="form-section">
              <h4>Количество пассажиров</h4>
              <div class="travelers-input">
                <button class="counter-btn" data-action="decrease">-</button>
                <span class="travelers-count">1</span>
                <button class="counter-btn" data-action="increase">+</button>
              </div>
            </div>
            <div class="form-section">
              <h4>Выбор мест в самолете</h4>
              <div class="seat-selection">
                <div class="aircraft-layout">
                  <div class="aircraft-cabin">
                    <div class="cabin-title">Салон самолета ${this.currentData?.aircraftType || ''}</div>
                    <div class="seats-container" id="seats-container">
                    </div>
                    <div class="seat-legend">
                      <div class="legend-item">
                        <div class="seat available"></div>
                        <span>Свободно</span>
                      </div>
                      <div class="legend-item">
                        <div class="seat selected"></div>
                        <span>Выбрано</span>
                      </div>
                      <div class="legend-item">
                        <div class="seat occupied"></div>
                        <span>Занято</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="selected-seats-info">
                  <h5>Выбранные места:</h5>
                  <div class="selected-seats-list" id="selected-seats-list">
                    Не выбрано
                  </div>
                  <div class="selected-seats-warning" style="color: #ef4444; font-size: 0.875rem; margin-top: 0.5rem; display: none;">
                    Выберите места для всех пассажиров
                  </div>
                </div>
              </div>
            </div>
            <div class="form-section">
              <h4>Багаж</h4>
              <div class="baggage-options">
                <label class="baggage-option">
                  <input type="radio" name="baggage" value="none" checked>
                  <span class="radio-custom"></span>
                  <span class="option-content">
                    <span class="option-title">Только ручная кладь</span>
                    <span class="option-description">Бесплатно</span>
                  </span>
                </label>
                <label class="baggage-option">
                  <input type="radio" name="baggage" value="checked">
                  <span class="radio-custom"></span>
                  <span class="option-content">
                    <span class="option-title">Регистрируемый багаж</span>
                    <span class="option-description">+ ${this.currentData?.baggagePrice || 50} € за место</span>
                  </span>
                </label>
              </div>
              <div class="baggage-count-section" style="display: none;">
                <label>Количество мест багажа:</label>
                <div class="baggage-counter">
                  <button class="counter-btn" data-action="decrease-baggage">-</button>
                  <span class="baggage-count">1</span>
                  <button class="counter-btn" data-action="increase-baggage">+</button>
                </div>
              </div>
            </div>
            <div class="booking-summary">
              <h4>Итоговая информация</h4>
              <div class="summary-details">
                <div class="summary-row">
                  <span>Рейс:</span>
                  <span class="summary-title">${this.currentData?.airline || ''} ${this.currentData?.flightNumber || ''}</span>
                </div>
                <div class="summary-row">
                  <span>Маршрут:</span>
                  <span class="summary-route">${this.currentData?.departureCity || ''} → ${this.currentData?.arrivalCity || ''}</span>
                </div>
                <div class="summary-row">
                  <span>Количество пассажиров:</span>
                  <span class="summary-travelers">1</span>
                </div>
                <div class="summary-row">
                  <span>Выбранные места:</span>
                  <span class="summary-seats">Не выбрано</span>
                </div>
                <div class="summary-row">
                  <span>Багаж:</span>
                  <span class="summary-baggage">Только ручная кладь</span>
                </div>
                <div class="summary-row total-price">
                  <span>Итоговая стоимость:</span>
                  <span class="summary-total">${this.getCurrentPrice()} €</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="booking-modal-footer">
          <button class="button button-cancel">Отмена</button>
          <button class="button button-confirm-booking" disabled>Забронировать</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this.bindFlightBookingModalEvents(modal);
    this.generateSeatMap(modal);
  }
  bindTourBookingModalEvents(modal)
  {
    const closeBtn = modal.querySelector('.booking-modal-close');
    const cancelBtn = modal.querySelector('.button-cancel');
    const confirmBtn = modal.querySelector('.button-confirm-booking');
    const decreaseBtn = modal.querySelector('[data-action="decrease"]');
    const increaseBtn = modal.querySelector('[data-action="increase"]');
    const travelersCount = modal.querySelector('.travelers-count');
    const transportRadios = modal.querySelectorAll('input[name="transportation"]');
    const departureCitySection = modal.querySelector('.departure-city-section');
    const departureCitySelect = modal.querySelector('.departure-city-select');
    let currentTravelers = 1;
    let currentTransport = this.currentData?.transportationIncluded ? 'company' : 'self';
    let currentDepartureCity = '';
    const closeModal = () =>
    {
      document.body.removeChild(modal);
    };
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    decreaseBtn.addEventListener('click', () =>
    {
      if (currentTravelers > 1)
      {
        currentTravelers--;
        travelersCount.textContent = currentTravelers;
        this.updateTourBookingSummary(modal, currentTravelers, currentTransport, currentDepartureCity);
      }
    });
    increaseBtn.addEventListener('click', () =>
    {
      if (currentTravelers < 10)
      {
        currentTravelers++;
        travelersCount.textContent = currentTravelers;
        this.updateTourBookingSummary(modal, currentTravelers, currentTransport, currentDepartureCity);
      }
    });
    transportRadios.forEach(radio =>
    {
      radio.addEventListener('change', (e) =>
      {
        if (radio.disabled) return;
        currentTransport = e.target.value;
        if (currentTransport === 'company')
        {
          departureCitySection.style.display = 'block';
        }
        else
        {
          departureCitySection.style.display = 'none';
          currentDepartureCity = '';
        }
        this.updateTourBookingSummary(modal, currentTravelers, currentTransport, currentDepartureCity);
      });
    });
    departureCitySelect.addEventListener('change', (e) =>
    {
      currentDepartureCity = e.target.value;
      this.updateTourBookingSummary(modal, currentTravelers, currentTransport, currentDepartureCity);
    });
    confirmBtn.addEventListener('click', async () =>
    {
      if (currentTransport === 'company' && !currentDepartureCity)
      {
        this.showNotification('Пожалуйста, выберите город вылета', 'warning');
        return;
      }
      await this.submitTourBooking(currentTravelers, currentTransport, currentDepartureCity);
      closeModal();
    });
    this.updateTourBookingSummary(modal, currentTravelers, currentTransport, currentDepartureCity);
  }
  bindFlightBookingModalEvents(modal) {
    const closeBtn = modal.querySelector('.booking-modal-close');
    const cancelBtn = modal.querySelector('.button-cancel');
    const confirmBtn = modal.querySelector('.button-confirm-booking');
    const decreaseBtn = modal.querySelector('[data-action="decrease"]');
    const increaseBtn = modal.querySelector('[data-action="increase"]');
    const travelersCount = modal.querySelector('.travelers-count');
    const baggageRadios = modal.querySelectorAll('input[name="baggage"]');
    const baggageSection = modal.querySelector('.baggage-count-section');
    const decreaseBaggageBtn = modal.querySelector('[data-action="decrease-baggage"]');
    const increaseBaggageBtn = modal.querySelector('[data-action="increase-baggage"]');
    const baggageCount = modal.querySelector('.baggage-count');

    let currentBaggage = 'none';
    let currentBaggageCount = 1;

    const closeModal = () => {
      document.body.removeChild(modal);
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    decreaseBtn.addEventListener('click', () => {
      const currentCount = parseInt(travelersCount.textContent);
      if (currentCount > 1) {
        travelersCount.textContent = currentCount - 1;
        this.deselectExtraSeats(modal, currentCount - 1);
        this.updateFlightBookingSummary(modal);
      }
    });

    increaseBtn.addEventListener('click', () => {
      const currentCount = parseInt(travelersCount.textContent);
      if (currentCount < 10) {
        travelersCount.textContent = currentCount + 1;
        this.updateFlightBookingSummary(modal);
      }
    });

    baggageRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        currentBaggage = e.target.value;
        if (currentBaggage === 'checked') {
          baggageSection.style.display = 'block';
        } else {
          baggageSection.style.display = 'none';
          currentBaggageCount = 1;
          baggageCount.textContent = '1';
        }
        this.updateFlightBookingSummary(modal);
      });
    });

    decreaseBaggageBtn.addEventListener('click', () => {
      if (currentBaggageCount > 1) {
        currentBaggageCount--;
        baggageCount.textContent = currentBaggageCount;
        this.updateFlightBookingSummary(modal);
      }
    });

    increaseBaggageBtn.addEventListener('click', () => {
      const currentTravelers = parseInt(travelersCount.textContent);
      if (currentBaggageCount < currentTravelers * 2) {
        currentBaggageCount++;
        baggageCount.textContent = currentBaggageCount;
        this.updateFlightBookingSummary(modal);
      }
    });

    confirmBtn.addEventListener('click', async () => {
      const seatsContainer = modal.querySelector('#seats-container');
      const selectedSeats = seatsContainer ?
        Array.from(seatsContainer.querySelectorAll('.seat.selected'))
          .map(seat => seat.dataset.seat) : [];

      const currentTravelers = parseInt(travelersCount.textContent);
      if (selectedSeats.length !== currentTravelers) {
        this.showNotification(`Необходимо выбрать ${currentTravelers} мест(а)`, 'warning');
        return;
      }

      await this.submitFlightBooking(
        currentTravelers,
        selectedSeats,
        currentBaggage === 'checked',
        currentBaggageCount
      );
      closeModal();
    });
  }
  generateSeatMap(modal)
  {
    const seatsContainer = modal.querySelector('#seats-container');
    const totalSeats = this.currentData?.totalSeats || 180;
    const occupiedSeats = this.currentData?.occupiedSeats || [];
    const rows = Math.ceil(totalSeats / 6);
    let seatNumber = 1;

    for (let row = 1; row <= rows; row++)
    {
      const rowElement = document.createElement('div');
      rowElement.className = 'seat-row';

      const rowNumber = document.createElement('div');
      rowNumber.className = 'row-number';
      rowNumber.textContent = row;
      rowElement.appendChild(rowNumber);

      for (let seatLetter of ['A', 'B', 'C', 'D', 'E', 'F'])
      {
        if (seatNumber <= totalSeats)
        {
          const seatElement = document.createElement('div');
          const fullSeatNumber = `${row}${seatLetter}`;
          const isOccupied = occupiedSeats.includes(fullSeatNumber);
          seatElement.className = `seat ${isOccupied ? 'occupied' : 'available'}`;
          seatElement.dataset.seat = fullSeatNumber;
          seatElement.textContent = fullSeatNumber;

          if (!isOccupied)
          {
            seatElement.addEventListener('click', this.toggleSeatSelection.bind(this, seatElement, modal));
          }

          rowElement.appendChild(seatElement);
          if (seatLetter === 'C')
          {
            const aisle = document.createElement('div');
            aisle.className = 'aisle';
            aisle.textContent = '';
            rowElement.appendChild(aisle);
          }

          seatNumber++;
        }
      }

      seatsContainer.appendChild(rowElement);
    }
  }
  toggleSeatSelection(seatElement, modal)
  {
    const countEl = modal.querySelector('.travelers-count');
    const currentTravelers = parseInt(countEl.textContent, 10);
    if (seatElement.classList.contains('occupied')) return;
    const seatsContainer = modal.querySelector('#seats-container');
    const currentlySelected = seatsContainer ? seatsContainer.querySelectorAll('.seat.selected').length : 0;
    if (seatElement.classList.contains('selected')) {
      seatElement.classList.remove('selected');
    } else
    {
      if (currentlySelected >= currentTravelers) {
        this.showNotification(`Можно выбрать только ${currentTravelers} мест(а)`, 'warning');
        return;
      }
      seatElement.classList.add('selected');
    }
    this.updateSelectedSeatsInfo(modal);
    this.updateFlightBookingSummary(modal);
  }
  updateSelectedSeatsInfo(modal)
  {
    const selectedSeatsList = modal.querySelector('#selected-seats-list');
    const seatsContainer = modal.querySelector('#seats-container');
    const selectedSeats = seatsContainer ? Array.from(seatsContainer.querySelectorAll('.seat.selected')).map(seat => seat.dataset.seat) : [];
    if (selectedSeats.length === 0)
    {
      selectedSeatsList.textContent = 'Не выбрано';
    } else
    {
      selectedSeatsList.textContent = selectedSeats.join(', ');
    }
  }
  deselectExtraSeats(modal, maxSeats)
  {
    const seatsContainer = modal.querySelector('#seats-container');
    if (!seatsContainer) return;
    const selectedSeats = Array.from(seatsContainer.querySelectorAll('.seat.selected'));
    if (selectedSeats.length > maxSeats)
    {
      for (let i = maxSeats; i < selectedSeats.length; i++)
      {
        selectedSeats[i].classList.remove('selected');
      }
      this.updateSelectedSeatsInfo(modal);
    }
  }
  updateTourBookingSummary(modal, travelers, transport, departureCity)
  {
    const summaryTravelers = modal.querySelector('.summary-travelers');
    const summaryTransport = modal.querySelector('.summary-transport');
    const summaryDeparture = modal.querySelector('.summary-departure');
    const summaryTotal = modal.querySelector('.summary-total');
    summaryTravelers.textContent = travelers;
    if (this.currentData?.transportationIncluded)
    {
      summaryTransport.textContent = 'Включен';
    } else
    {
      summaryTransport.textContent = transport === 'self' ? 'Самостоятельно' : 'Трансфер от компании';
    }
    summaryDeparture.textContent = departureCity || '-';
    const basePrice = this.getCurrentPrice();
    let totalPrice = basePrice * travelers;
    if (!this.currentData?.transportationIncluded && transport === 'company')
    {
      totalPrice += basePrice * travelers * 0.2;
    }
    summaryTotal.textContent = `${totalPrice.toLocaleString('ru-RU')} €`;
  }
  updateFlightBookingSummary(modal)
  {
    const summaryTravelers = modal.querySelector('.summary-travelers');
    const summarySeats = modal.querySelector('.summary-seats');
    const summaryBaggage = modal.querySelector('.summary-baggage');
    const summaryTotal = modal.querySelector('.summary-total');
    const confirmBtn = modal.querySelector('.button-confirm-booking');
    const warning = modal.querySelector('.selected-seats-warning');
    const seatsContainer = modal.querySelector('#seats-container');
    const selectedSeats = seatsContainer ? Array.from(seatsContainer.querySelectorAll('.seat.selected')).map(seat => seat.dataset.seat) : [];
    const currentTravelers = parseInt(modal.querySelector('.travelers-count').textContent);
    const currentBaggage = modal.querySelector('input[name="baggage"]:checked').value;
    const currentBaggageCount = parseInt(modal.querySelector('.baggage-count').textContent);
    summaryTravelers.textContent = currentTravelers;
    summarySeats.textContent = selectedSeats.length > 0 ? selectedSeats.join(', ') : 'Не выбрано';
    if (currentBaggage === 'none')
    {
      summaryBaggage.textContent = 'Только ручная кладь';
    }
    else
    {
      summaryBaggage.textContent = `Регистрируемый багаж (${currentBaggageCount} мест)`;
    }
    const basePrice = this.getCurrentPrice();
    let totalPrice = basePrice * currentTravelers;
    if (currentBaggage === 'checked')
    {
      const baggagePrice = this.currentData?.baggagePrice || 50;
      totalPrice += baggagePrice * currentBaggageCount;
    }
    summaryTotal.textContent = `${totalPrice.toLocaleString('ru-RU')} €`;
    const canConfirm = selectedSeats.length === currentTravelers;
    confirmBtn.disabled = !canConfirm;
    if (warning)
    {
      warning.style.display = canConfirm ? 'none' : 'block';
    }
  }
  async submitTourBooking(travelersCount, transportationType, departureCity) {
    try {
      const basePrice = this.currentData.originalPrice || this.currentData.price;
      const finalPrice = this.currentData.price;

      let totalPrice = finalPrice * travelersCount;

      if (!this.currentData?.transportationIncluded && transportationType === 'company') {
        totalPrice += finalPrice * travelersCount * 0.2;
      }

      const bookingData = {
        travelersCount: travelersCount,
        transportationType: transportationType,
        departureCity: transportationType === 'company' ? departureCity : null,
        totalPrice: totalPrice,
        tourId: this.tourId
      };
      const result = await DetailsService.createBooking(bookingData);
      if (result.success) {
        this.showNotification('Тур успешно забронирован!', 'success');
        setTimeout(() => {
          window.location.href = '/client/profile';
        }, 2000);
      }
    } catch (error) {
      console.error('Ошибка бронирования тура:', error);
      this.showNotification('Ошибка при бронировании тура', 'error');
    }
  }
  async submitFlightBooking(travelersCount, selectedSeats, hasBaggage, baggageCount) {
    try {
      const basePrice = this.currentData.originalPrice || this.currentData.price;
      const finalPrice = this.currentData.price;

      let totalPrice = finalPrice * travelersCount;

      if (hasBaggage) {
        const baggagePrice = this.currentData?.baggagePrice || 50;
        totalPrice += baggagePrice * baggageCount;
      }

      const bookingData = {
        travelersCount: travelersCount,
        selectedSeats: selectedSeats,
        hasBaggage: hasBaggage,
        baggageCount: baggageCount,
        totalPrice: totalPrice,
        flightId: this.flightId
      };
      const result = await DetailsService.createBooking(bookingData);
      if (result.success) {
        this.showNotification('Авиабилет успешно забронирован!', 'success');
        setTimeout(() => {
          window.location.href = '/client/profile';
        }, 2000);
      }
    } catch (error) {
      console.error('Ошибка бронирования авиабилета:', error);
      this.showNotification('Ошибка при бронировании авиабилета', 'error');
    }
  }
  getCurrentPrice() {
    const priceContainer = document.querySelector('.price-container');

    if (priceContainer) {
      const finalPriceElement = priceContainer.querySelector('.final-price');
      if (finalPriceElement) {
        const priceText = finalPriceElement.textContent;
        let normalizedPrice = priceText.replace(/[^\d,.]/g, '');
        if (normalizedPrice.includes(',') && normalizedPrice.includes('.')) {
          normalizedPrice = normalizedPrice.replace(/,/g, '');
        } else {
          normalizedPrice = normalizedPrice.replace(',', '.');
        }
        return parseFloat(normalizedPrice) || 0;
      }
      const priceElement = document.querySelector('.price-amount');
      if (priceElement) {
        const priceText = priceElement.textContent;
        let normalizedPrice = priceText.replace(/[^\d,.]/g, '');
        if (normalizedPrice.includes(',') && normalizedPrice.includes('.')) {
          normalizedPrice = normalizedPrice.replace(/,/g, '');
        } else {
          normalizedPrice = normalizedPrice.replace(',', '.');
        }
        return parseFloat(normalizedPrice) || 0;
      }
    }
    return this.currentData?.price || 0;
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

  showLoading() {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.style.opacity = '0.7';
      mainContent.style.pointerEvents = 'none';
    }
  }

  hideLoading() {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.style.opacity = '1';
      mainContent.style.pointerEvents = 'auto';
    }
  }

  showError(message) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-container';
    errorContainer.innerHTML = `
      <div class="error-message">
        <span class="material-symbols-outlined">error</span>
        <h3>Ошибка</h3>
        <p>${message}</p>
        <button onclick="location.reload()" class="retry-button">Обновить страницу</button>
      </div>
    `;

    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.innerHTML = '';
      mainContent.appendChild(errorContainer);
    }
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
  window.detailsPage = new DetailsPage();
});
export { DetailsPage };