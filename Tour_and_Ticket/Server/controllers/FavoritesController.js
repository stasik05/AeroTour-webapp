const pool = require('../config/database');
class FavoritesController {
  static async getUserFavorites(userId) {
    try {
      const [rows] = await pool.execute(
        `SELECT
             f.*,
             t.id as tour_id,
             t.title as tour_title,
             t.description as tour_description,
             t.country as tour_country,
             t.city as tour_city,
             t.start_date as tour_start_date,
             t.end_date as tour_end_date,
             t.price as tour_price,
             t.available as tour_available,
             ti.image_url as tour_image,
             fl.id as flight_id,
             fl.airline as flight_airline,
             fl.flight_number as flight_number,
             fl.departure_city as flight_departure_city,
             fl.arrival_city as flight_arrival_city,
             fl.departure_time as flight_departure_time,
             fl.arrival_time as flight_arrival_time,
             fl.price as flight_price,
             fl.available as flight_available,
             fli.image_url as flight_image,
             dt.discount_percent as tour_discount_percent,
             pot.discount_percent as tour_personal_discount_percent,
             pot.valid_until as tour_personal_discount_valid_until,
             CASE
                 WHEN pot.discount_percent IS NOT NULL AND pot.valid_until >= CURDATE()
                     THEN ROUND(t.price * (1 - pot.discount_percent / 100), 2)
                 WHEN dt.discount_percent IS NOT NULL AND dt.is_active = TRUE
                     AND (dt.start_date IS NULL OR dt.start_date <= CURDATE())
                     AND (dt.end_date IS NULL OR dt.end_date >= CURDATE())
                     THEN ROUND(t.price * (1 - dt.discount_percent / 100), 2)
                 ELSE t.price
                 END as tour_final_price,
             CASE
                 WHEN pot.discount_percent IS NOT NULL AND pot.valid_until >= CURDATE()
                     THEN t.price
                 WHEN dt.discount_percent IS NOT NULL AND dt.is_active = TRUE
                     AND (dt.start_date IS NULL OR dt.start_date <= CURDATE())
                     AND (dt.end_date IS NULL OR dt.end_date >= CURDATE())
                     THEN t.price
                 ELSE NULL
                 END as tour_original_price,
             CASE
                 WHEN pot.discount_percent IS NOT NULL AND pot.valid_until >= CURDATE()
                     THEN 'personal'
                 WHEN dt.discount_percent IS NOT NULL AND dt.is_active = TRUE
                     AND (dt.start_date IS NULL OR dt.start_date <= CURDATE())
                     AND (dt.end_date IS NULL OR dt.end_date >= CURDATE())
                     THEN 'general'
                 ELSE NULL
                 END as tour_discount_type,
             df.discount_percent as flight_discount_percent,
             pof.discount_percent as flight_personal_discount_percent,
             pof.valid_until as flight_personal_discount_valid_until,
             CASE
                 WHEN pof.discount_percent IS NOT NULL AND pof.valid_until >= CURDATE()
                     THEN ROUND(fl.price * (1 - pof.discount_percent / 100), 2)
                 WHEN df.discount_percent IS NOT NULL AND df.is_active = TRUE
                     AND (df.start_date IS NULL OR df.start_date <= CURDATE())
                     AND (df.end_date IS NULL OR df.end_date >= CURDATE())
                     THEN ROUND(fl.price * (1 - df.discount_percent / 100), 2)
                 ELSE fl.price
                 END as flight_final_price,
             CASE
                 WHEN pof.discount_percent IS NOT NULL AND pof.valid_until >= CURDATE()
                     THEN fl.price
                 WHEN df.discount_percent IS NOT NULL AND df.is_active = TRUE
                     AND (df.start_date IS NULL OR df.start_date <= CURDATE())
                     AND (df.end_date IS NULL OR df.end_date >= CURDATE())
                     THEN fl.price
                 ELSE NULL
                 END as flight_original_price,
             CASE
                 WHEN pof.discount_percent IS NOT NULL AND pof.valid_until >= CURDATE()
                     THEN 'personal'
                 WHEN df.discount_percent IS NOT NULL AND df.is_active = TRUE
                     AND (df.start_date IS NULL OR df.start_date <= CURDATE())
                     AND (df.end_date IS NULL OR df.end_date >= CURDATE())
                     THEN 'general'
                 ELSE NULL
                 END as flight_discount_type
         FROM favorites f
                  LEFT JOIN tours t ON f.tour_id = t.id
                  LEFT JOIN tour_images ti ON t.id = ti.tour_id AND ti.sort_order = 1
                  LEFT JOIN discounts dt ON (
             dt.tour_id = t.id
                 AND dt.is_active = TRUE
                 AND (dt.start_date IS NULL OR dt.start_date <= CURDATE())
                 AND (dt.end_date IS NULL OR dt.end_date >= CURDATE())
             )
                  LEFT JOIN personalized_offers pot ON (
             (pot.tour_id = t.id OR (pot.tour_id IS NULL AND pot.flight_id IS NULL))
                 AND pot.valid_until >= CURDATE()
             ${userId ? 'AND pot.user_id = ?' : ''}
             )
                  LEFT JOIN flights fl ON f.flight_id = fl.id
                  LEFT JOIN flight_images fli ON fl.id = fli.flight_id
                  LEFT JOIN discounts df ON (
             (df.flight_id = fl.id OR df.airline = fl.airline)
                 AND df.is_active = TRUE
                 AND (df.start_date IS NULL OR df.start_date <= CURDATE())
                 AND (df.end_date IS NULL OR df.end_date >= CURDATE())
             )
                  LEFT JOIN personalized_offers pof ON (
             (pof.flight_id = fl.id OR (pof.tour_id IS NULL AND pof.flight_id IS NULL))
                 AND pof.valid_until >= CURDATE()
                 AND pof.user_id = ?
             )
         WHERE f.user_id = ?
         ORDER BY f.added_at DESC`,
        [userId, userId, userId]
      );
      return rows.map(row => {
        const description = row.tour_description || '';
        const shortDescription = description.split('.')[0] + (description.includes('.') ? '.' : '');
        const tourImage = this.convertImagePathToUrl(row.tour_image, 'tour');
        const flightImage = this.convertImagePathToUrl(row.flight_image, 'flight');
        if (row.tour_id) {
          const hasDiscount = row.tour_original_price !== null;
          const isPersonalDiscount = row.tour_discount_type === 'personal';
          const discountPercent = isPersonalDiscount ? row.tour_personal_discount_percent : row.tour_discount_percent;
          const savedAmount = hasDiscount ? (row.tour_original_price - row.tour_final_price) : 0;

          return {
            id: row.id,
            type: 'tour',
            added_at: row.added_at,
            item: {
              id: row.tour_id,
              title: row.tour_title,
              description: shortDescription,
              country: row.tour_country,
              city: row.tour_city,
              start_date: row.tour_start_date,
              end_date: row.tour_end_date,
              price: row.tour_final_price,
              originalPrice: row.tour_original_price,
              discountPercent: discountPercent,
              discountType: row.tour_discount_type,
              hasDiscount: hasDiscount,
              isPersonalOffer: isPersonalDiscount,
              personalDiscountValidUntil: row.tour_personal_discount_valid_until,
              available: row.tour_available,
              image: tourImage,
              discountInfo: hasDiscount ? {
                percent: discountPercent,
                saved: savedAmount,
                type: row.tour_discount_type,
                isPersonal: isPersonalDiscount,
                validUntil: row.tour_personal_discount_valid_until
              } : null
            }
          };
        }
        else if (row.flight_id) {
          const hasDiscount = row.flight_original_price !== null;
          const isPersonalDiscount = row.flight_discount_type === 'personal';
          const discountPercent = isPersonalDiscount ? row.flight_personal_discount_percent : row.flight_discount_percent;
          const savedAmount = hasDiscount ? (row.flight_original_price - row.flight_final_price) : 0;

          return {
            id: row.id,
            type: 'flight',
            added_at: row.added_at,
            item: {
              id: row.flight_id,
              airline: row.flight_airline,
              flight_number: row.flight_number,
              departure_city: row.flight_departure_city,
              arrival_city: row.flight_arrival_city,
              departure_time: row.flight_departure_time,
              arrival_time: row.flight_arrival_time,
              price: row.flight_final_price,
              originalPrice: row.flight_original_price,
              discountPercent: discountPercent,
              discountType: row.flight_discount_type,
              hasDiscount: hasDiscount,
              isPersonalOffer: isPersonalDiscount,
              personalDiscountValidUntil: row.flight_personal_discount_valid_until,
              available: row.flight_available,
              image: flightImage,
              discountInfo: hasDiscount ? {
                percent: discountPercent,
                saved: savedAmount,
                type: row.flight_discount_type,
                isPersonal: isPersonalDiscount,
                validUntil: row.flight_personal_discount_valid_until
              } : null
            }
          };
        }

        return null;
      }).filter(item => item !== null);
    } catch (error) {
      console.error('Error in getUserFavorites:', error);
      throw new Error(`Ошибка при получении избранного: ${error.message}`);
    }
  }

