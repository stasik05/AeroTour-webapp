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
    const response = await fetch(url, config);
    const result = await response.json();
    if (!response.ok)
    {
      console.error('Ошибка API:', result);
      throw result;
    }
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
  static async addToFavorites(itemId, itemType) {
    if (itemType === 'tour') {
      return await this.addTourToFavorites(itemId);
    } else if (itemType === 'flight') {
      return await this.addFlightToFavorites(itemId);
    } else {
      throw { error: 'Неизвестный тип элемента' };
    }
  }
}
export { FavoritesService };