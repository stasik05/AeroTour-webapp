import {CalendarService} from '/shared/js/CalendarService.js';
class CalendarPage {
  constructor() {
    this.currentDate = new Date();
    this.bookings = [];
    this.selectedBooking = null;
    this.init();
  }
  async init()
  {
    await this.loadUserData();
    await this.loadBookings();
    this.renderCalendar();
    this.setupEventListeners();
  }
  async loadBookings() {
    try {
      const data = await CalendarService.getBookings();
      if (!data || !data.bookings) {
        console.error('Нет данных о бронированиях');
        return;
      }
      this.bookings = data.bookings.map(booking => this.normalizeBookingDates(booking));
      this.logBookingStats();
    } catch (error) {
      console.error(' Ошибка загрузки бронирований:', error);
      this.showNotification('Ошибка загрузки данных календаря', 'error');
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
  normalizeBookingDates(booking) {
    const normalizeDate = (dateString) => {
      if (!dateString) return null;
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          console.warn(`Некорректная дата: ${dateString}`);
          return null;
        }
        return date.toISOString().split('T')[0];
      } catch (error) {
        console.error(`Ошибка преобразования даты ${dateString}:`, error);
        return null;
      }
    };
    return {
      ...booking,
      startDate: normalizeDate(booking.startDate),
      endDate: normalizeDate(booking.endDate)
    };
  }
  logBookingStats() {
    const stats = {
      total: this.bookings.length,
      tours: this.bookings.filter(b => b.tripType === 'tour').length,
      flights: this.bookings.filter(b => b.tripType === 'flight').length,
      other: this.bookings.filter(b => !b.tripType || b.tripType === 'other').length,
      withValidDates: this.bookings.filter(b => b.startDate && b.endDate).length
    };
  }
  renderCalendar() {
    const monthYearElement = document.querySelector('.current-month');
    const daysContainer = document.querySelector('.calendar-days');
    if (!monthYearElement || !daysContainer) {
      console.error('Не найдены элементы календаря');
      return;
    }
    monthYearElement.textContent = this.getMonthYearString();
    daysContainer.innerHTML = '';
    const calendarDays = this.generateCalendarDays();
    calendarDays.forEach(day => {
      const dayElement = this.createDayElement(day);
      daysContainer.appendChild(dayElement);
    });
  }
  generateCalendarDays() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = new Date(firstDay);
    const dayOfWeek = firstDay.getDay() || 7; // Воскресенье = 7
    startDay.setDate(firstDay.getDate() - (dayOfWeek - 1));
    const endDay = new Date(lastDay);
    const lastDayOfWeek = lastDay.getDay() || 7;
    endDay.setDate(lastDay.getDate() + (7 - lastDayOfWeek));
    const days = [];
    const currentDate = new Date(startDay);
    while (currentDate <= endDay) {
      const date = new Date(currentDate);
      const dayInfo = {
        date: date,
        number: date.getDate(),
        isCurrentMonth: date.getMonth() === month,
        isToday: this.isToday(date),
        bookings: this.getBookingsForDate(date)
      };

      days.push(dayInfo);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  }
  createDayElement(day) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    dayElement.setAttribute('data-date', day.date.toISOString().split('T')[0]);
    if (!day.isCurrentMonth) {
      dayElement.classList.add('inactive');
    }

