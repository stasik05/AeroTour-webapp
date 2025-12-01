import { ProfileService } from '/shared/js/ProfileService.js';

class PersonalAccount {
  constructor() {
    this.currentUser = null;
    this.bookings = [];
    this.init();
  }

  async init() {
    if (!this.checkAuth()) {
      return;
    }
    await this.loadUserData();
    await this.loadBookings();
    await this.loadPersonalOffers();
    this.setupEventListeners();
    this.setupPhotoUpload();
    this.setupValidation();
    this.createPasswordToggles();
    this.setupTabs();
  }

  checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return false;
    }
    return true;
  }

  async loadUserData() {
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

  setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.dataset.tab;
        this.switchTab(tabId);
      });
    });
  }

  switchTab(tabId) {
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabId}-tab`).classList.add('active');

    this.currentTab = tabId;
  }

  async loadPersonalOffers() {
    try {
      const offersData = await ProfileService.getPersonalOffers();

      if (offersData.success) {
        this.offers = offersData.offers;
        this.updateOffersUI(offersData.offers);
      }
    } catch (error) {
      console.error('Ошибка загрузки персонализированных предложений:', error);
      this.showNotification('Ошибка загрузки персональных предложений', 'error');
    }
  }

  updateOffersUI(offers) {
    const offersGrid = document.getElementById('offers-grid');

    if (!offers || offers.length === 0) {
      offersGrid.innerHTML = `
      <div class="no-offers">
        <span class="material-symbols-outlined">local_offer</span>
        <h3>Пока нет персональных предложений</h3>
        <p>Мы уведомим вас, когда появятся специальные предложения для вас</p>
      </div>
    `;
      return;
    }
    const globalOffers = offers.filter(offer =>
      offer.isGlobalDiscount ||
      offer.discountScope === 'all_tours' ||
      offer.discountScope === 'all_flights'
    );
    const regularOffers = offers.filter(offer =>
      !offer.isGlobalDiscount &&
      offer.discountScope !== 'all_tours' &&
      offer.discountScope !== 'all_flights'
    );

    let html = '';
    if (globalOffers.length > 0) {
      html += this.createGlobalOffersCard(globalOffers);
    }
    if (regularOffers.length > 0) {
      html += regularOffers.map(offer =>
        this.createOfferElement(offer)
      ).join('');
    }
    offersGrid.innerHTML = html;
  }
  createGlobalOffersCard(globalOffers) {
    const maxDiscount = Math.max(...globalOffers.map(offer => offer.discountPercent));
    const hasTourDiscount = globalOffers.some(offer =>
      offer.itemType === 'tour' || offer.discountScope === 'all_tours'
    );
    const hasFlightDiscount = globalOffers.some(offer =>
      offer.itemType === 'flight' || offer.discountScope === 'all_flights'
    );

    let title = 'Ваши персональные скидки';
    let description = 'Специальные предложения применяются автоматически';

    if (hasTourDiscount && !hasFlightDiscount) {
      title = 'Персональная скидка на все туры';
      description = `Ваша эксклюзивная скидка ${maxDiscount}% действует на все туры`;
    } else if (!hasTourDiscount && hasFlightDiscount) {
      title = 'Персональная скидка на все авиабилеты';
      description = `Ваша эксклюзивная скидка ${maxDiscount}% действует на все авиарейсы`;
    } else {
      title = 'Персональные скидки на все туры и авиабилеты';
      description = `Ваши эксклюзивные скидки до ${maxDiscount}% применяются автоматически`;
    }

    const validUntil = globalOffers[0].validUntil ? `
    <div class="valid-until">
      <span class="material-symbols-outlined">schedule</span>
      Действует до: ${new Date(globalOffers[0].validUntil).toLocaleDateString('ru-RU')}
    </div>
  ` : '';

    return `
    <div class="offer-card personal global-discount-card">
      <div class="offer-badge personal">Персональные скидки</div>
      
      <div class="offer-header">
        <div class="global-discount-icon">
          <span class="material-symbols-outlined">auto_awesome</span>
        </div>
        <h3 class="offer-title">${title}</h3>
        <p class="offer-description">${description}</p>
      </div>
      
      <div class="offer-details">
        ${hasTourDiscount ? `
          <div class="offer-detail">
            <span class="material-symbols-outlined">beach_access</span>
            <span>
              <strong>Все туры:</strong> 
              ${globalOffers.find(o => o.itemType === 'tour' || o.discountScope === 'all_tours')?.discountPercent || maxDiscount}% скидка
            </span>
          </div>
        ` : ''}
        
        ${hasFlightDiscount ? `
          <div class="offer-detail">
            <span class="material-symbols-outlined">flight</span>
            <span>
              <strong>Все авиабилеты:</strong> 
              ${globalOffers.find(o => o.itemType === 'flight' || o.discountScope === 'all_flights')?.discountPercent || maxDiscount}% скидка
            </span>
          </div>
        ` : ''}
        
        <div class="offer-detail">
          <span class="material-symbols-outlined">bolt</span>
          <span>Скидки применяются автоматически при бронировании</span>
        </div>
      </div>
     
      
      ${validUntil}
      
      <div class="offer-actions">
        ${hasTourDiscount ? `
          <a href="/client/search" class="btn-primary">
            <span class="material-symbols-outlined">beach_access</span>
            Смотреть туры
          </a>
        ` : ''}
        ${hasFlightDiscount ? `
          <a href="/client/search" class="btn-primary">
            <span class="material-symbols-outlined">flight</span>
            Смотреть рейсы
          </a>
        ` : ''}
      </div>
    </div>
  `;
  }

  createOfferElement(offer) {
    const isPersonal = offer.type === 'personal';
    const badgeType = isPersonal ? 'personal' : 'general';
    const badgeText = isPersonal ? 'Персональное' : 'Спецпредложение';

    const validUntil = offer.validUntil ? `
    <div class="valid-until">
      <span class="material-symbols-outlined">schedule</span>
      Действует до: ${new Date(offer.validUntil).toLocaleDateString('ru-RU')}
    </div>
  ` : '';

    return `
    <div class="offer-card ${badgeType}">
      <div class="offer-badge ${badgeType}">${badgeText}</div>
      
      <div class="offer-header">
        <h3 class="offer-title">${offer.title}</h3>
        <p class="offer-description">${offer.description}</p>
      </div>
      
      <div class="offer-details">
        <div class="offer-detail">
          <span class="material-symbols-outlined">location_on</span>
          <span>${offer.destination}</span>
        </div>
        <div class="offer-detail">
          <span class="material-symbols-outlined">calendar_month</span>
          <span>${offer.dates}</span>
        </div>
        ${offer.airline ? `
          <div class="offer-detail">
            <span class="material-symbols-outlined">flight</span>
            <span>${offer.airline}</span>
          </div>
        ` : ''}
      </div>
      
      <div class="offer-price">
        ${offer.originalPrice ? `
          <span class="original-price">${this.formatPrice(offer.originalPrice)}</span>
        ` : ''}
        <span class="final-price">${offer.finalPrice ? this.formatPrice(offer.finalPrice) : 'Бесплатно'}</span>
        <span class="discount-percent">-${offer.discountPercent}%</span>
      </div>
      
      ${validUntil}
      
      <div class="offer-actions">
        <a href="${offer.detailsLink}" class="btn-primary">
          <span class="material-symbols-outlined">visibility</span>
          Подробнее
        </a>
      </div>
    </div>
  `;
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
    const updateField = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.value = value || '';
    };
    updateField('first-name', user.name);
    updateField('last-name', user.lastName);
    updateField('email', user.email);
    updateField('phone', user.phone);

    if (user.photo) {
      this.updateAvatar(user.photo);
    }

    const profileName = document.querySelector('.profile-name');
    const profileEmail = document.querySelector('.profile-email');

    if (profileName) profileName.textContent = `${user.name} ${user.lastName}`;
    if (profileEmail) profileEmail.textContent = user.email;
  }
  updateAvatar(photoUrl) {
    const avatars = document.querySelectorAll('.profile-avatar, .user-avatar');
    avatars.forEach(avatar => {
      avatar.src = photoUrl;
    });
  }
  updateBookingsUI(bookings) {
    const bookingsContainer = document.querySelector('.bookings-list');
    if (!bookings || bookings.length === 0) {
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
  setupEventListeners() {
    const profileForm = document.querySelector('.profile-form');
    const passwordForm = document.querySelector('.password-form');

    if (profileForm) {
      profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.updateProfile();
      });
    }
    if (passwordForm) {
      passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.changePassword();
      });
    }
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
    if (!avatar) return;
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
  setupValidation() {
    this.addStyles();
    this.setupProfileValidation();
    this.setupPasswordValidation();
  }
  setupProfileValidation() {
    const inputs = [
      { id: 'first-name', validator: (input) => this.validateName(input, 'имя') },
      { id: 'last-name', validator: (input) => this.validateName(input, 'фамилия') },
      { id: 'email', validator: (input) => this.validateEmail(input) },
      { id: 'phone', validator: (input) => this.validatePhone(input) }
    ];
    inputs.forEach(({ id, validator }) => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('blur', () => validator(input));
        input.addEventListener('input', () => this.clearFieldMessage(input));
      }
    });
  }
  setupPasswordValidation() {
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    if (currentPasswordInput) {
      currentPasswordInput.addEventListener('blur', () => this.validateCurrentPassword(currentPasswordInput));
      currentPasswordInput.addEventListener('input', () => this.clearFieldMessage(currentPasswordInput));
    }
    if (newPasswordInput) {
      newPasswordInput.addEventListener('blur', () => this.validateNewPassword(newPasswordInput));
      newPasswordInput.addEventListener('input', () => this.clearFieldMessage(newPasswordInput));
    }
  }
  createPasswordToggles() {
    this.createPasswordToggle('current-password');
    this.createPasswordToggle('new-password');
  }
  createPasswordToggle(inputId) {
    const passwordInput = document.getElementById(inputId);
    if (!passwordInput) return;

    const container = passwordInput.parentNode;
    container.classList.add('password-input-container');
    passwordInput.classList.add('password-field');
    const existingToggle = container.querySelector('.password-toggle');
    if (existingToggle) {
      existingToggle.remove();
    }
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'password-toggle';
    toggle.setAttribute('aria-label', 'Показать/скрыть пароль');
    toggle.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
      </svg>
    `;

    toggle.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';

      toggle.innerHTML = isPassword ? `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m9.02 9.02l3.29 3.29m-3.29-3.29l-3.29-3.29"/>
        </svg>
      ` : `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
        </svg>
      `;
    });

    container.appendChild(toggle);
  }
  addStyles() {
    if (document.querySelector('#personal-account-styles')) {
      return;
    }
    const styles = `
      <style id="personal-account-styles">
        .form-group {
          position: relative;
          margin-bottom: 1.5rem !important;
          min-height: 75px;
        }
        
        .password-input-container {
          position: relative;
          margin-bottom: 1.5rem !important;
        }
        
        .password-toggle {
          position: absolute;
          right: 12px;
          top: 70%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }
        
        .password-toggle:hover {
          color: #374151;
        }
        
        .password-toggle svg {
          width: 18px;
          height: 18px;
        }
        
        .form-input.password-field {
          padding-right: 40px;
        }
        
        .form-input.error {
          border-color: #e74c3c !important;
        }
        
        .form-input.success {
          border-color: #10b981 !important;
        }
        
        .field-message {
          position: absolute;
          bottom: -18px;
          left: 0;
          font-size: 12px;
          line-height: 1.2;
          opacity: 0;
          transform: translateY(-3px);
          transition: all 0.2s ease;
        }
        
        .field-message.error {
          color: #e74c3c;
        }
        
        .field-message.success {
          color: #10b981;
        }
        
        .field-message.show {
          opacity: 1;
          transform: translateY(0);
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
  }
  validateName(input, fieldName = 'имя') {
    const value = input.value.trim();
    this.clearFieldMessage(input);

    if (!value) {
      return true;
    }

    const russianNameRegex = /^[А-ЯЁа-яё]+$/;
    if (!russianNameRegex.test(value)) {
      this.showFieldMessage(input, 'error', `✕ ${fieldName} должно содержать только русские буквы`);
      return false;
    }

    if (value.split(' ').length > 1) {
      this.showFieldMessage(input, 'error', `✕ ${fieldName} должно быть одним словом`);
      return false;
    }

    this.showFieldMessage(input, 'success', `✓ ${fieldName} корректно`);
    return true;
  }

  validateEmail(input) {
    const value = input.value.trim();
    this.clearFieldMessage(input);

    if (!value) {
      return true;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value)) {
      this.showFieldMessage(input, 'error', '✕ Введите корректный email адрес');
      return false;
    }

    this.showFieldMessage(input, 'success', '✓ Email корректный');
    return true;
  }

  validatePhone(input) {
    const value = input.value.trim();
    this.clearFieldMessage(input);

    if (!value) {
      return true;
    }

    const phoneRegex = /^\+375(25|29|33|44|17)\d{7}$/;
    if (!phoneRegex.test(value)) {
      this.showFieldMessage(input, 'error', '✕ Формат телефона: +375XXXXXXXXX (Беларусь)');
      return false;
    }

    this.showFieldMessage(input, 'success', '✓ Телефон корректный');
    return true;
  }

  validateCurrentPassword(input) {
    const value = input.value;
    this.clearFieldMessage(input);

    if (!value) {
      return true;
    }

    if (value.length < 8) {
      this.showFieldMessage(input, 'error', '✕ Пароль должен содержать не менее 8 символов');
      return false;
    }

    this.showFieldMessage(input, 'success', '✓ Пароль введен');
    return true;
  }

  validateNewPassword(input) {
    const value = input.value;
    this.clearFieldMessage(input);

    if (!value) {
      return true;
    }

    if (value.length < 8) {
      this.showFieldMessage(input, 'error', '✕ Пароль должен содержать не менее 8 символов');
      return false;
    }

    const hasLetter = /[a-zA-Zа-яА-Я]/.test(value);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?0-9]/.test(value);

    if (!hasLetter || !hasSpecialChar) {
      this.showFieldMessage(input, 'error', '✕ Пароль должен содержать буквы и специальные символы/цифры');
      return false;
    }

    this.showFieldMessage(input, 'success', '✓ Пароль надежный');
    return true;
  }

  showFieldMessage(input, type, message) {
    this.clearFieldMessage(input);

    input.classList.remove('error', 'success');
    if (type === 'error') {
      input.classList.add('error');
    } else if (type === 'success') {
      input.classList.add('success');
    }

    const formGroup = input.closest('.form-group');
    let messageElement = formGroup?.querySelector('.field-message');

    if (!messageElement) {
      messageElement = document.createElement('div');
      messageElement.className = 'field-message';
      formGroup.appendChild(messageElement);
    }

    messageElement.className = `field-message ${type}`;
    messageElement.textContent = message;

    setTimeout(() => {
      messageElement.classList.add('show');
    }, 10);
  }

  clearFieldMessage(input) {
    input.classList.remove('error', 'success');
    const formGroup = input.closest('.form-group');
    const messageElement = formGroup?.querySelector('.field-message');
    if (messageElement) {
      messageElement.remove();
    }
  }

  async updateProfile() {
    const firstNameInput = document.getElementById('first-name');
    const lastNameInput = document.getElementById('last-name');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');

    let isValid = true;

    if (!firstNameInput.value.trim()) {
      this.showFieldMessage(firstNameInput, 'error', 'Имя обязательно для заполнения');
      isValid = false;
    } else if (!this.validateName(firstNameInput, 'имя')) {
      isValid = false;
    }

    if (!lastNameInput.value.trim()) {
      this.showFieldMessage(lastNameInput, 'error', 'Фамилия обязательна для заполнения');
      isValid = false;
    } else if (!this.validateName(lastNameInput, 'фамилия')) {
      isValid = false;
    }

    if (!emailInput.value.trim()) {
      this.showFieldMessage(emailInput, 'error', 'Email обязателен для заполнения');
      isValid = false;
    } else if (!this.validateEmail(emailInput)) {
      isValid = false;
    }

    if (phoneInput && phoneInput.value.trim() && !this.validatePhone(phoneInput)) {
      isValid = false;
    }

    if (!isValid) {
      this.showNotification('Пожалуйста, исправьте ошибки в форме', 'error');
      return;
    }

    const formData = {
      name: firstNameInput.value.trim(),
      lastName: lastNameInput.value.trim(),
      phone: phoneInput ? phoneInput.value.trim() : ''
    };

    try {
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
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');

    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;

    let isValid = true;

    if (!currentPassword) {
      this.showFieldMessage(currentPasswordInput, 'error', 'Текущий пароль обязателен для заполнения');
      isValid = false;
    } else if (!this.validateCurrentPassword(currentPasswordInput)) {
      isValid = false;
    }

    if (!newPassword) {
      this.showFieldMessage(newPasswordInput, 'error', 'Новый пароль обязателен для заполнения');
      isValid = false;
    } else if (!this.validateNewPassword(newPasswordInput)) {
      isValid = false;
    }

    if (!isValid) {
      this.showNotification('Пожалуйста, исправьте ошибки в форме пароля', 'error');
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
        this.clearFieldMessage(currentPasswordInput);
        this.clearFieldMessage(newPasswordInput);
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
    if (file.size > 5 * 1024 * 1024) {
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
                 onclick="window.personalAccount.switchGalleryImage(this, '${image}')">
          `).join('')}
        </div>
      </div>
    `;
  }

  switchGalleryImage(thumbnail, imageUrl) {
    const mainImage = document.getElementById('main-gallery-image');
    if (mainImage) {
      mainImage.src = imageUrl;
    }
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
               <span class="history-date">${record.changed_at}</span>
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
      currency: 'EUR',
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
  static formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
}
window.personalAccount = null;
document.addEventListener('DOMContentLoaded', () => {
  window.personalAccount = new PersonalAccount();
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