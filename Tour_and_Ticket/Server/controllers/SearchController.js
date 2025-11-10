const pool = require('../config/database');

class SearchController {
  async searchTours(req, res) {
    try {
      const { destination, startDate, endDate, duration, maxPrice } = req.query;
      let query = `
        SELECT t.*, ti.image_url
        FROM tours t 
        LEFT JOIN tour_images ti ON t.id = ti.tour_id AND ti.sort_order = 1
        WHERE t.available = TRUE
      `;
      const params = [];

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
        query += ` AND t.price <= ?`; // Исправлено: пробел перед AND
        params.push(parseFloat(maxPrice));
      }

      query += ` ORDER BY t.price ASC`;

      const [tours] = await pool.execute(query, params);

      const formattedTours = tours.map(tour => {
        const tourImage = SearchController.convertImagePathToUrl(tour.image_url, 'tours'); // Исправлено: используем статический метод
        return {
          id: tour.id,
          title: tour.title,
          description: tour.description,
          country: tour.country,
          city: tour.city,
          startDate: tour.start_date,
          endDate: tour.end_date,
          price: tour.price,
          imageUrl: tourImage || tour.image_url || '/images/default-tour.jpg',
          duration: Math.ceil((new Date(tour.end_date) - new Date(tour.start_date)) / (1000 * 60 * 60 * 24))
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
      let query = `
        SELECT f.*, fi.image_url
        FROM flights f 
        LEFT JOIN flight_images fi ON f.id = fi.flight_id
        WHERE f.available = TRUE
      `;
      const params = [];

      if (departureCity) {
        query += ` AND f.departure_city LIKE ?`;
        params.push(`%${departureCity}%`); // Исправлено: добавлен закрывающий %
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

      query += ` ORDER BY f.departure_time ASC`; // Исправлено: пробел перед ORDER BY

      const [flights] = await pool.execute(query, params);

      const formattedFlights = flights.map(flight => {
        const flightImage = SearchController.convertImagePathToUrl(flight.image_url, 'flights'); // Исправлено: используем статический метод
        return {
          id: flight.id,
          airline: flight.airline,
          flightNumber: flight.flight_number,
          departureCity: flight.departure_city,
          arrivalCity: flight.arrival_city,
          departureTime: flight.departure_time,
          arrivalTime: flight.arrival_time,
          price: flight.price,
          imageUrl: flightImage || flight.image_url || '/images/default-flight.jpg'
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

      console.log(`✅ Преобразовано в: ${webUrl}`);
      return webUrl;
    } catch (error) {
      console.error('❌ Ошибка преобразования пути:', error);
      return null;
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

      let checkQuery = `SELECT id FROM favorites WHERE user_id = ? AND `; // Исправлено: пробел после AND
      const checkParams = [userId];

      if (tourId) {
        checkQuery += ` tour_id = ?`; // Исправлено: пробел перед tour_id
        checkParams.push(tourId);
      } else {
        checkQuery += ` flight_id = ?`; // Исправлено: пробел перед flight_id
        checkParams.push(flightId);
      }

      const [existing] = await pool.execute(checkQuery, checkParams);

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Уже добавлено в избранное' // Исправлено: message вместо massage
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