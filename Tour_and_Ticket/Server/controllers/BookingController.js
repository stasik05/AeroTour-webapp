const pool = require('../config/database');

class BookingController {
  async getUserBookings(req, res) {
    try {
      const userId = req.user?.userId;
      console.log('Получение бронирований для UserID:', userId);
      if (!userId) {
        console.log('UserID не определен в getUserBookings');
        return res.status(400).json({
          success: false,
          error: 'UserID не определен'
        });
      }
      console.log('Выполнение SQL запроса для пользователя:', userId);
      const [bookings] = await pool.execute(
        `
        SELECT 
          b.id,
          b.booking_date,
          b.status,
          b.selected_seats,
          b.travelers_count,
          b.has_baggage,
          b.baggage_count,
          t.id as tour_id,
          t.title as tour_title,
          t.description as tour_description,
          t.country as tour_country,
          t.city as tour_city,
          t.start_date as tour_start_date,
          t.end_date as tour_end_date,
          t.price as tour_price,
          (SELECT ti.image_url FROM tour_images ti WHERE ti.tour_id = t.id ORDER BY ti.sort_order LIMIT 1) as tour_image,
          f.id as flight_id,
          f.airline,
          f.flight_number,
          f.departure_city,
          f.arrival_city,
          f.departure_time,
          f.arrival_time,
          f.price as flight_price,
          fi.image_url as flight_image
        FROM bookings b
        LEFT JOIN tours t ON b.tour_id = t.id
        LEFT JOIN flights f ON b.flight_id = f.id
        LEFT JOIN flight_images fi ON f.id = fi.flight_id
        WHERE b.user_id = ?
        ORDER BY b.booking_date DESC
        `,
        [userId]
      );
      console.log(`Найдено бронирований: ${bookings.length} шт.`);
      const formattedBookings = await Promise.all(
        bookings.map(async (booking) => {
          const [statusHistory] = await pool.execute(
            'SELECT changed_at FROM booking_history WHERE booking_id = ? ORDER BY changed_at DESC LIMIT 1',
            [booking.id]
          );
          const statusUpdatedAt = statusHistory.length > 0 ? statusHistory[0].changed_at : booking.booking_date;

          if (booking.tour_id) {
            const [tourImages] = await pool.execute(
              'SELECT image_url FROM tour_images WHERE tour_id = ? ORDER BY sort_order',
              [booking.tour_id]
            );
            const convertedImages = tourImages.map(img =>
              BookingController.convertImagePathToUrl(img.image_url, 'tours')
            );
            const mainImage = convertedImages[0] || '/shared/assets/images/default-tour.jpg';
            const shortDescription = BookingController.getFirstSentence(booking.tour_description);
            return {
              id: booking.id,
              type: 'tour',
              title: booking.tour_title,
              description: shortDescription,
              images: convertedImages,
              mainImage: mainImage,
              date: BookingController.formatNormalDate(booking.tour_start_date)+`→\n`+ BookingController.formatNormalDate(booking.tour_end_date),
              status: booking.status,
              price: BookingController.formatPrice(booking.tour_price),
              statusUpdatedAt: BookingController.formatNormalDate(statusUpdatedAt),
              details: {
                country: booking.tour_country,
                city: booking.tour_city,
                startDate: BookingController.formatNormalDate(booking.tour_start_date),
                endDate: BookingController.formatNormalDate(booking.tour_end_date),
                travelersCount: booking.travelers_count || 1
              },
              passengersInfo: `${booking.travelers_count || 1} ${BookingController.getPassengerWord(booking.travelers_count || 1)}`
            };
          } else if (booking.flight_id) {
            const flightImage = BookingController.convertImagePathToUrl(booking.flight_image, 'flights');
            const images = flightImage ? [flightImage] : [];
            const seatInfo = BookingController.formatSeatInfo(booking.selected_seats, booking.travelers_count);
            const passengersCount = booking.travelers_count || 1;
            return {
              id: booking.id,
              type: 'flight',
              title: `${booking.departure_city} - ${booking.arrival_city}`,
              description: `Рейс ${booking.airline} ${booking.flight_number}`,
              images: images,
              mainImage: flightImage || '/shared/assets/images/default-flight.jpg',
              date: BookingController.formatFlightDateTime(booking.departure_time),
              status: booking.status,
              price: BookingController.formatPrice(booking.flight_price),
              statusUpdatedAt: BookingController.formatNormalDate(statusUpdatedAt),
              details: {
                airline: booking.airline,
                flightNumber: booking.flight_number,
                departure: booking.departure_city,
                arrival: booking.arrival_city,
                departureTime: BookingController.formatDateTime(booking.departure_time),
                arrivalTime: BookingController.formatDateTime(booking.arrival_time),
                seatInfo: seatInfo,
                travelersCount: passengersCount,
                hasBaggage: booking.has_baggage || false,
                baggageCount: booking.baggage_count || 0
              },
              flightInfo: {
                departureTime: BookingController.formatTime(booking.departure_time),
                arrivalTime: BookingController.formatTime(booking.arrival_time),
                seats: seatInfo,
                passengers: `${passengersCount} ${BookingController.getPassengerWord(passengersCount)}`,
                baggage: booking.has_baggage ? `${booking.baggage_count || 0} багаж. мест` : 'Без багажа'
              }
            };
          } else {
            return {
              id: booking.id,
              type: 'unknown',
              title: 'Неизвестное бронирование',
              description: 'Информация о бронировании недоступна',
              images: [],
              mainImage: '/shared/assets/images/default-booking.jpg',
              date: BookingController.formatNormalDate(booking.booking_date),
              status: booking.status,
              statusUpdatedAt: BookingController.formatNormalDate(statusUpdatedAt),
              price: '0',
              details: {}
            };
          }
        })
      );
      console.log('Бронирования успешно обработаны');
      res.json({
        success: true,
        bookings: formattedBookings
      });
    } catch (error) {
      console.error('Ошибка получения бронирований:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка сервера при получении бронирований'
      });
    }
  }
  async getBookingDetails(req, res) {
    try {
      const bookingId = req.params.id;
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'UserID не определен'
        });
      }

      const [bookings] = await pool.execute(
        `
        SELECT 
          b.*,
          t.id as tour_id,
          t.title as tour_title,
          t.description as tour_description,
          t.country as tour_country,
          t.city as tour_city,
          t.start_date as tour_start_date,
          t.end_date as tour_end_date,
          t.price as tour_price,
          f.id as flight_id,
          f.airline as flight_airline,
          f.flight_number as flight_flight_number,
          f.departure_city as flight_departure_city,
          f.arrival_city as flight_arrival_city,
          f.departure_time as flight_departure_time,
          f.arrival_time as flight_arrival_time,
          f.price as flight_price
        FROM bookings b
        LEFT JOIN tours t ON b.tour_id = t.id
        LEFT JOIN flights f ON b.flight_id = f.id
        WHERE b.id = ? AND b.user_id = ?
        `,
        [bookingId, userId]
      );

      if (bookings.length === 0) {
        console.log('Бронирование не найдено');
        return res.status(404).json({
          success: false,
          error: 'Бронирование не найдено'
        });
      }

      const booking = bookings[0];
      const passengersCount = booking.travelers_count || 1;
      const [statusHistory] = await pool.execute(
        'SELECT changed_at FROM booking_history WHERE booking_id = ? ORDER BY changed_at DESC LIMIT 1',
        [bookingId]
      );
      const statusUpdatedAt = statusHistory.length > 0 ? statusHistory[0].changed_at : booking.booking_date;
      const bookingDetails = {
        id: booking.id,
        bookingDate: BookingController.formatNormalDate(booking.booking_date),
        status: booking.status,
        type: booking.tour_id ? 'tour' : 'flight',
        travelersCount: passengersCount,
        hasBaggage: booking.has_baggage || false,
        baggageCount: booking.baggage_count || 0,
        passengersInfo: `${passengersCount} ${BookingController.getPassengerWord(passengersCount)}`,
        statusUpdatedAt: BookingController.formatNormalDate(statusUpdatedAt)
      };
      if (booking.tour_id) {
        const [tourImages] = await pool.execute(
          'SELECT image_url FROM tour_images WHERE tour_id = ? ORDER BY sort_order',
          [booking.tour_id]
        );
        const convertedImages = tourImages.map(img =>
          BookingController.convertImagePathToUrl(img.image_url, 'tours')
        );
        const shortDescription = BookingController.getFirstSentence(booking.tour_description);
        bookingDetails.tour = {
          id: booking.tour_id,
          title: booking.tour_title,
          description: shortDescription,
          fullDescription: booking.tour_description,
          country: booking.tour_country,
          city: booking.tour_city,
          startDate: BookingController.formatNormalDate(booking.tour_start_date),
          endDate: BookingController.formatNormalDate(booking.tour_end_date),
          price: booking.tour_price,
          images: convertedImages
        };
      } else if (booking.flight_id) {
        const [flightImages] = await pool.execute(
          'SELECT image_url FROM flight_images WHERE flight_id = ?',
          [booking.flight_id]
        );
        const convertedImages = flightImages.map(img =>
          BookingController.convertImagePathToUrl(img.image_url, 'flights')
        );
        const seatInfo = BookingController.formatSeatInfo(booking.selected_seats, passengersCount);
        bookingDetails.flight = {
          id: booking.flight_id,
          airline: booking.flight_airline,
          flightNumber: booking.flight_flight_number,
          departureCity: booking.flight_departure_city,
          arrivalCity: booking.flight_arrival_city,
          departureTime: BookingController.formatDateTime(booking.flight_departure_time),
          arrivalTime: BookingController.formatDateTime(booking.flight_arrival_time),
          departureTimeOnly: BookingController.formatTime(booking.flight_departure_time),
          arrivalTimeOnly: BookingController.formatTime(booking.flight_arrival_time),
          price: booking.flight_price,
          images: convertedImages,
          seatInfo: seatInfo,
          seats: seatInfo,
          baggageInfo: booking.has_baggage ? `${booking.baggage_count || 0} багаж. мест` : 'Без багажа',
          detailedSeats: BookingController.getDetailedSeatInfo(booking.selected_seats)
        };
      }
      const [history] = await pool.execute(
        `
        SELECT status, changed_at 
        FROM booking_history 
        WHERE booking_id = ? 
        ORDER BY changed_at DESC
        `,
        [bookingId]
      );
      bookingDetails.history = history.map(item => ({
        status: item.status,
        changed_at: BookingController.formatNormalDate(item.changed_at)
      }));
      console.log('Детали бронирования загружены');
      res.json({
        success: true,
        booking: bookingDetails
      });

    } catch (error) {
      console.error('Ошибка получения деталей бронирования:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка сервера'
      });
    }
  }
  async cancelBooking(req, res) {
    try {
      const bookingId = req.params.id;
      const userId = req.user?.userId;

      console.log('Отмена бронирования:', { bookingId, userId });

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'UserID не определен'
        });
      }
      const [bookings] = await pool.execute(
        'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
        [bookingId, userId]
      );
      if (bookings.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Бронирование не найдено'
        });
      }
      const booking = bookings[0];
      if (booking.status === 'Отменено') {
        return res.status(400).json({
          success: false,
          error: 'Бронирование уже отменено'
        });
      }
      if (booking.status === 'Завершено') {
        return res.status(400).json({
          success: false,
          error: 'Нельзя отменить завершенное бронирование'
        });
      }
      await pool.execute(
        'UPDATE bookings SET status = "Отменено" WHERE id = ?',
        [bookingId]
      );
      await pool.execute(
        'INSERT INTO booking_history (booking_id, status) VALUES (?, "Отменено")',
        [bookingId]
      );
      console.log('Бронирование успешно отменено');
      res.json({
        success: true,
        message: 'Бронирование успешно отменено'
      });
    } catch (error) {
      console.error('Ошибка отмены бронирования:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка сервера при отмене бронирования'
      });
    }
  }
  static formatNormalDate(dateString) {
    try {
      if (!dateString) return 'Дата не указана';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.log('Invalid date:', dateString);
        return 'Дата не указана';
      }
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Ошибка форматирования даты:', error);
      return 'Дата не указана';
    }
  }
  static formatDateTime(dateTimeString) {
    try {
      if (!dateTimeString) return 'Дата не указана';
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) {
        console.log('Invalid date time:', dateTimeString);
        return 'Дата не указана';
      }
      return date.toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Ошибка форматирования даты и времени:', error);
      return 'Дата не указана';
    }
  }
  static formatTime(dateTimeString) {
    try {
      if (!dateTimeString) return 'Время не указано';
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) {
        return 'Время не указано';
      }
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Время не указано';
    }
  }
  static formatFlightDateTime(departureTime) {
    try {
      if (!departureTime) return 'Дата не указана';
      return BookingController.formatDateTime(departureTime);
    } catch (error) {
      return 'Дата не указана';
    }
  }
  static getPassengerWord(count) {
    if (count % 10 === 1 && count % 100 !== 11) {
      return 'пассажир';
    } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
      return 'пассажира';
    } else {
      return 'пассажиров';
    }
  }
  static formatSeatInfo(selectedSeats, travelersCount) {
    try {
      console.log('🔍 formatSeatInfo input:', {
        selectedSeats,
        travelersCount,
        type: typeof selectedSeats
      });
      if (!selectedSeats) {
        return travelersCount > 1 ? `${travelersCount} мест` : 'Место не выбрано';
      }
      let seats = null;
      if (typeof selectedSeats === 'string') {
        if (selectedSeats.startsWith("['") && selectedSeats.endsWith("']")) {
          const match = selectedSeats.match(/\['([^']*)'\]/);
          if (match && match[1]) {
            seats = [match[1]];
          }
        }
        else if (selectedSeats.startsWith('[') && selectedSeats.endsWith(']')) {
          try {
            seats = JSON.parse(selectedSeats);
          } catch (parseError) {
            console.warn('Ошибка парсинга JSON в formatSeatInfo:', parseError);
            const match = selectedSeats.match(/\["([^"]*)"\]/);
            if (match && match[1]) {
              seats = [match[1]];
            } else {
              seats = [selectedSeats.trim()];
            }
          }
        }
        else {
          seats = [selectedSeats.trim()];
        }
      }
      else if (Array.isArray(selectedSeats)) {
        seats = selectedSeats;
      }
      console.log('Обработанные места в formatSeatInfo:', seats);
      if (seats && seats.length > 0) {
        if (seats.length === 1) {
          return `Место ${seats[0]}`;
        } else {
          return `${seats.length} места: ${seats.join(', ')}`;
        }
      } else {
        return travelersCount > 1 ? `${travelersCount} мест` : 'Место не выбрано';
      }
    } catch (error) {
      console.error('Ошибка в formatSeatInfo:', error);
      return travelersCount > 1 ? `${travelersCount} мест` : 'Место не выбрано';
    }
  }
  static getDetailedSeatInfo(selectedSeats) {
    try {
      console.log('🔍 getDetailedSeatInfo input:', {
        selectedSeats,
        type: typeof selectedSeats
      });
      if (!selectedSeats) return null;
      let seats = null;
      if (typeof selectedSeats === 'string') {
        if (selectedSeats.startsWith("['") && selectedSeats.endsWith("']")) {
          const match = selectedSeats.match(/\['([^']*)'\]/);
          if (match && match[1]) {
            seats = [match[1]];
          }
        }
        else if (selectedSeats.startsWith('[') && selectedSeats.endsWith(']')) {
          try {
            seats = JSON.parse(selectedSeats);
          } catch (parseError) {
            console.warn('⚠️ Ошибка парсинга JSON в getDetailedSeatInfo:', parseError);
            const match = selectedSeats.match(/\["([^"]*)"\]/);
            if (match && match[1]) {
              seats = [match[1]];
            } else {
              seats = [selectedSeats.trim()];
            }
          }
        }
        else {
          seats = [selectedSeats.trim()];
        }
      }
      else if (Array.isArray(selectedSeats)) {
        seats = selectedSeats;
      }
      console.log('Обработанные места в getDetailedSeatInfo:', seats);
      if (!seats || seats.length === 0) return null;
      return seats.map(seat => {
        const match = seat.match(/(\d+)([A-Z])?/);
        if (match) {
          const row = match[1];
          const letter = match[2] || '';
          return {
            full: seat,
            row: row,
            letter: letter,
            display: `Ряд ${row}${letter ? ` Место ${letter}` : ''}`
          };
        }
        return { full: seat, display: seat };
      });

    } catch (error) {
      console.error('Ошибка в getDetailedSeatInfo:', error);
      return null;
    }
  }
  static getFirstSentence(description) {
    if (!description) return 'Описание отсутствует';
    const cleanDescription = description.trim();
    const sentenceEnd = cleanDescription.match(/[.!?]/);
    if (sentenceEnd) {
      return cleanDescription.substring(0, sentenceEnd.index + 1);
    }
    return cleanDescription.length > 100
      ? cleanDescription.substring(0, 100) + '...'
      : cleanDescription;
  }
  static formatPrice(price) {
    try {
      if (!price) return '0 €';
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(price);
    } catch (error) {
      return '0 €';
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

      return webUrl || (type === 'tours' ? '/images/default-tour.jpg' : '/images/default-flight.jpg');
    } catch (error) {
      console.error('❌ Ошибка преобразования пути:', error);
      return type === 'tours' ? '/images/default-tour.jpg' : '/images/default-flight.jpg';
    }
  }
}

module.exports = new BookingController();