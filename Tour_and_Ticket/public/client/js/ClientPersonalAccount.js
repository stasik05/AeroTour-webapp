import { ProfileService } from '/shared/js/ProfileService.js';
class PersonalAccount
{
  constructor() {
    this.currentUser = null;
    this.bookings = [];
    this.init();
  }
  async init()
  {
    if (!this.checkAuth())
    {
      return;
    }
    await this.loadUserData();
    await this.loadBookings();
    this.setupEventListeners();
    this.setupPhotoUpload();
  }
  checkAuth()
  {
    const token = localStorage.getItem('token');
    if (!token)
    {
      window.location.href = '/login';
      return false;
    }
    return true;
  }
  async loadUserData()
  {
    try {
      const profileData = await ProfileService.getProfile();
      if (profileData.success) {
        this.currentUser = profileData.user;
        this.updateProfileUI(profileData.user);
      }
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
      this.showNotification('Ошибка загрузки данных профиля', 'error');
    }
  }
  async loadBookings() {
    try {
      const bookingsData = await ProfileService.getBookings();

      if (bookingsData.success) {
        this.bookings = bookingsData.bookings;
        this.updateBookingsUI(bookingsData.bookings);
      }
    } catch (error) {
      console.error('Ошибка загрузки бронирований:', error);
      this.showNotification('Ошибка загрузки истории бронирований', 'error');
    }
  }
  updateProfileUI(user) {
    document.getElementById('first-name').value = user.name || '';
    document.getElementById('last-name').value = user.lastName || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('phone').value = user.phone || '';
    if (user.photo) {
      this.updateAvatar(user.photo);
    }
    document.querySelector('.profile-name').textContent = `${user.name} ${user.lastName}`;
    document.querySelector('.profile-email').textContent = user.email;
  }
  updateAvatar(photoUrl) {
    const avatars = document.querySelectorAll('.profile-avatar, .user-avatar');
    avatars.forEach(avatar => {
      avatar.src = photoUrl;
    });
  }
  updateBookingsUI(bookings) {
    const bookingsContainer = document.querySelector('.bookings-list');
    if (!bookings || bookings.length === 0)
    {
      bookingsContainer.innerHTML = `
                    <div class="no-bookings">
                        <p>У вас пока нет бронирований</p>
                        <a href="/client/search" class="btn-primary">Найти туры и билеты</a>
                    </div>
                `;
      return;
    }
    bookingsContainer.innerHTML = bookings.map(booking =>
      this.createBookingElement(booking)
    ).join('');
  }
  createBookingElement(booking) {
    const statusClass = this.getStatusClass(booking.status);
    const statusText = this.getStatusText(booking.status);
    const hasMultipleImages = booking.images && booking.images.length > 1;
    return `
                <div class="booking-item" data-booking-id="${booking.id}">
                    <div class="booking-content">
                        <div class="booking-image-container">
                            <img alt="${booking.title}" class="booking-image" src="${booking.mainImage}"/>
                            ${hasMultipleImages ? `
                                <div class="image-counter">+${booking.images.length - 1}</div>
                            ` : ''}
                        </div>
                        <div class="booking-details">
                            <h4 class="booking-title">${booking.title}</h4>
                            <p class="booking-description">${booking.description}</p>
                            <p class="booking-date">${booking.date}</p>
                            <p class="booking-status ${statusClass}">
                                Статус: ${statusText}
                            </p>
                        </div>
                    </div>
                    <div class="booking-actions">
                        <p class="booking-price">${booking.price}</p>
                        <div class="booking-buttons">
                            <button class="booking-details-btn" data-booking-id="${booking.id}">
                                Подробнее
                            </button>
                            ${booking.status === 'Активно' ? `
                                <button class="booking-cancel-btn" data-booking-id="${booking.id}">
                                    Отменить
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
  }
  getStatusClass(status) {
    const statusMap = {
      'Активно': 'confirmed',
      'Отменено': 'cancelled',
      'Завершено': 'completed'
    };
    return statusMap[status] || 'pending';
  }
  getStatusText(status) {
    const statusMap = {
      'Активно': 'Подтверждено',
      'Отменено': 'Отменено',
      'Завершено': 'Завершено'
    };
    return statusMap[status] || status;
  }
  setupEventListeners()
  {
    document.querySelector('.profile-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.updateProfile();
    });
    document.querySelector('.password-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.changePassword();
    });
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('booking-details-btn')) {
        const bookingId = e.target.dataset.bookingId;
        this.showBookingDetails(bookingId);
      }
      if (e.target.classList.contains('booking-cancel-btn')) {
        const bookingId = e.target.dataset.bookingId;
        this.cancelBooking(bookingId);
      }
    });
  }
  setupPhotoUpload() {
    const avatar = document.querySelector('.profile-avatar');
    const photoInput = document.createElement('input');
    photoInput.type = 'file';
    photoInput.id = 'photo-input';
    photoInput.accept = 'image/*';
    photoInput.style.display = 'none';
    document.body.appendChild(photoInput);
    avatar.style.cursor = 'pointer';
    avatar.addEventListener('click', () => {
      photoInput.click();
    });
    photoInput.addEventListener('change', (e) => {
      if (e.target.files[0]) {
        this.uploadPhoto(e.target.files[0]);
      }
    });
  }
  async updateProfile()
  {
    const formData = {
      name: document.getElementById('first-name').value,
      lastName: document.getElementById('last-name').value,
      phone: document.getElementById('phone').value
    };
    if (!formData.name || !formData.lastName) {
      this.showNotification('Имя и фамилия обязательны для заполнения', 'error');
      return;
    }
    try
    {
      const result = await ProfileService.updateProfile(formData);
      if (result.success) {
        this.showNotification('Профиль успешно обновлен', 'success');
        this.updateProfileUI(result.user);
      }
    } catch (error) {
      this.showNotification(error.error || 'Ошибка обновления профиля', 'error');
    }
  }
  async changePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    if (!currentPassword || !newPassword) {
      this.showNotification('Заполните все поля пароля', 'error');
      return;
    }
    if (newPassword.length < 8) {
      this.showNotification('Новый пароль должен содержать не менее 8 символов', 'error');
      return;
    }
    try {
      const result = await ProfileService.changePassword({
        currentPassword,
        newPassword
      });
      if (result.success) {
        this.showNotification('Пароль успешно изменен', 'success');
        document.querySelector('.password-form').reset();
      }
    } catch (error) {
      this.showNotification(error.error || 'Ошибка смены пароля', 'error');
    }
  }
  async uploadPhoto(file) {
    if (!file.type.startsWith('image/')) {
      this.showNotification('Выберите файл изображения', 'error');
      return;
    }
    if (file.size > 5 * 980 * 1024) {
      this.showNotification('Размер файла не должен превышать 5MB', 'error');
      return;
    }
    try {
      const result = await ProfileService.uploadPhoto(file);
      if (result.success) {
        this.showNotification('Фото успешно загружено', 'success');
        this.updateAvatar(result.photoUrl);
      }
    } catch (error) {
      this.showNotification(error.error || 'Ошибка загрузки фото', 'error');
    }
  }
  async showBookingDetails(bookingId) {
    try {
      const result = await ProfileService.getBookingDetails(bookingId);
      if (result.success) {
        this.displayBookingModal(result.booking);
      }
    } catch (error) {
      this.showNotification('Ошибка загрузки деталей бронирования', 'error');
    }
  }
  async cancelBooking(bookingId) {
    if (!confirm('Вы уверены, что хотите отменить это бронирование?')) {
      return;
    }
    try {
      const result = await ProfileService.cancelBooking(bookingId);
      if (result.success) {
        this.showNotification('Бронирование успешно отменено', 'success');
        await this.loadBookings();
      }
    } catch (error) {
      this.showNotification(error.error || 'Ошибка отмены бронирования', 'error');
    }
  }
  displayBookingModal(booking) {
    const modal = this.createBookingModal(booking);
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
  createBookingModal(booking) {
    const modal = document.createElement('div');
    modal.className = 'booking-modal';
    modal.innerHTML = this.getModalContent(booking);
    return modal;
  }
  getModalContent(booking) {
    const images = booking.type === 'tour' ? booking.tour.images : booking.flight.images;
    const imageGallery = this.createImageGallery(images);
    const detailsContent = this.getDetailsContent(booking);

    return `
      <div class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Детали бронирования #${booking.id}</h3>
            <button class="modal-close">&times;</button>
          </div>
          
          <div class="modal-body">
            <div class="booking-info">
              <p><strong>Тип:</strong> ${booking.type === 'tour' ? 'Тур' : 'Авиабилет'}</p>
              <p><strong>Статус:</strong> ${this.getStatusText(booking.status)}</p>
              <p><strong>Дата бронирования:</strong> ${booking.bookingDate}</p>
            </div>
            
            ${detailsContent}
            
            <div class="image-section">
              <h4>Галерея изображений</h4>
              ${imageGallery}
            </div>
            
            ${this.getHistoryContent(booking.history)}
          </div>
        </div>
      </div>
    `;
  }
  getDetailsContent(booking) {
    if (booking.type === 'tour') {
      return `
        <div class="details-section">
          <h4>Информация о туре:</h4>
          <p><strong>Название:</strong> ${booking.tour.title}</p>
          <p><strong>Описание:</strong> ${booking.tour.description}</p>
          <p><strong>Страна:</strong> ${booking.tour.country}</p>
          <p><strong>Город:</strong> ${booking.tour.city}</p>
          <p><strong>Дата начала:</strong> ${booking.tour.startDate}</p>
          <p><strong>Дата окончания:</strong> ${booking.tour.endDate}</p>
          <p><strong>Количество путешественников:</strong> ${booking.travelersCount}</p>
          <p><strong>Цена:</strong> ${this.formatPrice(booking.tour.price)}</p>
        </div>
      `;
    } else {
      const seatDetails = booking.flight.detailedSeats ?
        booking.flight.detailedSeats.map(seat =>
          `<div class="seat-detail">
            <span class="seat-badge">${seat.full}</span>
            <span class="seat-description">${seat.display}</span>
          </div>`
        ).join('') :
        `<p>Информация о местах недоступна</p>`;

      return `
        <div class="details-section">
          <h4>Информация о рейсе:</h4>
          <p><strong>Авиакомпания:</strong> ${booking.flight.airline}</p>
          <p><strong>Рейс:</strong> ${booking.flight.flightNumber}</p>
          <p><strong>Маршрут:</strong> ${booking.flight.departureCity} → ${booking.flight.arrivalCity}</p>
          <p><strong>Вылет:</strong> ${booking.flight.departureTime}</p>
          <p><strong>Прилет:</strong> ${booking.flight.arrivalTime}</p>
          <p><strong>Количество пассажиров:</strong> ${booking.passengersInfo}</p>
          
          <div class="seats-section">
            <h5>Забронированные места:</h5>
            <div class="seats-container">
              ${seatDetails}
            </div>
          </div>
          
          <p><strong>Багаж:</strong> ${booking.flight.baggageInfo}</p>
          <p><strong>Цена:</strong> ${this.formatPrice(booking.flight.price)}</p>
        </div>
      `;
    }
  }
  createImageGallery(images) {
    if (!images || images.length === 0) {
      return '<p class="no-images">Изображения отсутствуют</p>';
    }
    if (images.length === 1) {
      return `
                    <div class="single-image">
                        <img src="${images[0]}" alt="Изображение" class="main-image">
                    </div>
                `;
    }

    return `
                <div class="image-gallery">
                    <div class="main-image-container">
                        <img id="main-gallery-image" src="${images[0]}" alt="Основное изображение" class="main-image">
                    </div>
                    <div class="thumbnail-container">
                        ${images.map((image, index) => `
                            <img src="${image}" 
                                 alt="Миниатюра ${index + 1}" 
                                 class="thumbnail ${index === 0 ? 'active' : ''}"
                                 onclick="personalAccount.switchGalleryImage(this, '${image}')">
                        `).join('')}
                    </div>
                </div>
            `;
  }

  switchGalleryImage(thumbnail, imageUrl) {
    document.getElementById('main-gallery-image').src = imageUrl;
    document.querySelectorAll('.thumbnail').forEach(thumb => {
      thumb.classList.remove('active');
    });
    thumbnail.classList.add('active');
  }

  getHistoryContent(history) {
    if (!history || history.length === 0) return '';
    return `
                <div class="history-section">
                    <h4>История статусов</h4>
                    <div class="history-list">
                        ${history.map(record => `
                            <div class="history-item">
                                <span class="history-date">${new Date(record.changed_at).toLocaleString('ru-RU')}</span>
                                <span class="history-status ${this.getStatusClass(record.status)}">
                                    ${this.getStatusText(record.status)}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
  }

  formatPrice(price) {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(price);
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
let personalAccount;
document.addEventListener('DOMContentLoaded', () => {
  personalAccount = new PersonalAccount();
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-close') ||
      e.target.classList.contains('modal-close-btn')) {
      const modal = e.target.closest('.booking-modal');
      if (modal) {
        modal.remove();
      }
    }
  });
});
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    const avatar = document.querySelector('.profile-avatar');

    if (avatar) {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);
      avatar.style.cursor = 'pointer';
      avatar.title = 'Нажмите чтобы изменить фото';
      avatar.addEventListener('click', function() {
        fileInput.click();
      });
      fileInput.addEventListener('change', function(e) {
        if (e.target.files[0]) {
          const file = e.target.files[0];
          console.log('Выбран файл:', file.name);
          if (!file.type.startsWith('image/')) {
            alert('Пожалуйста, выберите файл изображения');
            return;
          }
          if (file.size > 5 * 1024 * 1024) {
            alert('Файл слишком большой. Максимальный размер: 5MB');
            return;
          }
          const reader = new FileReader();
          reader.onload = function(e) {
            avatar.src = e.target.result;
          };
          reader.readAsDataURL(file);
          if (window.personalAccount) {
            window.personalAccount.uploadPhoto(file);
          } else if (ProfileService) {
            ProfileService.uploadPhoto(file)
              .then(result => {
                if (result.success) {
                  console.log('Фото сохранено в БД');
                  document.querySelectorAll('.profile-avatar, .user-avatar').forEach(av => {
                    av.src = result.photoUrl;
                  });
                }
              })
              .catch(error => {
                console.error('Ошибка сохранения фото:', error);
                alert('Ошибка при сохранении фото');
              });
          }
        }
      });
    }
  }, 1000);
});
window.personalAccount = personalAccount;
