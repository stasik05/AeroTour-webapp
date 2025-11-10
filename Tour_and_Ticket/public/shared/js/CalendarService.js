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

    console.log('Отправка запроса:', url);
    console.log('Токен:', token.substring(0, 20) + '...');
    const response = await fetch(url, config);

    // Проверяем content-type перед парсингом JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('❌ Ожидался JSON, но получен:', contentType, text.substring(0, 200));
      throw new Error(`Некорректный формат ответа: ${contentType}`);
    }

    const result = await response.json();
    if (!response.ok) {
      console.error('Ошибка API:', result);
      throw result;
    }
    console.log('Успешный ответ:', result);
    return result;
  }

  static async getBookings()
  {
    return await this.makeAuthorizedRequest('/api/calendar/bookings');
  }

  static async getTripDetails(bookingId)
  {
    try {
      console.log(`🔍 CalendarService: Запрос деталей бронирования ${bookingId}`);

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

      console.log(`📊 Статус ответа: ${response.status} ${response.statusText}`);

      // Проверяем content-type
      const contentType = response.headers.get('content-type');
      console.log(`📄 Content-Type: ${contentType}`);

      if (!contentType || !contentType.includes('application/json')) {
        // Если это не JSON, читаем как текст для отладки
        const textResponse = await response.text();
        console.error('❌ Ожидался JSON, но получен:', {
          contentType,
          status: response.status,
          statusText: response.statusText,
          body: textResponse.substring(0, 500)
        });

        throw new Error(`Сервер вернул некорректный формат: ${contentType}. Статус: ${response.status}`);
      }

      // Парсим JSON
      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Ошибка API:', result);
        throw result;
      }

      console.log(`✅ CalendarService: Данные получены для бронирования ${bookingId}`, result);
      return result;

    } catch (error) {
      console.error('❌ CalendarService.getTripDetails error:', error);

      // Перебрасываем ошибку с дополнительной информацией
      if (error instanceof SyntaxError) {
        throw new Error(`Ошибка парсинга JSON: ${error.message}`);
      }
      throw error;
    }
  }

  static async getTripsStatistics() {
    return await this.makeAuthorizedRequest('/api/calendar/statistics');
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
      console.error('❌ Ошибка экспорта:', response.status, errorText);
      throw new Error(`Ошибка при экспорте календаря: ${response.status}`);
    }
    const blob = await response.blob();
    return blob;
  }

  // Диагностический метод для проверки endpoint
  static async testTripDetailsEndpoint(bookingId) {
    try {
      console.log('🧪 Тестирование endpoint...');

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/calendar/trip/${bookingId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📋 Информация о ответе:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        ok: response.ok
      });

      const text = await response.text();
      console.log('📝 Тело ответа:', text.substring(0, 1000));

      // Пробуем парсить как JSON
      try {
        const json = JSON.parse(text);
        console.log('✅ JSON парсится успешно:', json);
        return json;
      } catch (parseError) {
        console.error('❌ Ошибка парсинга JSON:', parseError);
        throw parseError;
      }

    } catch (error) {
      console.error('❌ Ошибка тестирования:', error);
      throw error;
    }
  }
}