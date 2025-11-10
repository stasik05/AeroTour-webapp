class DetailsService {
  static async makeAuthorizedRequest(url, options = {}) {
    const token = localStorage.getItem("token");
    if (!token) {
      throw { error: 'Токен не найден' };
    }

    const config = {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...options.headers
      },
      ...options
    };

    console.log('📡 Отправка запроса:', url);
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Ошибка API:', errorText);
      throw { status: response.status, message: errorText };
    }

    const result = await response.json();
    return result;
  }

  static async getTourDetails(tourId) {
    try {
      const url = `/api/details/tour/${tourId}`;
      return await this.makeAuthorizedRequest(url);
    } catch (error) {
      console.error('❌ Ошибка при получении деталей тура:', error);
      throw error;
    }
  }

  static async getFlightDetails(flightId) {
    try {
      const url = `/api/details/flight/${flightId}`;
      return await this.makeAuthorizedRequest(url);
    } catch (error) {
      console.error('❌ Ошибка при получении деталей рейса:', error);
      throw error;
    }
  }

  static async addToFavorites(tourId = null, flightId = null) {
    try {
      if (!tourId && !flightId) {
        throw { error: 'Не указан тур или авиабилет' };
      }
      const token = localStorage.getItem("token");
      const response = await this.makeAuthorizedRequest('/api/details/favorites/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tourId, flightId })
      });

      return response;
    } catch (error) {
      console.error('❌ Ошибка при добавлении в избранное:', error);
      if (error.status === 400 || error.message?.includes('Уже добавлено')) {
        throw { ...error, isAlreadyFavorite: true };
      }
      throw error;
    }
  }

  static async removeFromFavorites(tourId = null, flightId = null) {
    try {
      if (!tourId && !flightId) {
        throw { error: 'Не указан тур или авиабилет' };
      }

      const response = await this.makeAuthorizedRequest('/api/details/favorites/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tourId, flightId })
      });

      return response;
    } catch (error) {
      console.error('❌ Ошибка при удалении из избранного:', error);
      throw error;
    }
  }

  static async getFavorites() {
    try {
      return await this.makeAuthorizedRequest('/api/details/favorites');
    } catch (error) {
      console.error('❌ Ошибка при получении избранного:', error);
      throw error;
    }
  }

  static async checkIfFavorite(tourId = null, flightId = null) {
    try {
      console.log('🔍 Проверка избранного для:', { tourId, flightId });
      const favorites = await this.getFavorites();
      console.log('📋 Все избранные элементы:', favorites);

      if (!favorites.success || !favorites.data) {
        console.log('❌ Не удалось получить избранное');
        return false;
      }
      const isFavorite = favorites.data.some(favorite => {
        if (tourId && favorite.type === 'tour') {
          console.log(`🔍 Сравниваем tour: ${favorite.id} с ${tourId}`, favorite.id == tourId);
          return favorite.id == tourId;
        }
        if (flightId && favorite.type === 'flight') {
          console.log(`🔍 Сравниваем flight: ${favorite.id} с ${flightId}`, favorite.id == flightId);
          return favorite.id == flightId;
        }
        return false;
      });

      console.log('✅ Результат проверки избранного:', isFavorite);
      return isFavorite;

    } catch (error) {
      console.error('❌ Ошибка при проверке избранного:', error);
      if (error.status === 401 || error.error === 'Токен не найден') {
        return false;
      }

      throw error;
    }
  }

  static async createBooking(bookingData) {
    try {
      const token = localStorage.getItem("token");
      const response = await this.makeAuthorizedRequest('/api/details/booking/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bookingData)
      });

      return response;
    } catch (error) {
      console.error('❌ Ошибка при бронировании:', error);
      throw error;
    }
  }

  static async getBookingHistory() {
    try {
      return await this.makeAuthorizedRequest('/api/details/bookings');
    } catch (error) {
      console.error('❌ Ошибка при получении истории бронирований:', error);
      throw error;
    }
  }
  static async submitReview(reviewData) {
    try {
      const url = '/api/details/reviews/add';
      const token = localStorage.getItem("token");
      return await this.makeAuthorizedRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reviewData)
      });
    } catch (error) {
      console.error('❌ Ошибка при отправке отзыва:', error);
      throw error;
    }
  }
  static logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = '/';
  }

  static handleAuthError(error) {
    if (error.error === 'Токен не найден' || error.status === 401) {
      this.logout();
      return true;
    }
    return false;
  }

  static formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  static formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static formatPrice(price) {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: '€'
    }).format(price);
  }

  static generateRatingStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    let stars = '';

    for (let i = 0; i < fullStars; i++) {
      stars += '★';
    }

    if (hasHalfStar) {
      stars += '½';
    }

    for (let i = 0; i < emptyStars; i++) {
      stars += '☆';
    }

    return stars;
  }
}

export { DetailsService };