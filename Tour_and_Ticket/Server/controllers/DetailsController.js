const pool = require('../config/database');

class DetailsController {
  async getTourDetails(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const [tourRows] = await pool.execute(
        `
            SELECT t.*
            FROM tours t
            WHERE t.id = ? AND t.available = TRUE
        `, [id]
      );

      if (tourRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Тур не найден'
        });
      }

      const tour = tourRows[0];

      const [imageRows] = await pool.execute(
        `
            SELECT ti.*
            FROM tour_images ti
            WHERE ti.tour_id = ?
            ORDER BY ti.sort_order ASC
        `, [id]
      );

      const [reviewRows] = await pool.execute(
        `SELECT
             r.*,
             u.id as user_id,
             u.name as user_name,
             u.last_name as user_last_name,
             u.photo as user_photo
         FROM reviews r
                  LEFT JOIN users u ON r.user_id = u.id
         WHERE r.tour_id = ?
         ORDER BY r.created_at DESC
             LIMIT 10
        `, [id]
      );

      const [ratingStats] = await pool.execute(
        `
            SELECT
                AVG(r.rating) as average_rating,
                COUNT(r.id) as reviews_count,
                COUNT(CASE WHEN r.rating = 5 THEN 1 END) as rating_5,
                COUNT(CASE WHEN r.rating = 4 THEN 1 END) as rating_4,
                COUNT(CASE WHEN r.rating = 3 THEN 1 END) as rating_3,
                COUNT(CASE WHEN r.rating = 2 THEN 1 END) as rating_2,
                COUNT(CASE WHEN r.rating = 1 THEN 1 END) as rating_1
            FROM reviews r
            WHERE r.tour_id = ?
        `, [id]
      );

      const stats = ratingStats[0];

      let isFavorite = false;
      if (userId) {
        const [favoritesRows] = await pool.execute(
          `
              SELECT id FROM favorites
              WHERE user_id = ? AND tour_id = ?
          `, [userId, id]
        );
        isFavorite = favoritesRows.length > 0;
      }

      const images = imageRows.map(img => ({
        id: img.id,
        imageUrl: DetailsController.convertImagePathToUrl(img.image_url, 'tours'),
        sortOrder: img.sort_order
      }));

      const reviews = reviewRows.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.created_at,
        user: {
          id: review.user_id,
          name: review.user_name,
          lastName: review.user_last_name,
          photo: review.user_photo
        }
      }));

      const ratingDistribution = {
        5: stats.rating_5 || 0,
        4: stats.rating_4 || 0,
        3: stats.rating_3 || 0,
        2: stats.rating_2 || 0,
        1: stats.rating_1 || 0
      };

      // Парсим доступные города для трансфера
      let availableCities = ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург'];
      try {
        if (tour.available_cities) {
          availableCities = JSON.parse(tour.available_cities);
        }
      } catch (e) {
        console.error('Ошибка парсинга available_cities:', e);
      }

      const formattedTour = {
        id: tour.id,
        title: tour.title,
        description: tour.description,
        country: tour.country,
        city: tour.city,
        startDate: tour.start_date,
        endDate: tour.end_date,
        price: tour.price,
        transportationIncluded: tour.transportation_included || false,
        availableCities: availableCities,
        duration: Math.ceil((new Date(tour.end_date) - new Date(tour.start_date)) / (1000 * 60 * 60 * 24)),
        available: tour.available,
        images: images,
        reviews: reviews,
        rating: {
          average: parseFloat(stats.average_rating) || 0,
          count: stats.reviews_count || 0,
          distribution: ratingDistribution
        },
        userStatus: {
          isFavorite: isFavorite,
          canBook: tour.available
        },
        hasGallery: images.length > 1,
        createdAt: tour.created_at,
        updatedAt: tour.updated_at
      };

      res.json({
        success: true,
        type: 'tour',
        data: formattedTour
      });

    } catch (error) {
      console.error('Ошибка при получении информации о туре:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении информации о туре'
      });
    }
  }

  async getFlightDetails(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const [flightRows] = await pool.execute(
        `
            SELECT f.*
            FROM flights f
            WHERE f.id = ? AND f.available = TRUE
        `, [id]
      );

      if (flightRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Рейс не найден'
        });
      }

      const flight = flightRows[0];

      // Получаем занятые места
      const [occupiedSeats] = await pool.execute(
        `SELECT seat_number FROM flight_seats 
         WHERE flight_id = ? AND is_occupied = TRUE`,
        [id]
      );

      const [imageRows] = await pool.execute(
        `
          SELECT fi.*
          FROM flight_images fi
          WHERE fi.flight_id = ?
        `, [id]
      );

      const [reviewRows] = await pool.execute(
        `
          SELECT 
          r.*,
          u.id as user_id,
          u.name as user_name,
          u.last_name as user_last_name,
          u.photo as user_photo
          FROM reviews r 
          LEFT JOIN users u ON r.user_id = u.id
          WHERE r.flight_id = ?
          ORDER BY r.created_at DESC
          LIMIT 10
        `, [id]
      );

      const [ratingStats] = await pool.execute(
        `
          SELECT 
          AVG(r.rating) as average_rating,
          COUNT(r.id) as reviews_count,
          COUNT(CASE WHEN r.rating = 5 THEN 1 END) as rating_5,
          COUNT(CASE WHEN r.rating = 4 THEN 1 END) as rating_4,
          COUNT(CASE WHEN r.rating = 3 THEN 1 END) as rating_3,
          COUNT(CASE WHEN r.rating = 2 THEN 1 END) as rating_2,
          COUNT(CASE WHEN r.rating = 1 THEN 1 END) as rating_1
          FROM reviews r
          WHERE r.flight_id = ?
        `, [id]
      );

      const stats = ratingStats[0];

      let isFavorite = false;
      if (userId) {
        const [favoriteRows] = await pool.execute(
          `
            SELECT id FROM favorites 
            WHERE user_id = ? AND flight_id = ?
          `, [userId, id]
        );
        isFavorite = favoriteRows.length > 0;
      }

      const image = imageRows.length > 0 ? {
        id: imageRows[0].id,
        imageUrl: DetailsController.convertImagePathToUrl(imageRows[0].image_url, 'flights')
      } : null;

      const reviews = reviewRows.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.created_at,
        user: {
          id: review.user_id,
          name: review.user_name,
          lastName: review.user_last_name,
          photo: review.user_photo
        }
      }));

      const ratingDistribution = {
        5: stats.rating_5 || 0,
        4: stats.rating_4 || 0,
        3: stats.rating_3 || 0,
        2: stats.rating_2 || 0,
        1: stats.rating_1 || 0
      };

      const formattedFlight = {
        id: flight.id,
        airline: flight.airline,
        flightNumber: flight.flight_number,
        departureCity: flight.departure_city,
        arrivalCity: flight.arrival_city,
        departureTime: flight.departure_time,
        arrivalTime: flight.arrival_time,
        price: flight.price,
        baggagePrice: flight.baggage_price || 50,
        aircraftType: flight.aircraft_type || 'Boeing 737',
        totalSeats: flight.total_seats || 180,
        occupiedSeats: occupiedSeats.map(seat => seat.seat_number),
        available: flight.available,
        image: image,
        reviews: reviews,
        rating: {
          average: parseFloat(stats.average_rating) || 0,
          count: stats.reviews_count || 0,
          distribution: ratingDistribution
        },
        userStatus: {
          isFavorite: isFavorite,
          canBook: flight.available
        },
        hasGallery: false,
        createdAt: flight.created_at,
        updatedAt: flight.updated_at
      };

      res.json({
        success: true,
        type: 'flight',
        data: formattedFlight
      });

    } catch (error) {
      console.error('Ошибка при получении информации о рейсе:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении информации о рейсе'
      });
    }
  }
  static convertImagePathToUrl = (filePath, type) => {
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

      return webUrl || (type === 'tours' ? '/images/default-tour.jpg' : '/images/default-flight.jpg');
    } catch (error) {
      console.error('❌ Ошибка преобразования пути:', error);
      return type === 'tours' ? '/images/default-tour.jpg' : '/images/default-flight.jpg';
    }
  }

  async addToFavorites(req, res) {
    try {
      const { tourId, flightId } = req.body;
      const userId = req.user.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Необходима авторизация'
        });
      }

      if (!tourId && !flightId) {
        return res.status(400).json({
          success: false,
          message: 'Не указан тур или авиабилет'
        });
      }

      let checkQuery = `SELECT id FROM favorites WHERE user_id = ? AND `;
      const checkParams = [userId];

      if (tourId) {
        checkQuery += ` tour_id = ?`;
        checkParams.push(tourId);
      } else {
        checkQuery += ` flight_id = ?`;
        checkParams.push(flightId);
      }

      const [existing] = await pool.execute(checkQuery, checkParams);

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Уже добавлено в избранное'
        });
      }

      const insertQuery = `
        INSERT INTO favorites (user_id, tour_id, flight_id)
        VALUES (?, ?, ?)
      `;
      await pool.execute(insertQuery, [userId, tourId, flightId]);

      res.json({
        success: true,
        message: 'Добавлено в избранное'
      });

    } catch (error) {
      console.error('Ошибка при добавлении в избранное:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при добавлении в избранное'
      });
    }
  }

  async createBooking(req, res) {
    try {
      const {
        tourId,
        flightId,
        travelersCount = 1,
        transportationType = 'self',
        departureCity = null,
        selectedSeats = [],
        hasBaggage = false,
        baggageCount = 0,
        totalPrice
      } = req.body;

      const userId = req.user.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Необходима авторизация'
        });
      }

      if (!tourId && !flightId) {
        return res.status(400).json({
          success: false,
          message: 'Не указан тур или авиабилет'
        });
      }

      // Валидация данных
      if (travelersCount < 1 || travelersCount > 10) {
        return res.status(400).json({
          success: false,
          message: 'Количество путешественников должно быть от 1 до 10'
        });
      }

      if (flightId) {
        // Для авиабилетов проверяем выбранные места
        if (!selectedSeats || selectedSeats.length !== travelersCount) {
          return res.status(400).json({
            success: false,
            message: 'Необходимо выбрать места для всех путешественников'
          });
        }

        const placeholders = selectedSeats.map(() => '?').join(',');
        const [occupiedSeats] = await pool.execute(
          `SELECT seat_number FROM flight_seats
           WHERE flight_id = ? AND seat_number IN (${placeholders}) AND is_occupied = TRUE`,
          [flightId, ...selectedSeats]
        );

        if (occupiedSeats.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Некоторые выбранные места уже заняты'
          });
        }
      }

      if (tourId && transportationType === 'company' && !departureCity) {
        return res.status(400).json({
          success: false,
          message: 'Для трансфера от компании необходимо указать город вылета'
        });
      }
      if (tourId) {
        const [tourRows] = await pool.execute(
          `SELECT available, price FROM tours WHERE id = ?`,
          [tourId]
        );
        if (tourRows.length === 0 || !tourRows[0].available) {
          return res.status(400).json({
            success: false,
            message: 'Тур недоступен для бронирования'
          });
        }
      }

      if (flightId) {
        const [flightRows] = await pool.execute(
          'SELECT available, price, baggage_price FROM flights WHERE id = ?',
          [flightId]
        );
        if (flightRows.length === 0 || !flightRows[0].available) {
          return res.status(400).json({
            success: false,
            message: 'Рейс недоступен для бронирования'
          });
        }
      }

      // Нормализация параметров - замена undefined на null
      const normalizedTourId = tourId || null;
      const normalizedFlightId = flightId || null;
      const normalizedDepartureCity = departureCity || null;
      const normalizedSelectedSeats = selectedSeats && selectedSeats.length > 0 ? JSON.stringify(selectedSeats) : null;
      const normalizedBaggageCount = hasBaggage ? baggageCount : 0;
      if (typeof totalPrice === 'undefined' || totalPrice === null) {
        return res.status(400).json({
          success: false,
          message: 'Не указана общая стоимость бронирования'
        });
      }
      const insertQuery = `
        INSERT INTO bookings (
          user_id, 
          tour_id, 
          flight_id, 
          travelers_count, 
          transportation_type, 
          departure_city, 
          selected_seats,
          has_baggage,
          baggage_count,
          total_price, 
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Активно')
      `;

      const [result] = await pool.execute(insertQuery, [
        userId,
        normalizedTourId,
        normalizedFlightId,
        travelersCount,
        transportationType,
        normalizedDepartureCity,
        normalizedSelectedSeats,
        hasBaggage,
        normalizedBaggageCount,
        totalPrice
      ]);

      // Занимаем места для авиабилетов
      if (flightId && selectedSeats.length > 0) {
        for (const seat of selectedSeats) {
          await pool.execute(
            `INSERT INTO flight_seats (flight_id, seat_number, is_occupied)
             VALUES (?, ?, TRUE)
                 ON DUPLICATE KEY UPDATE is_occupied = TRUE`,
            [flightId, seat]
          );
        }
      }

      await pool.execute(`
          INSERT INTO booking_history (booking_id, status)
          VALUES (?, 'Активно')
      `, [result.insertId]);

      res.json({
        success: true,
        message: 'Успешно забронировано',
        bookingId: result.insertId
      });

    } catch (error) {
      console.error('Ошибка при бронировании:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при бронировании'
      });
    }
  }

  async getUserFavorites(req, res) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Необходима авторизация'
        });
      }

      console.log('Получение избранного для пользователя:', userId);

      const [favoriteRows] = await pool.execute(`
      SELECT 
        fav.*,
        t.id as tour_id,
        t.title as tour_title,
        t.price as tour_price,
        t.country as tour_country,
        t.city as tour_city,
        t.start_date as tour_start_date,
        t.end_date as tour_end_date,
        fl.id as flight_id,
        fl.airline as flight_airline,
        fl.flight_number as flight_number,
        fl.price as flight_price,
        fl.departure_city,
        fl.arrival_city,
        fl.departure_time,
        fl.arrival_time,
        ti.image_url as tour_image,
        fi.image_url as flight_image
      FROM favorites fav
      LEFT JOIN tours t ON fav.tour_id = t.id
      LEFT JOIN flights fl ON fav.flight_id = fl.id
      LEFT JOIN tour_images ti ON t.id = ti.tour_id AND ti.sort_order = 1
      LEFT JOIN flight_images fi ON fl.id = fi.flight_id
      WHERE fav.user_id = ?
      ORDER BY fav.added_at DESC
    `, [userId]);

      const favorites = favoriteRows.map(fav => {
        if (fav.tour_id) {
          return {
            type: 'tour',
            id: fav.tour_id,
            title: fav.tour_title,
            price: fav.tour_price,
            country: fav.tour_country,
            city: fav.tour_city,
            startDate: fav.tour_start_date,
            endDate: fav.tour_end_date,
            imageUrl: DetailsController.convertImagePathToUrl(fav.tour_image, 'tours'),
            addedAt: fav.added_at
          };
        } else if (fav.flight_id) {
          return {
            type: 'flight',
            id: fav.flight_id,
            airline: fav.flight_airline,
            flightNumber: fav.flight_number,
            price: fav.flight_price,
            departureCity: fav.departure_city,
            arrivalCity: fav.arrival_city,
            departureTime: fav.departure_time,
            arrivalTime: fav.arrival_time,
            imageUrl: DetailsController.convertImagePathToUrl(fav.flight_image, 'flights'),
            addedAt: fav.added_at
          };
        }
        return null;
      }).filter(fav => fav !== null);

      res.json({
        success: true,
        data: favorites
      });

    } catch (error) {
      console.error('Ошибка при получении избранного:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении избранного'
      });
    }
  }
  async addReview(req, res) {
    try {
      const { tourId, flightId, rating, comment } = req.body;
      const userId = req.user.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Необходима авторизация'
        });
      }

      if (!rating || !comment) {
        return res.status(400).json({
          success: false,
          message: 'Рейтинг и комментарий обязательны'
        });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Рейтинг должен быть от 1 до 5'
        });
      }

      // Проверяем, что указан только один ID (тур ИЛИ рейс)
      if (tourId && flightId) {
        return res.status(400).json({
          success: false,
          message: 'Можно указать только тур или рейс'
        });
      }

      if (!tourId && !flightId) {
        return res.status(400).json({
          success: false,
          message: 'Не указан тур или рейс'
        });
      }

      // Проверяем, не оставлял ли пользователь уже отзыв
      let existingReviewQuery = '';
      const existingParams = [userId];

      if (tourId) {
        existingReviewQuery = `
          SELECT id FROM reviews 
          WHERE user_id = ? AND tour_id = ?
        `;
        existingParams.push(tourId);
      } else {
        existingReviewQuery = `
          SELECT id FROM reviews 
          WHERE user_id = ? AND flight_id = ?
        `;
        existingParams.push(flightId);
      }

      const [existingReviews] = await pool.execute(existingReviewQuery, existingParams);

      if (existingReviews.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Вы уже оставляли отзыв для этого тура/рейса'
        });
      }

      // Преобразуем undefined в null для SQL
      const sqlTourId = tourId || null;
      const sqlFlightId = flightId || null;

      // Добавляем новый отзыв
      const insertQuery = `
          INSERT INTO reviews (user_id, tour_id, flight_id, rating, comment)
          VALUES (?, ?, ?, ?, ?)
      `;

      await pool.execute(insertQuery, [userId, sqlTourId, sqlFlightId, rating, comment]);

      res.json({
        success: true,
        message: 'Отзыв успешно добавлен'
      });

    } catch (error) {
      console.error('Ошибка при добавлении отзыва:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при добавлении отзыва'
      });
    }
  }
}
module.exports = new DetailsController;