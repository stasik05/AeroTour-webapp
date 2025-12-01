let currentUser = null;
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
async function loadFlights() {
  try {
    const response = await fetch('/api/flights/all');
    const result = await response.json();
    if (result.success)
    {
      displayFlights(result.flights);
    } else {
      console.error('Error loading flights:', result.error);
      document.getElementById('flightsContainer').innerHTML = `
          <div class="no-flights">
            <span class="material-symbols-outlined" style="font-size: 3rem; margin-bottom: 1rem;">error</span>
            <p>Ошибка загрузки перелетов</p>
          </div>
        `;
    }
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('flightsContainer').innerHTML = `
        <div class="no-flights">
          <span class="material-symbols-outlined" style="font-size: 3rem; margin-bottom: 1rem;">error</span>
          <p>Ошибка загрузки перелетов</p>
        </div>
      `;
  }
}
function displayFlights(flights) {
  const container = document.getElementById('flightsContainer');
  if (flights.length === 0) {
    container.innerHTML = `
        <div class="no-flights">
          <span class="material-symbols-outlined" style="font-size: 3rem; margin-bottom: 1rem;">flight</span>
          <p>Нет доступных перелетов для удаления</p>
        </div>
      `;
    return;
  }
  container.innerHTML = '<div class="flights-grid"></div>';
  const grid = container.querySelector('.flights-grid');
  flights.forEach(flight => {
    const flightCard = document.createElement('div');
    flightCard.className = 'flight-card';
    const availabilityStatus = flight.available
      ? '<div class="availability-status available">✓ Доступен для бронирования</div>'
      : '<div class="availability-status unavailable">✗ Недоступен для бронирования</div>';

    flightCard.innerHTML = `
        <img src="${flight.mainImage}" alt="${flight.airline}" class="flight-image">
        <h3 class="flight-title">${flight.airline} ${flight.flightNumber}</h3>
        ${availabilityStatus}
        <div class="flight-details1">
          <strong>${flight.route}</strong><br>
          Вылет: ${flight.departureTime}<br>
          Прилет: ${flight.arrivalTime}<br>
          Длительность: ${flight.duration}<br>
          ${flight.aircraftType ? `Самолет: ${flight.aircraftType}<br>` : ''}
          Багаж: ${flight.baggagePrice}
        </div>
        <div class="flight-price">${flight.price}</div>
        <button class="delete-btn" onclick="deleteFlight(${flight.id}, '${flight.airline} ${flight.flightNumber}'.replace(/'/g, "\\'"))">
          <span class="material-symbols-outlined">delete</span>
          Удалить перелет
        </button>
      `;
    grid.appendChild(flightCard);
  });
}

async function deleteFlight(flightId, flightTitle) {
  if (!confirm(`Вы уверены, что хотите удалить перелет "${flightTitle}"? Это действие нельзя отменить.`)) {
    return;
  }

  try {
    const response = await fetch(`/api/flights/delete/${flightId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
      showSuccess('Перелет успешно удален!');
      loadFlights();
    } else {
      showError('Ошибка при удалении перелета: ' + result.error);
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Произошла ошибка при удалении перелета');
  }
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