    if (day.isToday) {
      dayElement.classList.add('today');
    }
    if (day.bookings.length > 0) {
      dayElement.classList.add('has-trip');
      if (day.bookings.some(b => b.tripType === 'flight')) {
          day.bookings.filter(b => b.tripType === 'flight').map(b => b.title);
      }
      day.bookings.forEach(booking => {
        dayElement.classList.add(`trip-${booking.tripType}`);
      });
      const tripTitles = day.bookings.map(b => `${b.title} (${this.getTripTypeLabel(b.tripType)})`).join('\n');
      dayElement.title = tripTitles;
    }
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day.number;
    dayElement.appendChild(dayNumber);
    if (day.bookings.length > 0) {
      const indicator = document.createElement('div');
      indicator.className = 'trip-indicator';
      const hasFlight = day.bookings.some(b => b.tripType === 'flight');
      const hasTour = day.bookings.some(b => b.tripType === 'tour');
      if (hasFlight && hasTour) {
        indicator.classList.add('mixed-indicator');
      } else if (hasFlight) {
        indicator.classList.add('flight-indicator');
      } else if (hasTour) {
        indicator.classList.add('tour-indicator');
      }
      dayElement.appendChild(indicator);
    }
    dayElement.addEventListener('click', () => this.handleDayClick(day, dayElement));
    return dayElement;
  }
  getBookingsForDate(date) {
    const dateString = date.toISOString().split('T')[0];

    const bookingsForDate = this.bookings.filter(booking => {
      if (!booking.startDate || !booking.endDate) {
        return false;
      }
      const isInRange = dateString >= booking.startDate && dateString <= booking.endDate;
      return isInRange;
    });
    return bookingsForDate;
  }
  handleDayClick(day, dayElement) {
    document.querySelectorAll('.calendar-day').forEach(el => {
      el.classList.remove('selected');
    });
    dayElement.classList.add('selected');
    if (day.bookings.length > 0) {
      this.showTripInfo(day.bookings[0]);
    } else {
      this.hideTripInfo();
    }
  }
  async showTripInfo(booking) {
    try {
      const data = await CalendarService.getTripDetails(booking.id);
      if (!data || !data.trip) {
        throw new Error('Нет данных о поездке');
      }
      this.displayTripDetails(data.trip);
      this.selectedBooking = data.trip;
    } catch (error) {
      console.error('Ошибка загрузки деталей поездки:', error);
      this.showNotification('Ошибка загрузки информации о поездке', 'error');
    }
  }
  displayTripDetails(trip) {
    const tripInfoCard = document.querySelector('.trip-info-card');
    if (!tripInfoCard) {
      console.error('Не найден элемент информации о поездке');
      return;
    }
    const tripDetails = tripInfoCard.querySelector('.trip-details');
    const noTripSelected = tripInfoCard.querySelector('.no-trip-selected');
    if (!tripDetails || !noTripSelected) {
      console.error('Не найдены элементы деталей поездки');
      return;
    }
    tripDetails.style.display = 'block';
    noTripSelected.style.display = 'none';
    const tripName = tripDetails.querySelector('.trip-name');
    const tripDates = tripDetails.querySelector('.trip-dates');
    const statusElement = tripDetails.querySelector('.status-completed');
    const detailsContainer = tripDetails.querySelector('.trip-additional-info');
    if (tripName) tripName.textContent = trip.title;
    if (tripDates) {
      tripDates.textContent = `${this.formatDisplayDate(trip.dates.start)} - ${this.formatDisplayDate(trip.dates.end)}`;
    }
    if (statusElement) {
      statusElement.textContent = trip.status;
      statusElement.className = `status-${this.getStatusClass(trip.status)}`;
    }
    if (detailsContainer) {
      detailsContainer.innerHTML = this.generateTripDetailsHTML(trip);
    }
    const detailsButton = tripDetails.querySelector('.details-button');
    if (detailsButton) {
      detailsButton.onclick = () => this.showTripModal(trip);
    }
  }
  generateTripDetailsHTML(trip) {
    let html = `
    <p class="trip-detail">
      <span class="detail-label">Статус:</span> 
      <span class="status-${this.getStatusClass(trip.status)}">${trip.status}</span>
    </p>
  `;
    if (trip.type === 'tour' && trip.location) {
      html += `
      <p class="trip-detail">
        <span class="detail-label">Направление:</span> 
        ${trip.location.country || ''}${trip.location.city ? ', ' + trip.location.city : ''}
      </p>
    `;
    }
    if (trip.type === 'flight') {
      if (trip.airline) {
        html += `<p class="trip-detail"><span class="detail-label">Авиакомпания:</span> ${trip.airline}</p>`;
      }
      if (trip.flightNumber) {
        html += `<p class="trip-detail"><span class="detail-label">Номер рейса:</span> ${trip.flightNumber}</p>`;
      }
      if (trip.location && trip.location.departureCity && trip.location.arrivalCity) {
        html += `<p class="trip-detail"><span class="detail-label">Маршрут:</span> ${trip.location.departureCity} → ${trip.location.arrivalCity}</p>`;
      }
      if (trip.times && trip.times.departure) {
        const departureTime = this.formatDateTime(trip.times.departure);
        html += `<p class="trip-detail"><span class="detail-label">Вылет:</span> ${departureTime}</p>`;
      }
      if (trip.times && trip.times.arrival) {
        const arrivalTime = this.formatDateTime(trip.times.arrival);
        html += `<p class="trip-detail"><span class="detail-label">Прилет:</span> ${arrivalTime}</p>`;
      }
      if (trip.travelers && trip.travelers.seats && trip.travelers.seats.length > 0) {
        const seats = Array.isArray(trip.travelers.seats)
          ? trip.travelers.seats.join(', ')
          : trip.travelers.seats;
        html += `<p class="trip-detail"><span class="detail-label">Места:</span> ${seats}</p>`;
      }
      if (trip.baggage) {
        const baggageInfo = trip.baggage.included
          ? `Включен (${trip.baggage.count || 1} место)`
          : 'Не включен';
        html += `<p class="trip-detail"><span class="detail-label">Багаж:</span> ${baggageInfo}</p>`;
      }
      if (trip.aircraft) {
        html += `<p class="trip-detail"><span class="detail-label">Самолет:</span> ${trip.aircraft}</p>`;
      }
    }
    if (trip.travelers && trip.travelers.count) {
      html += `<p class="trip-detail"><span class="detail-label">Путешественники:</span> ${trip.travelers.count} чел.</p>`;
    }
    if (trip.price && trip.price.total) {
      html += `<p class="trip-detail"><span class="detail-label">Стоимость:</span> ${trip.price.total} €</p>`;
    }
    return html;
  }
  hideTripInfo() {
    const tripInfoCard = document.querySelector('.trip-info-card');
    if (!tripInfoCard) return;

    const tripDetails = tripInfoCard.querySelector('.trip-details');
    const noTripSelected = tripInfoCard.querySelector('.no-trip-selected');

    if (tripDetails && noTripSelected) {
      tripDetails.style.display = 'none';
      noTripSelected.style.display = 'block';
    }

    this.selectedBooking = null;
  }
  getMonthYearString() {
    const months = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    return `${months[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
  }
  isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }
  getTripTypeLabel(tripType) {
    const labels = {
      'tour': 'Тур',
      'flight': 'Перелёт'
    };
    return labels[tripType] || 'Поездка';
  }
  getStatusClass(status) {
    const classes = {
      'Активно': 'active',
      'Завершено': 'completed',
      'Отменено': 'cancelled'
    };
    return classes[status] || 'active';
  }
  formatDisplayDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Ошибка форматирования даты:', dateString, error);
      return dateString;
    }
  }
  setupEventListeners() {
    const prevButton = document.querySelector('.nav-button:first-child');
    const nextButton = document.querySelector('.nav-button:last-child');
    if (prevButton) {
      prevButton.addEventListener('click', () => this.previousMonth());
    }
    if (nextButton) {
      nextButton.addEventListener('click', () => this.nextMonth());
    }

    this.addExportButton();
  }
  previousMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.renderCalendar();
  }
  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.renderCalendar();
  }
  addExportButton() {
    const calendarHeader = document.querySelector('.calendar-header');
    if (!calendarHeader) return;
    const existingButton = calendarHeader.querySelector('.export-button');
    if (existingButton) {
      existingButton.remove();
    }
    const exportButton = document.createElement('button');
    exportButton.className = 'export-button';
    exportButton.innerHTML = `
      <span class="material-symbols-outlined">download</span>
      Экспорт
    `;
    exportButton.addEventListener('click', () => this.exportCalendar());
    calendarHeader.appendChild(exportButton);
  }

  async exportCalendar() {
    try {
      const blob = await CalendarService.exportToICal();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'aerotour-calendar.ics';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      this.showNotification('Календарь успешно экспортирован', 'success');
    } catch (error) {
      console.error('Ошибка экспорта:', error);
      this.showNotification('Ошибка при экспорте календаря', 'error');
    }
  }
  formatDateTime(dateTimeString) {
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Ошибка форматирования даты и времени:', dateTimeString, error);
      return dateTimeString;
    }
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
  new CalendarPage();
});

export { CalendarPage };