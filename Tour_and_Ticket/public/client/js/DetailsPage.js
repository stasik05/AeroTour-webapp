import { DetailsService } from '/shared/js/DetailsService.js';
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
    this.init();
  }

  async init() {
    try {
      await this.loadUserData();
      await this.loadDetailsData();
      this.bindEvents();
      this.initImageGallery();
      this.setupEventListeners();
      setTimeout(() => this.checkFavoriteStatus(), 100);
    } catch (error) {
      console.error('Ошибка инициализации страницы:', error);
      this.showError('Ошибка загрузки данных');
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
        console.log('Пользователь не авторизован - избранное недоступно');
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
      starsHTML += '<span class="material-symbols-outlined filled-star">star</span>';
    }

    if (hasHalfStar) {
      starsHTML += '<span class="material-symbols-outlined half-star">star_half</span>';
    }

    for (let i = 0; i < emptyStars; i++) {
      starsHTML += '<span class="material-symbols-outlined empty-star">star</span>';
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
      // ВСЕГДА получаем актуальные данные из DOM
      const seatsContainer = modal.querySelector('#seats-container');
      const selectedSeats = seatsContainer ?
        Array.from(seatsContainer.querySelectorAll('.seat.selected'))
          .map(seat => seat.dataset.seat) : [];

      const currentTravelers = parseInt(travelersCount.textContent);

      console.log('Проверка перед бронированием:', {
        selectedSeats,
        selectedSeatsCount: selectedSeats.length,
        currentTravelers,
        currentBaggage,
        currentBaggageCount
      });

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
      console.log('Выбрали место:', seatElement.dataset.seat);
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
  async submitTourBooking(travelersCount, transportationType, departureCity)
  {
    try
    {
      const basePrice = this.getCurrentPrice();
      let totalPrice = basePrice * travelersCount;
      if (!this.currentData?.transportationIncluded && transportationType === 'company')
      {
        totalPrice += basePrice * travelersCount * 0.2;
      }
      const bookingData =
        {
        travelersCount: travelersCount,
        transportationType: transportationType,
        departureCity: transportationType === 'company' ? departureCity : null,
        totalPrice: totalPrice,
        tourId: this.tourId
      };
      const result = await DetailsService.createBooking(bookingData);
      if (result.success)
      {
        this.showNotification('Тур успешно забронирован!', 'success');
        setTimeout(() => {
          window.location.href = '/client/profile';
        }, 2000);
      }
    } catch (error)
    {
      console.error('Ошибка бронирования тура:', error);
      this.showNotification('Ошибка при бронировании тура', 'error');
    }
  }
  async submitFlightBooking(travelersCount, selectedSeats, hasBaggage, baggageCount)
  {
    try {
      const basePrice = this.getCurrentPrice();
      let totalPrice = basePrice * travelersCount;
      if (hasBaggage)
      {
        const baggagePrice = this.currentData?.baggagePrice || 50;
        totalPrice += baggagePrice * baggageCount;
      }
      const bookingData =
        {
        travelersCount: travelersCount,
        selectedSeats: selectedSeats,
        hasBaggage: hasBaggage,
        baggageCount: baggageCount,
        totalPrice: totalPrice,
        flightId: this.flightId
      };
      const result = await DetailsService.createBooking(bookingData);
      if (result.success)
      {
        this.showNotification('Авиабилет успешно забронирован!', 'success');
        setTimeout(() =>
        {
          window.location.href = '/client/profile';
        }, 2000);
      }
    } catch (error)
    {
      console.error('Ошибка бронирования авиабилета:', error);
      this.showNotification('Ошибка при бронировании авиабилета', 'error');
    }
  }
  getCurrentPrice() {
    const priceElement = document.querySelector('.price-amount');
    if (priceElement) {
      const priceText = priceElement.textContent;
      let normalizedPrice = priceText.replace(/[^\d,.]/g, '');
      if (normalizedPrice.includes(',') && normalizedPrice.includes('.')) {
        normalizedPrice = normalizedPrice.replace(/,/g, '');
      } else {
        // Иначе заменяем запятую на точку
        normalizedPrice = normalizedPrice.replace(',', '.');
      }

      return parseFloat(normalizedPrice) || 0;
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