  static convertImagePathToUrl(filePath, type) {
    if (!filePath) return null;

    try {
      if (filePath.startsWith('http') || filePath.startsWith('/')) {
        return filePath;
      }
      let webUrl = null;

      const normalizedPath = filePath.replace(/\\\\/g, '\\');
      const pathParts = normalizedPath.split('\\');
      const toursIndex = pathParts.indexOf('Tours');
      const flightIndex = pathParts.indexOf('Flight');

      if (toursIndex !== -1 && pathParts.length > toursIndex + 2) {
        const tourName = pathParts[toursIndex + 1];
        const fileName = pathParts[pathParts.length - 1];
        webUrl = `/images/tours/${tourName}/${fileName}`;

      } else if (flightIndex !== -1 && pathParts.length > flightIndex + 1) {
        const fileName = pathParts[pathParts.length - 1];
        webUrl = `/images/Flight/${fileName}`;
      } else if (pathParts.includes('Pictures') && pathParts.length > pathParts.indexOf('Pictures') + 1) {
        const picturesIndex = pathParts.indexOf('Pictures');
        const relativeParts = pathParts.slice(picturesIndex + 1);
        webUrl = `/images/${relativeParts.join('/')}`;
      }
      return webUrl;
    } catch (error) {
      console.error('Ошибка преобразования пути:', error);
      return null;
    }
  }

  static async addToFavorites(userId, tourId, flightId) {
    try {
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
      console.error('Error in addToFavorites:', error);
      throw new Error(`Ошибка при добавлении в избранное: ${error.message}`);
    }
  }

  static async removeFromFavorites(userId, favoriteId) {
    try {
      const [result] = await pool.execute(
        `DELETE FROM favorites WHERE id = ? AND user_id = ?`,
        [favoriteId, userId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Элемент не найден в избранном');
      }

      return true;
    } catch (error) {
      console.error('Error in removeFromFavorites:', error);
      throw new Error(`Ошибка при удалении из избранного: ${error.message}`);
    }
  }
}

module.exports = FavoritesController;