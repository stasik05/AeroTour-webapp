const pool = require('../config/database');
class ManagerFlightController
{
  async getAllFlights(req,res)
  {
    try
    {
      const [flights] = await pool.execute
      (
        `
          SELECT f.*,
          fi.image_url as main_image
          FROM flights f 
          LEFT JOIN flight_images fi ON f.id = fi.flight_id
          ORDER BY f.id DESC
        `
      );
      const formattedFlights = flights.map(flight => ({
        id: flight.id,
        airline: flight.airline,
        flightNumber: flight.flight_number,
        departureCity: flight.departure_city,
        arrivalCity: flight.arrival_city,
        departureTime: ManagerFlightController.formatDateTime(flight.departure_time),
        arrivalTime: ManagerFlightController.formatDateTime(flight.arrival_time),
        price: ManagerFlightController.formatPrice(flight.price),
        available: flight.available,
        aircraftType: flight.aircraft_type,
        totalSeats: flight.total_seats,
        baggagePrice: ManagerFlightController.formatPrice(flight.baggage_price),
        mainImage: ManagerFlightController.convertImagePathToUrl(flight.main_image, 'flights'),
        route: `${flight.departure_city} → ${flight.arrival_city}`,
        duration: ManagerFlightController.calculateDuration(flight.departure_time, flight.arrival_time)
      }));
      res.json(
        {
          success: true,
          flights:formattedFlights
        });
    }
    catch(error)
    {
      console.error('Ошибка получения туров:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка сервера при получении туров'
      });
    }
  }
  async getFlightDetails(req,res)
  {
    try
    {
      const flightId = req.params.id;
      const [flights] = await pool.execute
      (
        `
        SELECT * FROM flights WHERE id = ?
        `,[flightId]
      );
      if(flights.length ===0)
      {
        return res.status(404).json({
          success: false,
          error: 'Авиабилет не найден'
        });
      }
      const flight = flights[0];
      const [images] = await pool.execute
      (
        `
          SELECT * FROM flight_images
          WHERE flight_id = ?
        `,[flight.id]
      );
      const formattedImages = images.map(img =>(
        {
          id:img.id,
          url:ManagerFlightController.convertImagePathToUrl(img.image_url,'flights')
        }));
      const flightDetails =
        {
          id: flight.id,
          airline: flight.airline,
          flightNumber: flight.flight_number,
          departureCity: flight.departure_city,
          arrivalCity: flight.arrival_city,
          departureTime: ManagerFlightController.formatDateTimeForInput(flight.departure_time),
          arrivalTime:ManagerFlightController.formatDateTimeForInput(flight.arrival_time),
          price: parseFloat(flight.price),
          available:flight.available,
          aircraftType:flight.aircraft_type,
          totalSeats:flight.total_seats,
          baggagePrice:parseFloat(flight.baggage_price),
          images:formattedImages,
          route: `${flight.departure_city} → ${flight.arrival_city}`,
          duration: ManagerFlightController.calculateDuration(flight.departure_time, flight.arrival_time)
        };
      res.json({
        success: true,
        flight:flightDetails
      });
    }
    catch (error)
    {
      console.error('Ошибка получения деталей тура:', error);
      res.status(500).json
      ({
        success: false,
        error: 'Ошибка сервера при получении деталей тура'
      });
    }
  }
  async addFlight(req,res)
  {
    try
    {
      const {
          airline,
        flight_number,
        departure_city,
        arrival_city,
        departure_time,
        arrival_time,
        price,
        aircraft_type,
        total_seats,
        baggage_price,
        available
        } = req.body;
      if (!airline || !flight_number || !departure_city || !arrival_city || !departure_time || !arrival_time || !price) {
        return res.status(400).json({
          success: false,
          error: 'Все обязательные поля должны быть заполнены'
        });
      }
      const connection = await pool.getConnection();
      try
      {
        await connection.beginTransaction();
        const [result] = await connection.execute
        (
          `INSERT INTO flights 
        (airline, flight_number, departure_city, arrival_city, departure_time, arrival_time, price, aircraft_type, total_seats, baggage_price, available) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            airline,
            flight_number,
            departure_city,
            arrival_city,
            departure_time,
            arrival_time,
            parseFloat(price),
            aircraft_type || null,
            total_seats ? parseInt(total_seats) : null,
            baggage_price ? parseFloat(baggage_price) : 15,
            available === 'true'
          ]
        );
        const flightId = result.insertId;
        if (req.files && req.files.length > 0)
        {
          for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            await connection.execute(
              'INSERT INTO flight_images (flight_id, image_url) VALUES (?, ?)',
              [flightId, file.filename]
            );
          }
        }
        await connection.commit();
        connection.release();
        res.json({
          success: true,
          message: 'Перелет успешно добавлен',
          flightId: flightId
        });
      }
      catch(error)
      {
        await connection.rollback();
        connection.release();
        throw error;
      }
    }
    catch (error)
    {
      console.error('Ошибка добавления перелета:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при добавлении перелета'
      });
    }
  }
  async updateFlight(req,res)
  {
    try
    {
      const flightId = req.params.id;
      const
        {
          airline,
          flight_number,
          departure_city,
          arrival_city,
          departure_time,
          arrival_time,
          price,
          aircraft_type,
          total_seats,
          baggage_price,
          available
        } = req.body;
      const [existingFlights] = await pool.execute(
        'SELECT id FROM flights WHERE id = ?',
        [flightId]
      );
      if(existingFlights.length ===0)
      {
        return res.status(404).json({
          success: false,
          error: 'Перелет не найден'
        });
      }
      const connection = await pool.getConnection();
      try
      {
        await connection.beginTransaction();
        const updateQuery =
          `
             UPDATE flights SET 
            airline = ?, flight_number = ?, departure_city = ?, arrival_city = ?,
            departure_time = ?, arrival_time = ?, price = ?, 
            aircraft_type = ?, total_seats = ?, baggage_price = ?, available = ?
            WHERE id = ?
          `;
        const updateParams =
          [
          airline,
          flight_number,
          departure_city,
          arrival_city,
          departure_time,
          arrival_time,
          parseFloat(price),
          aircraft_type || null,
          total_seats ? parseInt(total_seats) : null,
          baggage_price ? parseFloat(baggage_price) : 15,
          available === 'true',
          flightId
        ];
        const [updateResult] = await connection.execute(updateQuery,updateParams);
        if (req.files && req.files.length > 0) {
          await connection.execute(
            'DELETE FROM flight_images WHERE flight_id = ?',
            [flightId]
          );
          for(let i =0;i<req.files.length;i++)
          {
            const file = req.files[i];
            await connection.execute(
              'INSERT INTO flight_images (flight_id,image_url) VALUES (?,?)',
              [flightId,file.filename]
            );
          }
        }
        await connection.commit();
        connection.release();
        res.json({
          success: true,
          message: 'Перелет успешно обновлен'
        });
      }
      catch (error)
      {
        await connection.rollback();
        connection.release();
        console.error('Ошибка в транзакции:', error);
        throw error;
      }
    }
    catch (error)
    {
      console.error('Ошибка обновления перелета:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при обновлении перелета: ' + error.message
      });
    }
  }
  async deleteFlight(req, res) {
    try {
      const flightId = req.params.id;
      const [existingFlights] = await pool.execute(
        'SELECT id FROM flights WHERE id = ?',
        [flightId]
      );
      if (existingFlights.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Перелет не найден'
        });
      }
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.execute(
          'DELETE FROM flights WHERE id = ?',
          [flightId]
        );
        await connection.commit();
        connection.release();
        res.json({
          success: true,
          message: 'Перелет успешно удален'
        });
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      console.error('Ошибка удаления перелета:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при удалении перелета'
      });
    }
  }
  async deleteFlightImage(req, res)
  {
    try
    {
      const imageId = req.params.imageId;
      await pool.execute(
        'DELETE FROM flight_images WHERE id = ?',
        [imageId]
      );
      res.json({
        success: true,
        message: 'Изображение успешно удалено'
      });
    }
    catch (error)
    {
      console.error('Ошибка удаления изображения:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при удалении изображения'
      });
    }
  }
  static formatDateTime(dateTimeString) {
    try
    {
      if (!dateTimeString) return 'Дата/время не указаны';
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime()))
      {
        return 'Дата/время не указаны';
      }
      return date.toLocaleString('ru-RU',
        {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    catch (error)
    {
      console.error('Ошибка форматирования даты/времени:', error);
      return 'Дата/время не указаны';
    }
  }
  static formatPrice(price)
  {
    try
    {
      if (!price) return '0 €';
      return new Intl.NumberFormat('ru-RU',
        {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(price);
    }
    catch (error)
    {
      return '0 €';
    }
  }
  static calculateDuration(departureTime, arrivalTime) {
    try
    {
      if (!departureTime || !arrivalTime) return '';
      const dep = new Date(departureTime);
      const arr = new Date(arrivalTime);
      if (isNaN(dep.getTime()) || isNaN(arr.getTime())) return '';
      const durationMs = arr - dep;
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}ч ${minutes}м`;
    }
    catch (error)
    {
      console.error('Ошибка расчета длительности:', error);
      return '';
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
  static formatDateTimeForInput(dateTimeString) {
    try
    {
      if (!dateTimeString) return '';
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime()))
      {
        return '';
      }
      const timezoneOffset = date.getTimezoneOffset() * 60000;
      const adjustedDate = new Date(date.getTime() - timezoneOffset);
      return adjustedDate.toISOString().slice(0, 16);
    }
    catch (error)
    {
      console.error('Ошибка форматирования даты/времени для input:', error);
      return '';
    }
  }
}
module.exports = new ManagerFlightController();