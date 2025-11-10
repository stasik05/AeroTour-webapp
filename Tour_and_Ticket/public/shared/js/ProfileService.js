export class ProfileService
{
  static async makeAuthorizedRequest(url, options = {}) {
    const token = localStorage.getItem('token');

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
    console.log('🔑 Токен:', token.substring(0, 20) + '...');

    const response = await fetch(url, config);
    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Ошибка API:', result);
      throw result;
    }

    console.log('✅ Успешный ответ:', result);
    return result;
  }

  static async getProfile() {
    return await this.makeAuthorizedRequest('/api/user/profile');
  }

  static async updateProfile(profileData)
  {
    const token = localStorage.getItem('token');
    console.log('🔑 Токен для PUT:', token ? 'есть' : 'нет');
    return await this.makeAuthorizedRequest('/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(profileData)
    });
  }

  static async getBookings() {
    return await this.makeAuthorizedRequest('/api/user/bookings');
  }

  static async getBookingDetails(bookingId) {
    return await this.makeAuthorizedRequest(`/api/user/bookings/${bookingId}`);
  }

  static async cancelBooking(bookingId) {
    return await this.makeAuthorizedRequest(`/api/user/bookings/${bookingId}/cancel`, {
      method: 'POST'
    });
  }

  static async changePassword(passwordData)
  {
    const token = localStorage.getItem('token');
    // console.log('🔑 Токен для POST:', token ? 'есть' : 'нет');
    return await this.makeAuthorizedRequest('/api/user/profile/password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,

      },
      body: JSON.stringify(passwordData)
    });
  }

  static async uploadPhoto(file) {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('photo', file);

    const response = await fetch('/api/user/profile/photo', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      throw result;
    }

    return result;
  }
}