let currentBookings = [];
let currentBookingId = null;
let currentBookingStatus = null;
let currentUser = null;
document.addEventListener('DOMContentLoaded', function() {
  loadBookings();
  loadUserData();
});
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
async function loadBookings() {
  try {
    showLoading(true);
    const response = await fetch('/api/bookings/all');
    const data = await response.json();

    if (data.success) {
      currentBookings = data.bookings;
      renderBookings(currentBookings);
    } else {
      showError('Ошибка при загрузке бронирований');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Ошибка при загрузке бронирований');
  } finally {
    showLoading(false);
  }
}
function renderBookings(bookings) {
  const tbody = document.getElementById('bookingsTableBody');

  if (!bookings || bookings.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="loading">
          <span class="material-symbols-outlined" style="font-size: 48px; margin-bottom: 16px;">search_off</span>
          <div>Бронирования не найдены</div>
        </td>
      </tr>
    `;
    return;
  }
  tbody.innerHTML = bookings.map(booking => {
    const user = booking.user || {};
    const tour = booking.tour || {};
    const flight = booking.flight || {};
    const userPhoto = user.photo || '/shared/images/default-avatar.png';
    const userName = `${user.name || 'Неизвестно'} ${user.last_name || ''}`.trim();
    const userEmail = user.email || 'Email не указан';
    const bookingType = booking.booking_type || (tour.id ? 'tour' : flight.id ? 'flight' : 'unknown');
    let serviceTitle = '';
    let serviceDetails = '';

    if (bookingType === 'tour') {
      serviceTitle = tour.title || 'Тур без названия';
      serviceDetails = [tour.city, tour.country].filter(Boolean).join(', ') || 'Место не указано';
    } else if (bookingType === 'flight') {
      serviceTitle = `${flight.airline || 'Авиакомпания'} ${flight.flight_number || ''}`.trim();
      serviceDetails = `${flight.departure_city || ''} → ${flight.arrival_city || ''}`;
    } else {
      serviceTitle = 'Неизвестное бронирование';
      serviceDetails = 'Информация отсутствует';
    }
    const bookingDate = booking.booking_date ? new Date(booking.booking_date).toLocaleDateString('ru-RU') : 'Дата не указана';
    const datesInfo = formatBookingDates(booking);
    const travelersCount = booking.travelers_count || 1;
    let passengersInfo = '';

    if (bookingType === 'flight') {
      passengersInfo = `Места: ${formatSeatInfo(booking.selected_seats, travelersCount)}`;
    } else {
      passengersInfo = `Пассажиров: ${travelersCount}`;
    }
    const status = booking.status || 'Неизвестно';
    const totalPrice = parseFloat(booking.total_price) || 0;
    const canChangeStatus = status !== 'Завершено' && status !== 'Отменено';

    return `
    <tr class="booking-row">
      <td data-label="Клиент">
        <div class="user-info">
          <img src="${userPhoto}" 
               alt="Avatar" class="user-avatar"
               onerror="this.src='/shared/images/default-avatar.png'">
          <div>
            <div class="user-name">${userName}</div>
            <div style="font-size: 12px; color: #64748b;">${userEmail}</div>
          </div>
        </div>
      </td>
      <td data-label="Тип">
        <span class="booking-type ${bookingType === 'tour' ? 'type-tour' : 'type-flight'}">
          ${bookingType === 'tour' ? 'Тур' : 'Авиабилет'}
        </span>
      </td>
      <td data-label="Детали">
        <div style="font-weight: 500;">
          ${serviceTitle}
        </div>
        <div style="font-size: 12px; color: #64748b;">
          ${serviceDetails}
        </div>
      </td>
      <td data-label="Даты">
        <div style="font-size: 14px;">
          ${datesInfo}
        </div>
        <div style="font-size: 12px; color: #64748b;">
          Бронирование: ${bookingDate}
        </div>
      </td>
      <td data-label="Места/Пассажиры">
        <div style="font-size: 14px;">
          ${passengersInfo}
        </div>
        ${booking.has_baggage ? `
          <div style="font-size: 12px; color: #64748b;">
            Багаж: ${booking.baggage_count || 0} шт
          </div>
        ` : ''}
      </td>
      <td data-label="Статус">
        <span class="status-badge status-${getStatusClass(status)}">
          ${status}
        </span>
      </td>
      <td data-label="Стоимость" style="font-weight: 600;">
        ${totalPrice.toLocaleString('ru-RU')} €
      </td>
      <td data-label="Действия">
        <div class="action-buttons">
          <button class="btn btn-primary btn-sm" onclick="showStatusModal(${booking.id})" 
                  ${!canChangeStatus ? 'disabled title="Статус нельзя изменить"' : 'title="Изменить статус"'}>
            <span class="material-symbols-outlined" style="font-size: 14px;">edit</span>
          </button>
          <button class="btn btn-secondary btn-sm" onclick="showHistory(${booking.id})" title="История изменений">
            <span class="material-symbols-outlined" style="font-size: 14px;">history</span>
          </button>
        </div>
      </td>
    </tr>
    `;
  }).join('');
}

function formatBookingDates(booking) {
  const tour = booking.tour || {};
  const flight = booking.flight || {};
  const bookingType = booking.booking_type || (tour.id ? 'tour' : flight.id ? 'flight' : 'unknown');

  if (bookingType === 'tour') {
    const startDate = tour.start_date ? new Date(tour.start_date).toLocaleDateString('ru-RU') : 'Дата не указана';
    const endDate = tour.end_date ? new Date(tour.end_date).toLocaleDateString('ru-RU') : 'Дата не указана';
    return `${startDate} - ${endDate}`;
  } else if (bookingType === 'flight') {
    return flight.departure_time
      ? new Date(flight.departure_time).toLocaleDateString('ru-RU')
      : 'Дата не указана';
  } else {
    return 'Даты не указаны';
  }
}
function formatSeatInfo(selectedSeats, travelersCount) {
  try {
    if (!selectedSeats) {
      return travelersCount > 1 ? `${travelersCount} мест` : 'Место не выбрано';
    }

    let seats = null;
    if (typeof selectedSeats === 'string') {
      if (selectedSeats.startsWith('[') && selectedSeats.endsWith(']')) {
        try {
          seats = JSON.parse(selectedSeats);
        } catch (parseError) {
          seats = [selectedSeats.trim()];
        }
      } else {
        seats = [selectedSeats.trim()];
      }
    } else if (Array.isArray(selectedSeats)) {
      seats = selectedSeats;
    }

    if (seats && seats.length > 0) {
      if (seats.length === 1) {
        return `Место ${seats[0]}`;
      } else {
        return `${seats.length} места: ${seats.join(', ')}`;
      }
    } else {
      return travelersCount > 1 ? `${travelersCount} мест` : 'Место не выбрано';
    }
  } catch (error) {
    return travelersCount > 1 ? `${travelersCount} мест` : 'Место не выбрано';
  }
}
function getStatusClass(status) {
  const statusMap = {
    'Активно': 'active',
    'Отменено': 'cancelled',
    'Завершено': 'completed'
  };
  return statusMap[status] || 'active';
}

async function searchBookings() {
  try {
    showLoading(true);

    const params = new URLSearchParams({
      query: document.getElementById('searchQuery').value,
      status: document.getElementById('statusFilter').value,
      bookingType: document.getElementById('typeFilter').value,
      dateFrom: document.getElementById('dateFrom').value,
      dateTo: document.getElementById('dateTo').value
    });
    const response = await fetch(`/api/bookings/search?${params}`);
    const data = await response.json();
    if (data.success) {
      currentBookings = data.bookings;
      renderBookings(data.bookings);
    } else {
      showError(data.message || 'Ошибка при поиске');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Ошибка при поиске');
  } finally {
    showLoading(false);
  }
}
function resetFilters() {
  document.getElementById('searchQuery').value = '';
  document.getElementById('statusFilter').value = 'all';
  document.getElementById('typeFilter').value = 'all';
  document.getElementById('dateFrom').value = '';
  document.getElementById('dateTo').value = '';
  loadBookings();
}
function showStatusModal(bookingId) {
  currentBookingId = bookingId;
  const booking = currentBookings.find(b => b.id === bookingId);

  if (booking) {
    const user = booking.user || {};
    const userName = `${user.name || 'Неизвестно'} ${user.last_name || ''}`.trim();
    currentBookingStatus = booking.status;

    document.getElementById('statusModalText').innerHTML = `
      <strong>Бронирование #${bookingId}</strong><br>
      Клиент: ${userName}<br>
      Текущий статус: <span class="status-badge status-${getStatusClass(currentBookingStatus)}">${currentBookingStatus}</span>
    `;
    renderStatusButtons(currentBookingStatus);
    openModal('statusModal');
  }
}
function renderStatusButtons(currentStatus) {
  const buttonsContainer = document.getElementById('statusButtons');
  let buttonsHTML = '';
  if (currentStatus === 'Завершено') {
    buttonsHTML = `
      <div style="text-align: center; color: #64748b; padding: 20px;">
        <span class="material-symbols-outlined" style="font-size: 48px; margin-bottom: 16px;">lock</span>
        <div>Статус "Завершено" нельзя изменить</div>
      </div>
    `;
  } else if (currentStatus === 'Отменено') {
    buttonsHTML = `
      <div style="text-align: center; color: #64748b; padding: 20px;">
        <span class="material-symbols-outlined" style="font-size: 48px; margin-bottom: 16px;">block</span>
        <div>Статус "Отменено" нельзя изменить</div>
      </div>
    `;
  } else {
    buttonsHTML = `
      <button class="btn btn-success" onclick="updateStatus('Активно')" ${currentStatus === 'Активно' ? 'disabled' : ''}>
        Активно
      </button>
      <button class="btn btn-danger" onclick="updateStatus('Отменено')">
        Отменить
      </button>
      <button class="btn btn-primary" onclick="updateStatus('Завершено')">
        Завершить
      </button>
    `;
  }
  buttonsContainer.innerHTML = buttonsHTML;
}
async function updateStatus(status) {
  if (!currentBookingId) return;
  try {
    const response = await fetch(`/api/bookings/${currentBookingId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });

    const data = await response.json();

    if (data.success) {
      closeModal('statusModal');
      showSuccess('Статус обновлен успешно');
      loadBookings();
    } else {
      showError(data.message || 'Ошибка при обновлении статуса');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Ошибка при обновлении статуса');
  }
}

async function showHistory(bookingId) {
  try {
    const response = await fetch(`/api/bookings/${bookingId}/history`);
    const data = await response.json();
    if (data.success) {
      const historyContent = document.getElementById('historyContent');

      if (data.history.length === 0) {
        historyContent.innerHTML = '<p>История изменений отсутствует</p>';
      } else {
        historyContent.innerHTML = data.history.map(item => `
          <div class="history-item">
            <span class="status-badge status-${getStatusClass(item.status)}">
              ${item.status}
            </span>
            <span style="color: #64748b; font-size: 14px;">
              ${new Date(item.changed_at).toLocaleString('ru-RU')}
            </span>
          </div>
        `).join('');
      }

      openModal('historyModal');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Ошибка при загрузке истории');
  }
}

function openModal(modalId) {
  document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
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
function showLoading(show) {
  const tbody = document.getElementById('bookingsTableBody');
  if (show) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="loading">
          <span class="material-symbols-outlined" style="font-size: 48px; margin-bottom: 16px;">sync</span>
          <div>Загрузка бронирований...</div>
        </td>
      </tr>
    `;
  }
}
window.onclick = function(event) {
  const modals = document.getElementsByClassName('modal');
  for (let modal of modals) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  }
}