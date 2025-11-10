const pool = require('../config/database');

class CalendarController {
  async getUserBookings(req, res) {
    try {
      const userId = req.user.userId;
      const query = `
          SELECT
              b.id,
              b.booking_date,
              b.status,
              b.travelers_count,
              b.total_price,
              b.transportation_type,
              b.departure_city,
              b.selected_seats,
              b.has_baggage,
              b.baggage_count,
              t.title as tour_title,
              t.description as tour_description,
              t.country as tour_country,
              t.city as tour_city,
              t.start_date as tour_start_date,
              t.end_date as tour_end_date,
              t.price as tour_price,
              f.airline,
              f.flight_number,
              f.departure_city as flight_departure_city,
              f.arrival_city as flight_arrival_city,
              f.departure_time,
              f.arrival_time,
              f.price as flight_price,
              f.aircraft_type,
              f.baggage_price,
              CASE
                  WHEN t.id IS NOT NULL THEN 'tour'
                  WHEN f.id IS NOT NULL THEN 'flight'
                  ELSE 'other'
                  END as trip_type,
              CASE
                  WHEN t.id IS NOT NULL THEN t.start_date
                  WHEN f.id IS NOT NULL THEN DATE(f.departure_time)
          END as start_date,
          CASE 
            WHEN t.id IS NOT NULL THEN t.end_date
            WHEN f.id IS NOT NULL THEN DATE(f.arrival_time)
          END as end_date
        FROM bookings b
        LEFT JOIN tours t ON b.tour_id = t.id
        LEFT JOIN flights f ON b.flight_id = f.id
        WHERE b.user_id = ?
          AND (b.tour_id IS NOT NULL OR b.flight_id IS NOT NULL)
          AND b.status != 'Отменено'
        ORDER BY start_date ASC
      `;

      const [bookings] = await pool.execute(query, [userId]);

      console.log('Найдено бронирований:', bookings.length);

      const formattedBookings = bookings.map(booking => {
        if (booking.trip_type === 'tour') {
          return {
            id: booking.id,
            title: booking.tour_title,
            description: booking.tour_description,
            country: booking.tour_country,
            city: booking.tour_city,
            startDate: booking.start_date,
            endDate: booking.end_date,
            status: booking.status,
            travelersCount: booking.travelers_count,
            totalPrice: booking.total_price,
            tripType: booking.trip_type,
            bookingDate: booking.booking_date
          };
        }
        else if (booking.trip_type === 'flight') {
          return {
            id: booking.id,
            title: `Рейс ${booking.flight_number}`,
            description: `${booking.airline} - ${booking.flight_departure_city} → ${booking.flight_arrival_city}`,
            country: booking.flight_arrival_city,
            city: booking.flight_arrival_city,
            airline: booking.airline,
            flightNumber: booking.flight_number,
            departureCity: booking.flight_departure_city,
            arrivalCity: booking.flight_arrival_city,
            startDate: booking.start_date,
            endDate: booking.end_date,
            status: booking.status,
            travelersCount: booking.travelers_count,
            totalPrice: booking.total_price,
            tripType: booking.trip_type,
            bookingDate: booking.booking_date,
            departureTime: booking.departure_time,
            arrivalTime: booking.arrival_time,
            selectedSeats: booking.selected_seats,
            hasBaggage: booking.has_baggage
          };
        }
      }).filter(booking => booking !== undefined);
      console.log('✅ Отформатировано бронирований:', formattedBookings.length);
      res.json({
        success: true,
        bookings: formattedBookings
      });
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при загрузке данных календаря'
      });
    }
  }
  async getTripDetails(req, res) {
    try {
      const userId = req.user.userId;
      const { bookingId } = req.params;
      console.log(`🔍 Запрос деталей бронирования: ${bookingId} для пользователя: ${userId}`);
      const query = `
      SELECT
        b.id,
        b.booking_date,
        b.status,
        b.travelers_count,
        b.total_price,
        b.transportation_type,
        b.departure_city,
        b.selected_seats,
        b.has_baggage,
        b.baggage_count,
        t.title as tour_title,
        t.description as tour_description,
        t.country as tour_country,
        t.city as tour_city,
        t.start_date as tour_start_date,
        t.end_date as tour_end_date,
        t.price as tour_price,
        f.airline,
        f.flight_number,
        f.departure_city as flight_departure_city,
        f.arrival_city as flight_arrival_city,
        f.departure_time,
        f.arrival_time,
        f.price as flight_price,
        f.aircraft_type,
        f.baggage_price,
        CASE 
          WHEN t.id IS NOT NULL THEN 'tour'
          WHEN f.id IS NOT NULL THEN 'flight'
          ELSE 'other'
        END as trip_type
      FROM bookings b
      LEFT JOIN tours t ON b.tour_id = t.id
      LEFT JOIN flights f ON b.flight_id = f.id
      WHERE b.id = ? AND b.user_id = ?
    `;
      const [bookings] = await pool.execute(query, [bookingId, userId]);
      if (bookings.length === 0) {
        console.log(` Бронирование не найдено: ${bookingId}`);
        return res.status(404).json({
          success: false,
          message: 'Бронирование не найдено'
        });
      }

      const booking = bookings[0];
      console.log(`Найдено бронирование:`, {
        id: booking.id,
        type: booking.trip_type,
        title: booking.trip_type === 'tour' ? booking.tour_title : `Рейс ${booking.flight_number}`,
        selected_seats_raw: booking.selected_seats,
        selected_seats_type: typeof booking.selected_seats
      });
      let tripDetails;
      if (booking.trip_type === 'tour') {
        tripDetails = {
          id: booking.id,
          type: 'tour',
          title: booking.tour_title,
          description: booking.tour_description,
          status: booking.status,
          dates: {
            start: booking.tour_start_date,
            end: booking.tour_end_date
          },
          location: {
            country: booking.tour_country,
            city: booking.tour_city
          },
          travelers: {
            count: booking.travelers_count
          },
          transportation: booking.transportation_type,
          price: {
            total: booking.total_price,
            tour: booking.tour_price
          }
        };
      } else if (booking.trip_type === 'flight') {
        let selectedSeats = null;
        try {
          if (booking.selected_seats) {
            console.log(`🔍 Обработка selected_seats:`, {
              raw: booking.selected_seats,
              type: typeof booking.selected_seats
            });
            if (typeof booking.selected_seats === 'string') {
              if (booking.selected_seats.startsWith('[') && booking.selected_seats.endsWith(']')) {
                selectedSeats = JSON.parse(booking.selected_seats);
              } else {
                selectedSeats = [booking.selected_seats.trim()];
              }
            }
            else if (Array.isArray(booking.selected_seats)) {
              selectedSeats = booking.selected_seats;
            }
            else if (!booking.selected_seats) {
              selectedSeats = null;
            }
            console.log(`Обработанные selected_seats:`, selectedSeats);
          }
        } catch (error) {
          console.warn(`Ошибка парсинга selected_seats:`, error);
          console.log(`🔍 Проблемные данные selected_seats:`, booking.selected_seats);
          if (typeof booking.selected_seats === 'string') {
            const cleaned = booking.selected_seats.replace(/[\[\]"]/g, '');
            selectedSeats = cleaned.split(',').map(seat => seat.trim()).filter(seat => seat);
          } else {
            selectedSeats = null;
          }
          console.log(`Fallback selected_seats:`, selectedSeats);
        }
        tripDetails = {
          id: booking.id,
          type: 'flight',
          title: `Рейс ${booking.flight_number}`,
          description: `${booking.airline} - ${booking.flight_departure_city} → ${booking.flight_arrival_city}`,
          status: booking.status,
          dates: {
            start: CalendarController.formatDate(booking.departure_time),
            end: CalendarController.formatDate(booking.arrival_time)
          },
          location: {
            departureCity: booking.flight_departure_city,
            arrivalCity: booking.flight_arrival_city
          },
          airline: booking.airline,
          flightNumber: booking.flight_number,
          travelers: {
            count: booking.travelers_count,
            seats: selectedSeats
          },
          transportation: booking.transportation_type,
          baggage: {
            included: booking.has_baggage,
            count: booking.baggage_count,
            price: booking.baggage_price
          },
          price: {
            total: booking.total_price,
            flight: booking.flight_price
          },
          aircraft: booking.aircraft_type,
          times: {
            departure: booking.departure_time,
            arrival: booking.arrival_time
          }
        };
      } else {
        tripDetails = {
          id: booking.id,
          type: 'other',
          title: 'Поездка',
          status: booking.status,
          dates: {
            start: booking.tour_start_date || CalendarController.formatDate(booking.departure_time),
            end: booking.tour_end_date || CalendarController.formatDate(booking.arrival_time)
          },
          travelers: {
            count: booking.travelers_count
          },
          price: {
            total: booking.total_price
          }
        };
      }
      console.log(`Отправка деталей поездки:`, {
        id: tripDetails.id,
        type: tripDetails.type,
        title: tripDetails.title,
        seats: tripDetails.travelers?.seats
      });
      res.json({
        success: true,
        trip: tripDetails
      });
    } catch (error) {
      console.error('❌ Ошибка загрузки деталей поездки:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при загрузке информации о поездке'
      });
    }
  }
  async exportToICal(req, res) {
    try {
      const userId = req.user.userId;
      const query = `
        SELECT
          b.id,
          b.status,
          b.travelers_count,
          b.total_price,
          t.title as tour_title,
          t.description as tour_description,
          t.country as tour_country,
          t.city as tour_city,
          t.start_date as tour_start_date,
          t.end_date as tour_end_date,
          f.airline,
          f.flight_number,
          f.departure_city,
          f.arrival_city,
          f.departure_time,
          f.arrival_time,
          CASE 
            WHEN t.id IS NOT NULL THEN 'tour'
            WHEN f.id IS NOT NULL THEN 'flight'
            ELSE 'other'
          END as trip_type,
          CASE 
            WHEN t.id IS NOT NULL THEN t.start_date
            WHEN f.id IS NOT NULL THEN DATE(f.departure_time)
          END as start_date,
          CASE 
            WHEN t.id IS NOT NULL THEN t.end_date
            WHEN f.id IS NOT NULL THEN DATE(f.arrival_time)
          END as end_date
        FROM bookings b
        LEFT JOIN tours t ON b.tour_id = t.id
        LEFT JOIN flights f ON b.flight_id = f.id
        WHERE b.user_id = ?
          AND (b.tour_id IS NOT NULL OR b.flight_id IS NOT NULL)
          AND b.status != 'Отменено'
        ORDER BY start_date ASC
      `;
      const [bookings] = await pool.execute(query, [userId]);
      let icalContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//AeroTour//Calendar//RU',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
      ];
      bookings.forEach(booking => {
        const startDate = CalendarController.formatICalDate(booking.start_date);
        const endDate = CalendarController.formatICalDate(booking.end_date);
        const title = booking.trip_type === 'tour'
          ? booking.tour_title
          : `Рейс ${booking.flight_number}`;
        const description = booking.trip_type === 'tour'
          ? booking.tour_description
          : `${booking.airline} - ${booking.departure_city} → ${booking.arrival_city}`;
        icalContent.push(
          'BEGIN:VEVENT',
          `UID:${booking.id}@aerotour`,
          `DTSTART:${startDate}`,
          `DTEND:${endDate}`,
          `SUMMARY:${title}`,
          `DESCRIPTION:${description}`,
          `STATUS:CONFIRMED`,
          'END:VEVENT'
        );
      });
      icalContent.push('END:VCALENDAR');
      const icalString = icalContent.join('\n');
      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', 'attachment; filename="aerotour-calendar.ics"');
      res.send(icalString);
    } catch (error) {
      console.error('Error exporting iCal:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при экспорте календаря'
      });
    }
  }
  static formatDate(date) {
    if (!date) return null;
    return new Date(date).toISOString().split('T')[0];
  }
  static formatICalDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }
  static safeJsonParse(jsonString) {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('Ошибка парсинга JSON:', jsonString, error);
      return null;
    }
  }
}

module.exports = new CalendarController();