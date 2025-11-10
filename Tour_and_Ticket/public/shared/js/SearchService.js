class SearchService
{
  static async makeAuthorizedRequest(url,options={})
  {
    const token = localStorage.getItem("token");
    if(!token)
    {
      throw {error:'Токен не найден'};
    }
    const config =
      {
        headers:
          {
            'Authorization': `Bearer ${token}`,
            ...options.headers
          },
        ...options
      };
    console.log('📡 Отправка запроса:', url);
    console.log('🔑 Токен:', token.substring(0, 20) + '...');
    const response = await fetch(url, config);
    const result = await response.json();

    if(!response.ok)
    {
      console.error('❌ Ошибка API:', result);
      // Добавляем статус ошибки в объект ошибки
      throw { ...result, status: response.status };
    }

    console.log('✅ Успешный ответ:', result);
    return result;
  }

  static async searchTours(searchParams = {})
  {
    try
    {
      const params = new URLSearchParams();
      if (searchParams.destination) params.append('destination', searchParams.destination);
      if (searchParams.startDate) params.append('startDate', searchParams.startDate);
      if (searchParams.endDate) params.append('endDate', searchParams.endDate);
      if (searchParams.duration) params.append('duration', searchParams.duration);
      if (searchParams.maxPrice) params.append('maxPrice', searchParams.maxPrice);
      const url = `/api/search/tours?${params.toString()}`;
      return await this.makeAuthorizedRequest(url);
    }
    catch(error)
    {
      console.error('❌ Ошибка при поиске туров:', error);
      throw error;
    }
  }

  static async searchFlights(searchParams = {})
  {
    try
    {
      const params = new URLSearchParams();
      if (searchParams.departureCity) params.append('departureCity', searchParams.departureCity);
      if (searchParams.arrivalCity) params.append('arrivalCity', searchParams.arrivalCity);
      if (searchParams.date) params.append('date', searchParams.date);
      if (searchParams.maxPrice) params.append('maxPrice', searchParams.maxPrice);
      const url = `/api/search/flights?${params.toString()}`;
      return await this.makeAuthorizedRequest(url);
    }
    catch(error)
    {
      console.error('❌ Ошибка при поиске авиабилетов:', error);
      throw error;
    }
  }

  static async addToFavorites(tourId=null,flightId=null)
  {
    try
    {
      if(!tourId && !flightId)
      {
        throw { error: 'Не указан тур или авиабилет' };
      }
      const token = localStorage.getItem('token');
      const response = await this.makeAuthorizedRequest('/api/favorites',
        {
          method:'POST',
          headers:
            {
              'Content-Type':'application/json',
              'Authorization': `Bearer ${token}`,
            },
          body: JSON.stringify({tourId,flightId})
        });
      return response;
    }
    catch(error)
    {
      console.error('❌ Ошибка при добавлении в избранное:', error);

      // Проверяем, является ли ошибка "Уже в избранном"
      if (error.status === 409 || error.isAlreadyFavorite) {
        throw { ...error, isAlreadyFavorite: true };
      }

      throw error;
    }
  }

  static async getFavorites()
  {
    try
    {
      return await this.makeAuthorizedRequest('/api/favorites');
    }
    catch(error)
    {
      console.error('❌ Ошибка при получении избранного:', error);
      throw error;
    }
  }

  static async removeFromFavorites(favoriteId)
  {
    try
    {
      return await this.makeAuthorizedRequest(`/api/favorites/${favoriteId}`,
        {
          method: 'DELETE'
        });
    }
    catch(error)
    {
      console.error('❌ Ошибка при удалении из избранного:', error);
      throw error;
    }
  }

  static async checkIfFavorite(tourId = null, flightId = null) {
    try {
      const favorites = await this.getFavorites();
      return favorites.some(favorite => {
        if (tourId && favorite.item && favorite.item.id === tourId) return true;
        if (flightId && favorite.item && favorite.item.id === flightId) return true;
        return false;
      });
    } catch (error) {
      console.error('❌ Ошибка при проверке избранного:', error);
      return false;
    }
  }

  static isAuthenticated()
  {
    return !!localStorage.getItem("token");
  }

  static logout()
  {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = '/login';
  }

  static handleAuthError(error)
  {
    if (error.error === 'Токен не найден' || error.status === 401)
    {
      this.logout();
      return true;
    }
    return false;
  }
}

export {SearchService};