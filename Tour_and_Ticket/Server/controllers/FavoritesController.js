const pool = require('../config/database');

class FavoritesController {
  static async getUserFavorites(userId) {
    try {
      console.log('📥 Получение избранного для пользователя:', userId);

      const [rows] = await pool.execute(
        `SELECT f.*, 
                 t.id as tour_id, t.title as tour_title, t.description as tour_description, 
                 t.country as tour_country, t.city as tour_city, t.start_date as tour_start_date, 
                 t.end_date as tour_end_date, t.price as tour_price, t.available as tour_available,
                 ti.image_url as tour_image,
                 fl.id as flight_id, fl.airline as flight_airline, fl.flight_number as flight_number, 
                 fl.departure_city as flight_departure_city, fl.arrival_city as flight_arrival_city,
                 fl.departure_time as flight_departure_time, fl.arrival_time as flight_arrival_time,
                 fl.price as flight_price, fl.available as flight_available,
                 fli.image_url as flight_image
                 FROM favorites f 
                 LEFT JOIN tours t ON f.tour_id = t.id
                 LEFT JOIN tour_images ti ON t.id = ti.tour_id AND ti.sort_order = 1
                 LEFT JOIN flights fl ON f.flight_id = fl.id
                 LEFT JOIN flight_images fli ON fl.id = fli.flight_id
                 WHERE f.user_id = ?
                 ORDER BY f.added_at DESC`,
        [userId]
      );

      console.log('📊 Найдено записей в избранном:', rows.length);

      return rows.map(row => {
        const description = row.tour_description || '';
        const shortDescription = description.split('.')[0] + (description.includes('.') ? '.' : '');
        const tourImage = this.convertImagePathToUrl(row.tour_image, 'tour');
        const flightImage = this.convertImagePathToUrl(row.flight_image, 'flight');

        return {
          id: row.id,
          type: row.tour_id ? 'tour' : 'flight',
          added_at: row.added_at,
          item: row.tour_id ? {
            id: row.tour_id,
            title: row.tour_title,
            description: shortDescription,
            country: row.tour_country,
            city: row.tour_city,
            start_date: row.tour_start_date,
            end_date: row.tour_end_date,
            price: row.tour_price,
            available: row.tour_available,
            image: tourImage
          } : {
            id: row.flight_id,
            airline: row.flight_airline,
            flight_number: row.flight_number,
            departure_city: row.flight_departure_city,
            arrival_city: row.flight_arrival_city,
            departure_time: row.flight_departure_time,
            arrival_time: row.flight_arrival_time,
            price: row.flight_price,
            available: row.flight_available,
            image: flightImage
          }
        };
      });
    } catch (error) {
      console.error('❌ Error in getUserFavorites:', error);
      throw new Error(`Ошибка при получении избранного: ${error.message}`);
    }
  }

  static convertImagePathToUrl(filePath, type) {
    if (!filePath) return null;

    try {
      console.log(`🖼️ Исходный путь: ${filePath}`);

      // Если путь уже является URL, возвращаем как есть
      if (filePath.startsWith('http') || filePath.startsWith('/')) {
        return filePath;
      }

      let webUrl = null;

      // Нормализуем путь
      const normalizedPath = filePath.replace(/\\\\/g, '\\');
      const pathParts = normalizedPath.split('\\');
      console.log(`📁 Части пути:`, pathParts);

      // Ищем индекс ключевых папок
      const toursIndex = pathParts.indexOf('Tours');
      const flightIndex = pathParts.indexOf('Flight');

      if (toursIndex !== -1 && pathParts.length > toursIndex + 2) {
        // Для туров: /images/tours/название_тура/файл
        const tourName = pathParts[toursIndex + 1];
        const fileName = pathParts[pathParts.length - 1];
        webUrl = `/images/tours/${tourName}/${fileName}`;
        console.log(`🎯 Определен как тур: ${tourName}/${fileName}`);

      } else if (flightIndex !== -1 && pathParts.length > flightIndex + 1) {
        // Для авиарейсов: /images/Flight/файл (с большой F)
        const fileName = pathParts[pathParts.length - 1];
        webUrl = `/images/Flight/${fileName}`;
        console.log(`✈️ Определен как рейс: ${fileName}`);

      } else if (pathParts.includes('Pictures') && pathParts.length > pathParts.indexOf('Pictures') + 1) {
        // Общий случай
        const picturesIndex = pathParts.indexOf('Pictures');
        const relativeParts = pathParts.slice(picturesIndex + 1);
        webUrl = `/images/${relativeParts.join('/')}`;
        console.log(`📸 Общий случай: ${relativeParts.join('/')}`);
      }

      console.log(`✅ Преобразовано в: ${webUrl}`);
      return webUrl;

    } catch (error) {
      console.error('❌ Ошибка преобразования пути:', error);
      return null;
    }
  }

  static async addToFavorites(userId, tourId, flightId) {
    try {
      console.log('➕ Добавление в избранное:', { userId, tourId, flightId });

      // Проверяем, существует ли уже запись
      const [existing] = await pool.execute(
        `SELECT id FROM favorites
         WHERE user_id = ? AND (tour_id = ? OR flight_id = ?)`,
        [userId, tourId || null, flightId || null]
      );

      if (existing.length > 0) {
        throw new Error('Уже в избранном');
      }

      const [result] = await pool.execute(
        `INSERT INTO favorites (user_id, tour_id, flight_id, added_at)
         VALUES (?, ?, ?, NOW())`,
        [userId, tourId || null, flightId || null]
      );

      return {
        id: result.insertId,
        user_id: userId,
        tour_id: tourId,
        flight_id: flightId,
        added_at: new Date()
      };
    } catch (error) {
      console.error('❌ Error in addToFavorites:', error);
      throw new Error(`Ошибка при добавлении в избранное: ${error.message}`);
    }
  }

  static async removeFromFavorites(userId, favoriteId) {
    try {
      console.log('🗑️ Удаление из избранного:', { userId, favoriteId });

      const [result] = await pool.execute(
        `DELETE FROM favorites WHERE id = ? AND user_id = ?`,
        [favoriteId, userId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Элемент не найден в избранном');
      }

      return true;
    } catch (error) {
      console.error('❌ Error in removeFromFavorites:', error);
      throw new Error(`Ошибка при удалении из избранного: ${error.message}`);
    }
  }
}

module.exports = FavoritesController;