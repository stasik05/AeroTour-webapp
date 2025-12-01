let currentUser = null;
async function loadTours() {
  try {
    const response = await fetch('/api/tours/all');
    const result = await response.json();

    if (result.success) {
      displayTours(result.tours);
    } else {
      console.error('Error loading tours:', result.error);
      document.getElementById('toursContainer').innerHTML = `
          <div class="no-tours">
            <span class="material-symbols-outlined" style="font-size: 3rem; margin-bottom: 1rem;">error</span>
            <p>Ошибка загрузки туров</p>
          </div>
        `;
    }
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('toursContainer').innerHTML = `
        <div class="no-tours">
          <span class="material-symbols-outlined" style="font-size: 3rem; margin-bottom: 1rem;">error</span>
          <p>Ошибка загрузки туров</p>
        </div>
      `;
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
          <span class="material-symbols-outlined" style="font-size: 3rem; margin-bottom: 1rem;">beach_access</span>
          <p>Нет доступных туров для удаления</p>
        </div>
      `;
    return;
  }

  container.innerHTML = '<div class="tours-grid"></div>';
  const grid = container.querySelector('.tours-grid');

  tours.forEach(tour => {
    const tourCard = document.createElement('div');
    tourCard.className = 'tour-card';
    const availabilityStatus = tour.available
      ? '<div class="availability-status available">✓ Доступен для бронирования</div>'
      : '<div class="availability-status unavailable">✗ Недоступен для бронирования</div>';

    tourCard.innerHTML = `
        <img src="${tour.mainImage}" alt="${tour.title}" class="tour-image">
        <h3 class="tour-title">${tour.title}</h3>
        ${availabilityStatus}
        <div class="tour-details">
          <strong>${tour.country}, ${tour.city}</strong><br>
          ${tour.dates}<br>
          ${tour.description}
        </div>
        <div class="tour-price">${tour.price}</div>
        <button class="delete-btn" onclick="deleteTour(${tour.id}, '${tour.title.replace(/'/g, "\\'")}')">
          <span class="material-symbols-outlined">delete</span>
          Удалить тур
        </button>
      `;
    grid.appendChild(tourCard);
  });
}

async function deleteTour(tourId, tourTitle) {
  if (!confirm(`Вы уверены, что хотите удалить тур "${tourTitle}"? Это действие нельзя отменить.`)) {
    return;
  }

  try {
    const response = await fetch(`/api/tours/delete/${tourId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
      showSuccess('Тур успешно удален!');
      loadTours();
    } else {
      showError('Ошибка при удалении тура: ' + result.error);
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Произошла ошибка при удалении тура');
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
document.addEventListener('DOMContentLoaded', loadTours);