let currentUser = null;

let allTours = [];
async function loadTours() {
  try {
    const response = await fetch('/api/tours/all');
    const result = await response.json();

    if (result.success) {
      allTours = result.tours;
      displayTours(allTours);
      updateFilters(allTours);
    } else {
      console.error('Error loading tours:', result.error);
      showError('Ошибка загрузки туров');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Ошибка загрузки туров');
  }
}
async function loadUserData() {
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      currentUser = JSON.parse(userData);
      updateUserInfo();
    }
  } catch (error) {
    console.error('Ошибка загрузки данных пользователя:', error);
  }
}

function updateUserInfo() {
  if (currentUser && currentUser.photo) {
    const avatar = document.querySelector('.user-avatar');
    if (avatar) {
      avatar.src = currentUser.photo;
    }
  }
}
document.addEventListener('DOMContentLoaded', loadUserData);
function displayTours(tours) {
  const container = document.getElementById('toursContainer');

  if (tours.length === 0) {
    container.innerHTML = `
        <div class="no-tours">
          <span class="material-symbols-outlined" style="font-size: 3rem; margin-bottom: 1rem;">search_off</span>
          <p>Туры не найдены</p>
        </div>
      `;
    return;
  }

  container.innerHTML = '<div class="tours-grid"></div>';
  const grid = container.querySelector('.tours-grid');

  tours.forEach(tour => {
    const tourCard = document.createElement('div');
    tourCard.className = 'tour-card';

    const citiesList = tour.availableCities && tour.availableCities.length > 0
      ? tour.availableCities.map(city => `<span class="city-tag">${city}</span>`).join('')
      : '';

    tourCard.innerHTML = `
        <img src="${tour.mainImage}" alt="${tour.title}" class="tour-image">
        <div class="tour-content">
          <h3 class="tour-title">${tour.title}</h3>
          <p class="tour-description">${tour.description}</p>

          <div class="tour-details">
            <div class="detail-item">
              <span class="material-symbols-outlined" style="font-size: 16px;">location_on</span>
              ${tour.country}, ${tour.city}
            </div>
            <div class="detail-item">
              <span class="material-symbols-outlined" style="font-size: 16px;">date_range</span>
              ${tour.dates}
            </div>
            ${tour.transportationIncluded ? `
            <div class="detail-item">
              <span class="material-symbols-outlined" style="font-size: 16px;">directions_bus</span>
              Трансфер включен
            </div>
            ` : ''}
          </div>

          ${citiesList ? `
          <div class="cities-list">
            ${citiesList}
          </div>
          ` : ''}

          <div class="tour-features">
            <span class="feature-badge">${tour.country}</span>
            <span class="availability ${tour.available ? '' : 'unavailable'}">
              ${tour.available ? 'Доступен' : 'Недоступен'}
            </span>
          </div>

          <div class="tour-price">${tour.price}</div>
        </div>
      `;
    grid.appendChild(tourCard);
  });
}
function updateFilters(tours) {
  const countryFilter = document.getElementById('countryFilter');
  const countries = [...new Set(tours.map(tour => tour.country))].sort();
  countries.forEach(country => {
    const option = document.createElement('option');
    option.value = country;
    option.textContent = country;
    countryFilter.appendChild(option);
  });
}
function filterTours() {
  const countryFilter = document.getElementById('countryFilter').value;
  const availabilityFilter = document.getElementById('availabilityFilter').value;
  let filteredTours = allTours;
  if (countryFilter) {
    filteredTours = filteredTours.filter(tour => tour.country === countryFilter);
  }
  if (availabilityFilter === 'available') {
    filteredTours = filteredTours.filter(tour => tour.available);
  } else if (availabilityFilter === 'unavailable') {
    filteredTours = filteredTours.filter(tour => !tour.available);
  }
  displayTours(filteredTours);
}

function showError(message) {
  showNotification(message, 'error');
}

function showNotification(message, type = 'info') {
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

function getNotificationIcon(type) {
  const icons = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info'
  };
  return icons[type] || 'info';
}
document.addEventListener('DOMContentLoaded', loadTours);