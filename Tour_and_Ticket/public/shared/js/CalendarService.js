export class CalendarService
{
  static async makeAuthorizedRequest(url, options = {})
  {
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
    const response = await fetch(url, config);
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Ожидался JSON, но получен:', contentType, text.substring(0, 200));
      throw new Error(`Некорректный формат ответа: ${contentType}`);
    }

    const result = await response.json();
    if (!response.ok) {
      console.error('Ошибка API:', result);
      throw result;
    }
    return result;
  }

  static async getBookings()
  {
    return await this.makeAuthorizedRequest('/api/calendar/bookings');
  }

  static async getTripDetails(bookingId)
  {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw { error: 'Токен не найден' };
      }
      const response = await fetch(`/api/calendar/trip/${bookingId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Ожидался JSON, но получен:', {
          contentType,
          status: response.status,
          statusText: response.statusText,
          body: textResponse.substring(0, 500)
        });

        throw new Error(`Сервер вернул некорректный формат: ${contentType}. Статус: ${response.status}`);
      }
      const result = await response.json();
      if (!response.ok) {
        console.error('Ошибка API:', result);
        throw result;
      }
      return result;

    } catch (error) {
      console.error('CalendarService.getTripDetails error:', error);
      if (error instanceof SyntaxError) {
        throw new Error(`Ошибка парсинга JSON: ${error.message}`);
      }
      throw error;
    }
  }
  static async exportToICal() {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/calendar/export/ical', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ошибка экспорта:', response.status, errorText);
      throw new Error(`Ошибка при экспорте календаря: ${response.status}`);
    }
    const blob = await response.blob();
    return blob;
  }
}