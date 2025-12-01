const pool = require('../config/database');

class SearchController {
  async searchTours(req, res) {
    try {
      const { destination, startDate, endDate, duration, maxPrice } = req.query;
      const userId = req.user?.id;
      let query = `
          SELECT
              t.*,
              ti.image_url,
              d.discount_percent as discount_percent,
              d.is_active as discount_active,
              d.start_date as discount_start_date,
              d.end_date as discount_end_date,
              po.discount_percent as personal_discount_percent,
              po.valid_until as personal_discount_valid_until,
              CASE
                  WHEN po.discount_percent IS NOT NULL AND po.valid_until >= CURDATE()
                      THEN ROUND(t.price * (1 - po.discount_percent / 100), 2)
                  WHEN d.discount_percent IS NOT NULL AND d.is_active = TRUE
                      AND (d.start_date IS NULL OR d.start_date <= CURDATE())
                      AND (d.end_date IS NULL OR d.end_date >= CURDATE())
                      THEN ROUND(t.price * (1 - d.discount_percent / 100), 2)
                  
                  ELSE t.price
              END as final_price,
              
              CASE
                  WHEN po.discount_percent IS NOT NULL AND po.valid_until >= CURDATE()
                      THEN t.price
                  WHEN d.discount_percent IS NOT NULL AND d.is_active = TRUE
                      AND (d.start_date IS NULL OR d.start_date <= CURDATE())
                      AND (d.end_date IS NULL OR d.end_date >= CURDATE())
                      THEN t.price
                  ELSE NULL
              END as original_price,
            
              CASE
                  WHEN po.discount_percent IS NOT NULL AND po.valid_until >= CURDATE()
                      THEN 'personal'
                  WHEN d.discount_percent IS NOT NULL AND d.is_active = TRUE
                      AND (d.start_date IS NULL OR d.start_date <= CURDATE())
                      AND (d.end_date IS NULL OR d.end_date >= CURDATE())
                      THEN 'general'
                  ELSE NULL
              END as discount_type,
              COALESCE(po.discount_percent, d.discount_percent) as applied_discount_percent
          FROM tours t
          LEFT JOIN tour_images ti ON t.id = ti.tour_id AND ti.sort_order = 1
          LEFT JOIN discounts d ON (
              d.tour_id = t.id
              AND d.is_active = TRUE
          )
          LEFT JOIN personalized_offers po ON (
              (po.tour_id = t.id OR (po.tour_id IS NULL AND po.flight_id IS NULL))
                  AND po.valid_until >= CURDATE()
              ${userId ? 'AND po.user_id = ?' : ''}
              )
          WHERE t.available = TRUE
      `;

      const params = [];
      if (userId) {
        params.push(userId);
      }

      if (destination) {
        query += ` AND (t.country LIKE ? OR t.city LIKE ?)`;
        params.push(`%${destination}%`, `%${destination}%`);
      }

      if (startDate) {
        query += ` AND t.start_date >= ?`;
        params.push(startDate);
      }

      if (endDate) {
        query += ` AND t.end_date <= ?`;
        params.push(endDate);
      }

      if (duration) {
        query += ` AND DATEDIFF(t.end_date, t.start_date) = ?`;
        params.push(parseInt(duration));
      }

      if (maxPrice) {
        query += ` AND t.price <= ?`;
        params.push(parseFloat(maxPrice));
      }

      query += ` ORDER BY final_price ASC, t.price ASC`;
      const [tours] = await pool.execute(query, params);
      const formattedTours = tours.map(tour => {
        const tourImage = SearchController.convertImagePathToUrl(tour.image_url, 'tours');
        const hasDiscount = tour.original_price !== null;
        const isPersonalDiscount = tour.discount_type === 'personal';
        const discountPercent = isPersonalDiscount ? tour.personal_discount_percent : tour.discount_percent;

        return {
          id: tour.id,
          title: tour.title,
          description: tour.description,
          country: tour.country,
          city: tour.city,
          startDate: tour.start_date,
          endDate: tour.end_date,
          price: tour.final_price,
          originalPrice: tour.original_price,
          discountPercent: discountPercent,
          discountType: tour.discount_type,
          isPersonalOffer: isPersonalDiscount,
          personalDiscountValidUntil: tour.personal_discount_valid_until,
          imageUrl: tourImage || tour.image_url || '/images/default-tour.jpg',
          duration: Math.ceil((new Date(tour.end_date) - new Date(tour.start_date)) / (1000 * 60 * 60 * 24)),
          hasDiscount: hasDiscount
        };
      });

      res.json({
        success: true,
        type: 'tours',
        results: formattedTours
      });
    }
    catch(error) {
      console.error('Ошибка при поиске туров:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при поиске туров'
      });
    }
  }

  async searchFlights(req, res) {
    try {
      const { departureCity, arrivalCity, date, maxPrice } = req.query;
      const userId = req.user?.id;
      let query = `
        SELECT 
          f.*, 
          fi.image_url,
          d.discount_percent as discount_percent,
          d.is_active as discount_active,
          d.start_date as discount_start_date,
          d.end_date as discount_end_date,
          po.discount_percent as personal_discount_percent,
          po.valid_until as personal_discount_valid_until,
          CASE
              WHEN po.discount_percent IS NOT NULL AND po.valid_until >= CURDATE()
                  THEN ROUND(f.price * (1 - po.discount_percent / 100), 2)
              WHEN d.discount_percent IS NOT NULL AND d.is_active = TRUE
                  AND (d.start_date IS NULL OR d.start_date <= CURDATE())
                  AND (d.end_date IS NULL OR d.end_date >= CURDATE())
                  THEN ROUND(f.price * (1 - d.discount_percent / 100), 2)
              ELSE f.price
          END as final_price,
          CASE
              WHEN po.discount_percent IS NOT NULL AND po.valid_until >= CURDATE()
                  THEN f.price
              WHEN d.discount_percent IS NOT NULL AND d.is_active = TRUE
                  AND (d.start_date IS NULL OR d.start_date <= CURDATE())
                  AND (d.end_date IS NULL OR d.end_date >= CURDATE())
                  THEN f.price
              ELSE NULL
          END as original_price,
          CASE
              WHEN po.discount_percent IS NOT NULL AND po.valid_until >= CURDATE()
                  THEN 'personal'
              WHEN d.discount_percent IS NOT NULL AND d.is_active = TRUE
                  AND (d.start_date IS NULL OR d.start_date <= CURDATE())
                  AND (d.end_date IS NULL OR d.end_date >= CURDATE())
                  THEN 'general'
              ELSE NULL
          END as discount_type,
          COALESCE(po.discount_percent, d.discount_percent) as applied_discount_percent
        FROM flights f 
        LEFT JOIN flight_images fi ON f.id = fi.flight_id
        LEFT JOIN discounts d ON (
            (d.flight_id = f.id OR d.airline = f.airline)
            AND d.is_active = TRUE 
            AND (d.start_date IS NULL OR d.start_date <= CURDATE())
            AND (d.end_date IS NULL OR d.end_date >= CURDATE())
        )
        LEFT JOIN personalized_offers po ON (
            (po.flight_id = f.id OR (po.tour_id IS NULL AND po.flight_id IS NULL))
            AND po.valid_until >= CURDATE()
            ${userId ? 'AND po.user_id = ?' : ''}
        )
        WHERE f.available = TRUE
      `;

      const params = [];
      if (userId) {
        params.push(userId);
      }

      if (departureCity) {
        query += ` AND f.departure_city LIKE ?`;
        params.push(`%${departureCity}%`);
      }

      if (arrivalCity) {
        query += ` AND f.arrival_city LIKE ?`;
        params.push(`%${arrivalCity}%`);
      }

      if (date) {
        query += ` AND DATE(f.departure_time) = ?`;
        params.push(date);
      }

      if (maxPrice) {
        query += ` AND f.price <= ?`;
        params.push(parseFloat(maxPrice));
      }

      query += ` ORDER BY final_price ASC, f.departure_time ASC`;
      const [flights] = await pool.execute(query, params);
      const formattedFlights = flights.map(flight => {
        const flightImage = SearchController.convertImagePathToUrl(flight.image_url, 'flights');
        const hasDiscount = flight.original_price !== null;
        const isPersonalDiscount = flight.discount_type === 'personal';
        const discountPercent = isPersonalDiscount ? flight.personal_discount_percent : flight.discount_percent;

        return {
          id: flight.id,
          airline: flight.airline,
          flightNumber: flight.flight_number,
          departureCity: flight.departure_city,
          arrivalCity: flight.arrival_city,
          departureTime: flight.departure_time,
          arrivalTime: flight.arrival_time,
          price: flight.final_price,
          originalPrice: flight.original_price,
          discountPercent: discountPercent,
          discountType: flight.discount_type,
          isPersonalOffer: isPersonalDiscount,
          personalDiscountValidUntil: flight.personal_discount_valid_until,
          imageUrl: flightImage || flight.image_url || '/images/default-flight.jpg',
          duration: Math.ceil((new Date(flight.arrival_time) - new Date(flight.departure_time)) / (1000 * 60 * 60)),
          hasDiscount: hasDiscount,
          appliedDiscountPercent: flight.applied_discount_percent
        };
      });

      res.json({
        success: true,
        type: 'flights',
        results: formattedFlights
      });
    }
    catch(error) {
      console.error('Ошибка при поиске авиабилетов:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при поиске авиабилетов'
      });
    }
  }
  async getUserPersonalOffers(req, res) {
    try {
      const userId = req.user.id;

      const [offers] = await pool.execute(
        `
        SELECT 
          po.*,
          t.id as tour_id,
          t.title as tour_title,
          t.country as tour_country,
          t.city as tour_city,
          t.price as tour_price,
          f.id as flight_id,
          f.airline as flight_airline,
          f.flight_number as flight_number,
          f.departure_city as flight_departure_city,
          f.arrival_city as flight_arrival_city,
          f.price as flight_price,
          CASE 
            WHEN po.tour_id IS NOT NULL THEN 'tour'
            WHEN po.flight_id IS NOT NULL THEN 'flight'
            ELSE 'general'
          END as offer_type
        FROM personalized_offers po
        LEFT JOIN tours t ON po.tour_id = t.id
        LEFT JOIN flights f ON po.flight_id = f.id
        WHERE po.user_id = ? AND po.valid_until >= CURDATE()
        ORDER BY po.created_at DESC
        `,
        [userId]
      );

      const formattedOffers = offers.map(offer => {
        const baseData = {
          id: offer.id,
          discountPercent: offer.discount_percent,
          validUntil: offer.valid_until,
          description: offer.description,
          createdAt: offer.created_at,
          offerType: offer.offer_type
        };

        if (offer.tour_id) {
          return {
            ...baseData,
            type: 'tour',
            tour: {
              id: offer.tour_id,
              title: offer.tour_title,
              country: offer.tour_country,
              city: offer.tour_city,
              price: offer.tour_price
            }
          };
        } else if (offer.flight_id) {
          return {
            ...baseData,
            type: 'flight',
            flight: {
              id: offer.flight_id,
              airline: offer.flight_airline,
              flightNumber: offer.flight_number,
              departureCity: offer.flight_departure_city,
              arrivalCity: offer.flight_arrival_city,
              price: offer.flight_price
            }
          };
        } else {
          return {
            ...baseData,
            type: 'general'
          };
        }
      });

      res.json({
        success: true,
        offers: formattedOffers
      });
    } catch (error) {
      console.error('Ошибка при получении персонализированных предложений:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении персонализированных предложений'
      });
    }
  }

  static convertImagePathToUrl(filePath, type) {
    if (!filePath) {
      return type === 'tours' ? '/images/default-tour.jpg' : '/images/default-flight.jpg';
    }
    try {
      if (filePath.startsWith('http') || filePath.startsWith('/')) {
        return filePath;
      }
      if (filePath.startsWith('flight-') || filePath.startsWith('tour-')) {
        const folder = type === 'tours' ? 'tours' : 'flights';
        return `/uploads/${folder}/${filePath}`;
      }
      const normalizedPath = filePath.replace(/\\\\/g, '\\');
      const pathParts = normalizedPath.split(/[\\\/]/);
      const toursIndex = pathParts.indexOf('Tours');
      const flightIndex = pathParts.indexOf('Flight');
      const picturesIndex = pathParts.indexOf('Pictures');
      const uploadsIndex = pathParts.indexOf('uploads');
      if (toursIndex !== -1 && pathParts.length > toursIndex + 2) {
        const tourName = pathParts[toursIndex + 1];
        const fileName = pathParts[pathParts.length - 1];
        return `/images/tours/${tourName}/${fileName}`;
      }
      else if (flightIndex !== -1 && pathParts.length > flightIndex + 1) {
        const fileName = pathParts[pathParts.length - 1];
        return `/images/Flight/${fileName}`;
      }
      else if (flightIndex !== -1 && pathParts.length > flightIndex + 2) {
        const flightId = pathParts[flightIndex + 1];
        const fileName = pathParts[pathParts.length - 1];
        return `/images/Flight/${flightId}/${fileName}`;
      }
      else if (picturesIndex !== -1 && pathParts.length > picturesIndex + 1) {
        const relativeParts = pathParts.slice(picturesIndex + 1);
        return `/images/${relativeParts.join('/')}`;
      }
      else if (uploadsIndex !== -1 && pathParts.length > uploadsIndex + 1) {
        const relativeParts = pathParts.slice(uploadsIndex);
        return `/${relativeParts.join('/')}`;
      }
      const fileName = filePath.split(/[\\\/]/).pop();
      if (fileName) {
        const folder = type === 'tours' ? 'tours' : 'flights';
        if (fileName.startsWith('tour-')) {
          return `/uploads/tours/${fileName}`;
        } else if (fileName.startsWith('flight-')) {
          return `/uploads/flights/${fileName}`;
        } else {
          return `/uploads/${folder}/${fileName}`;
        }
      }
      return type === 'tours' ? '/images/default-tour.jpg' : '/images/default-flight.jpg';
    } catch (error) {
      console.error('Ошибка преобразования пути:', error);
      return type === 'tours' ? '/images/default-tour.jpg' : '/images/default-flight.jpg';
    }
  }

  async addToFavorites(req, res) {
    try {
      const { tourId, flightId } = req.body;
      const userId = req.user.id;

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
    }
    catch(error) {
      console.error('Ошибка при добавлении в избранное:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при добавлении в избранное'
      });
    }
  }
}

module.exports = new SearchController();