class FavoritesService
{
  static async makeAuthorizedRequest(url,options = {})
  {
    const token = localStorage.getItem("token");
    if (!token)
    {
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
    console.log('🔑 Токен:', token.substring(0, 20) + '...');
    const response = await fetch(url, config);
    const result = await response.json();
    if (!response.ok)
    {
      console.error('❌ Ошибка API:', result);
      throw result;
    }
    console.log('✅ Успешный ответ:', result);
    return result;
  }
  static async getFavorites()
  {
    return await this.makeAuthorizedRequest('/api/favorites');
  }
  static async addTourToFavorites(tourId)
  {
    const token = localStorage.getItem('token');
    return await this.makeAuthorizedRequest('/api/favorites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ tourId })
    });
  }
  static async addFlightToFavorites(flightId) {
    const token = localStorage.getItem('token');
    return await this.makeAuthorizedRequest('/api/favorites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ flightId })
    });
  }
  static async removeFromFavorites(favoriteId) {
    return await this.makeAuthorizedRequest(`/api/favorites/${favoriteId}`, {
      method: 'DELETE'
    });
  }
  static async isTourInFavorites(tourId) {
    try {
      const favorites = await this.getFavorites();
      return favorites.data.some(fav => fav.tour_id === tourId);
    } catch (error) {
      console.error('Ошибка при проверке избранного:', error);
      return false;
    }
  }
  static async isFlightInFavorites(flightId) {
    try {
      const favorites = await this.getFavorites();
      return favorites.data.some(fav => fav.flight_id === flightId);
    } catch (error) {
      console.error('Ошибка при проверке избранного:', error);
      return false;
    }
  }
  static async getFavoritesCount() {
    try {
      const favorites = await this.getFavorites();
      return favorites.data.length;
    } catch (error) {
      console.error('Ошибка при получении количества избранного:', error);
      return 0;
    }
  }
  static async clearAllFavorites() {
    return await this.makeAuthorizedRequest('/api/favorites/clear', {
      method: 'DELETE'
    });
  }
  static async getFavoriteTours() {
    try {
      const favorites = await this.getFavorites();
      return favorites.data.filter(fav => fav.type === 'tour');
    } catch (error) {
      console.error('Ошибка при получении избранных туров:', error);
      return [];
    }
  }
  static async getFavoriteFlights() {
    try {
      const favorites = await this.getFavorites();
      return favorites.data.filter(fav => fav.type === 'flight');
    } catch (error) {
      console.error('Ошибка при получении избранных авиабилетов:', error);
      return [];
    }
  }
  static async addToFavorites(itemId, itemType) {
    if (itemType === 'tour') {
      return await this.addTourToFavorites(itemId);
    } else if (itemType === 'flight') {
      return await this.addFlightToFavorites(itemId);
    } else {
      throw { error: 'Неизвестный тип элемента' };
    }
  }
  static async toggleFavorite(itemId, itemType) {
    try {
      const isInFavorites = itemType === 'tour'
        ? await this.isTourInFavorites(itemId)
        : await this.isFlightInFavorites(itemId);

      if (isInFavorites) {
        // Найти ID избранного элемента для удаления
        const favorites = await this.getFavorites();
        const favoriteItem = favorites.data.find(fav =>
          (itemType === 'tour' && fav.tour_id === itemId) ||
          (itemType === 'flight' && fav.flight_id === itemId)
        );

        if (favoriteItem) {
          await this.removeFromFavorites(favoriteItem.id);
          return { action: 'removed', success: true };
        }
      } else {
        await this.addToFavorites(itemId, itemType);
        return { action: 'added', success: true };
      }
    } catch (error) {
      console.error('Ошибка при переключении избранного:', error);
      throw error;
    }
  }
}
export { FavoritesService };