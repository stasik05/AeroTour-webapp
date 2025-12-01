let allFlights = [];
let currentUser = null;
async function loadFlights() {
  try {
    const response = await fetch('/api/flights/all');
    const result = await response.json();

    if (result.success) {
      allFlights = result.flights;
      displayFlights(allFlights);
      updateFilters(allFlights);
    } else {
      console.error('Error loading flights:', result.error);
      showError('Ошибка загрузки перелетов');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Ошибка загрузки перелетов');
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
function displayFlights(flights) {
  const container = document.getElementById('flightsContainer');

  if (flights.length === 0) {
    container.innerHTML = `
        <div class="no-flights">
          <span class="material-symbols-outlined" style="font-size: 3rem; margin-bottom: 1rem;">search_off</span>
          <p>Перелеты не найдены</p>
        </div>
      `;
    return;
  }

  container.innerHTML = '<div class="flights-grid"></div>';
  const grid = container.querySelector('.flights-grid');

  flights.forEach(flight => {
    const flightCard = document.createElement('div');
    flightCard.className = 'flight-card';

    flightCard.innerHTML = `
        <img src="${flight.mainImage}" alt="${flight.airline}" class="flight-image">
        <div class="flight-content">
          <h3 class="flight-title">${flight.airline} ${flight.flightNumber}</h3>
          <div class="flight-route">${flight.route}</div>
          
          <div class="duration-badge">Длительность: ${flight.duration}</div>

          <div class="flight-details1">
            <div class="detail-item">
              <span class="material-symbols-outlined" style="font-size: 16px;">flight_takeoff</span>
              ${flight.departureTime}
            </div>
            <div class="detail-item">
              <span class="material-symbols-outlined" style="font-size: 16px;">flight_land</span>
              ${flight.arrivalTime}
            </div>
            ${flight.aircraftType ? `
            <div class="detail-item">
              <span class="material-symbols-outlined" style="font-size: 16px;">travel</span>
              ${flight.aircraftType}
            </div>
            ` : ''}
            ${flight.totalSeats ? `
            <div class="detail-item">
              <span class="material-symbols-outlined" style="font-size: 16px;">airline_seat_recline_normal</span>
              ${flight.totalSeats} мест
            </div>
            ` : ''}
          </div>

          <div class="flight-features">
            <span class="feature-badge">${flight.departureCity} → ${flight.arrivalCity}</span>
            <span class="availability ${flight.available ? '' : 'unavailable'}">
              ${flight.available ? 'Доступен' : 'Недоступен'}
            </span>
          </div>

          <div class="flight-price">
            ${flight.price}
            ${flight.baggagePrice ? `<div style="font-size: 0.875rem; color: #94a3b8;">Багаж: ${flight.baggagePrice}</div>` : ''}
          </div>
        </div>
      `;
    grid.appendChild(flightCard);
  });
}

function updateFilters(flights) {
  const airlineFilter = document.getElementById('airlineFilter');
  const airlines = [...new Set(flights.map(flight => flight.airline))].sort();

  airlines.forEach(airline => {
    const option = document.createElement('option');
    option.value = airline;
    option.textContent = airline;
    airlineFilter.appendChild(option);
  });
}

function filterFlights() {
  const airlineFilter = document.getElementById('airlineFilter').value;
  const availabilityFilter = document.getElementById('availabilityFilter').value;

  let filteredFlights = allFlights;

  if (airlineFilter) {
    filteredFlights = filteredFlights.filter(flight => flight.airline === airlineFilter);
  }

  if (availabilityFilter === 'available') {
    filteredFlights = filteredFlights.filter(flight => flight.available);
  } else if (availabilityFilter === 'unavailable') {
    filteredFlights = filteredFlights.filter(flight => !flight.available);
  }

  displayFlights(filteredFlights);
}

function showSuccess(message) {
  showNotification(message, 'success');
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

document.addEventListener('DOMContentLoaded', loadFlights);