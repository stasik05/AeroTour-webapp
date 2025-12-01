const pool = require('../config/database');

class ManagerBookingsController {
  async getAllBookings(req, res) {
    try {
      const query = `
        SELECT 
          b.id,
          b.booking_date,
          b.status,
          b.travelers_count,
          b.transportation_type,
          b.departure_city,
          b.total_price,
          b.selected_seats,
          b.has_baggage,
          b.baggage_count,
          u.id as user_id,
          u.name as user_name,
          u.last_name as user_last_name,
          u.photo as user_photo,
          u.email as user_email,
          u.phone as user_phone,
          t.id as tour_id,
          t.title as tour_title,
          t.country as tour_country,
          t.city as tour_city,
          t.start_date as tour_start_date,
          t.end_date as tour_end_date,
          t.price as tour_price,
          f.id as flight_id,
          f.airline as flight_airline,
          f.flight_number,
          f.departure_city as flight_departure_city,
          f.arrival_city as flight_arrival_city,
          f.departure_time as flight_departure_time,
          f.arrival_time as flight_arrival_time,
          f.price as flight_price,
          f.aircraft_type,
          CASE 
            WHEN b.tour_id IS NOT NULL THEN 'tour'
            WHEN b.flight_id IS NOT NULL THEN 'flight'
          END as booking_type
        FROM bookings b 
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN tours t ON b.tour_id = t.id
        LEFT JOIN flights f ON b.flight_id = f.id
        ORDER BY b.booking_date DESC
      `;

      const [bookings] = await pool.execute(query);

      const formattedBookings = bookings.map(booking => ({
        id: booking.id,
        booking_date: booking.booking_date,
        status: booking.status,
        travelers_count: booking.travelers_count,
        transportation_type: booking.transportation_type,
        departure_city: booking.departure_city,
        total_price: booking.total_price,
        selected_seats: booking.selected_seats,
        has_baggage: booking.has_baggage,
        baggage_count: booking.baggage_count,
        user: {
          id: booking.user_id,
          name: booking.user_name,
          last_name: booking.user_last_name,
          photo: booking.user_photo,
          email: booking.user_email,
          phone: booking.user_phone
        },
        tour: booking.tour_id ? {
          id: booking.tour_id,
          title: booking.tour_title,
          country: booking.tour_country,
          city: booking.tour_city,
          start_date: booking.tour_start_date,
          end_date: booking.tour_end_date,
          price: booking.tour_price
        } : null,
        flight: booking.flight_id ? {
          id: booking.flight_id,
          airline: booking.flight_airline,
          flight_number: booking.flight_number,
          departure_city: booking.flight_departure_city,
          arrival_city: booking.flight_arrival_city,
          departure_time: booking.flight_departure_time,
          arrival_time: booking.flight_arrival_time,
          price: booking.flight_price,
          aircraft_type: booking.aircraft_type
        } : null,
        booking_type: booking.booking_type,
        seat_info: ManagerBookingsController.formatSeatInfo(booking.selected_seats, booking.travelers_count),
        detailed_seats: ManagerBookingsController.getDetailedSeatInfo(booking.selected_seats),
        passengers_info: `${booking.travelers_count} ${ManagerBookingsController.getPassengerWord(booking.travelers_count)}`
      }));

      res.json({ success: true, bookings: formattedBookings });
    } catch(error) {
      console.error('Error fetching bookings:', error);
      res.status(500).json({ success: false, message: 'Ошибка при загрузке бронирований' });
    }
  }

  async updateBookingStatus(req, res) {
    try {
      const { bookingId } = req.params;
      const { status } = req.body;

      const validStatuses = ['Активно', 'Отменено', 'Завершено'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Неверный статус' });
      }
      const updateQuery = 'UPDATE bookings SET status = ? WHERE id = ?';
      await pool.execute(updateQuery, [status, bookingId]);
      const historyQuery = 'INSERT INTO booking_history (booking_id, status) VALUES (?, ?)';
      await pool.execute(historyQuery, [bookingId, status]);
      res.json({ success: true, message: 'Статус бронирования обновлен' });
    } catch(error) {
      console.error('Error updating booking status:', error);
      res.status(500).json({ success: false, message: 'Ошибка при обновлении статуса' });
    }
  }
  async getBookingHistory(req, res) {
    try {
      const { bookingId } = req.params;
      const query = `
          SELECT bh.status, bh.changed_at
          FROM booking_history bh
          WHERE bh.booking_id = ?
          ORDER BY bh.changed_at DESC
      `;
      const [history] = await pool.execute(query, [bookingId]);
      res.json({ success: true, history });
    } catch (error) {
      console.error('Error fetching booking history:', error);
      res.status(500).json({ success: false, message: 'Ошибка при загрузке истории' });
    }
  }

  async searchBookings(req, res) {
    try {
      const { query, status, bookingType, dateFrom, dateTo } = req.query;
      let searchQuery = `
      SELECT 
        b.id,
        b.booking_date,
        b.status,
        b.total_price,
        b.travelers_count,
        b.selected_seats,
        b.has_baggage,
        b.baggage_count,
        b.transportation_type,
        b.departure_city,
        u.id as user_id,
        u.name as user_name,
        u.last_name as user_last_name,
        u.photo as user_photo,
        u.email as user_email,
        u.phone as user_phone,
        t.id as tour_id,
        t.title as tour_title,
        t.country as tour_country,
        t.city as tour_city,
        t.start_date as tour_start_date,
        t.end_date as tour_end_date,
        t.price as tour_price,
        f.id as flight_id,
        f.airline as flight_airline,
        f.flight_number,
        f.departure_city as flight_departure_city,
        f.arrival_city as flight_arrival_city,
        f.departure_time as flight_departure_time,
        f.arrival_time as flight_arrival_time,
        f.price as flight_price,
        f.aircraft_type,
        CASE 
          WHEN b.tour_id IS NOT NULL THEN 'tour'
          WHEN b.flight_id IS NOT NULL THEN 'flight'
        END as booking_type
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN tours t ON b.tour_id = t.id
      LEFT JOIN flights f ON b.flight_id = f.id
      WHERE 1=1
    `;

      const params = [];

      if (query) {
        searchQuery += ` AND (
        u.name LIKE ? OR 
        u.last_name LIKE ? OR 
        u.email LIKE ? OR
        t.title LIKE ? OR
        f.flight_number LIKE ?
      )`;
        const searchParam = `%${query}%`;
        params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
      }

      if (status && status !== 'all') {
        searchQuery += ` AND b.status = ?`;
        params.push(status);
      }

      if (bookingType && bookingType !== 'all') {
        if (bookingType === 'tour') {
          searchQuery += ` AND b.tour_id IS NOT NULL`;
        } else if (bookingType === 'flight') {
          searchQuery += ` AND b.flight_id IS NOT NULL`;
        }
      }

      if (dateFrom) {
        searchQuery += ` AND DATE(b.booking_date) >= ?`;
        params.push(dateFrom);
      }

      if (dateTo) {
        searchQuery += ` AND DATE(b.booking_date) <= ?`;
        params.push(dateTo);
      }
      searchQuery += ` ORDER BY b.booking_date DESC`;
      const [bookings] = await pool.execute(searchQuery, params);
      const formattedBookings = bookings.map(booking => ({
        id: booking.id,
        booking_date: booking.booking_date,
        status: booking.status,
        travelers_count: booking.travelers_count,
        transportation_type: booking.transportation_type,
        departure_city: booking.departure_city,
        total_price: booking.total_price,
        selected_seats: booking.selected_seats,
        has_baggage: booking.has_baggage,
        baggage_count: booking.baggage_count,
        user: {
          id: booking.user_id,
          name: booking.user_name,
          last_name: booking.user_last_name,
          photo: booking.user_photo,
          email: booking.user_email,
          phone: booking.user_phone
        },
        tour: booking.tour_id ? {
          id: booking.tour_id,
          title: booking.tour_title,
          country: booking.tour_country,
          city: booking.tour_city,
          start_date: booking.tour_start_date,
          end_date: booking.tour_end_date,
          price: booking.tour_price
        } : null,
        flight: booking.flight_id ? {
          id: booking.flight_id,
          airline: booking.flight_airline,
          flight_number: booking.flight_number,
          departure_city: booking.flight_departure_city,
          arrival_city: booking.flight_arrival_city,
          departure_time: booking.flight_departure_time,
          arrival_time: booking.flight_arrival_time,
          price: booking.flight_price,
          aircraft_type: booking.aircraft_type
        } : null,
        booking_type: booking.booking_type,
        seat_info: ManagerBookingsController.formatSeatInfo(booking.selected_seats, booking.travelers_count),
        detailed_seats: ManagerBookingsController.getDetailedSeatInfo(booking.selected_seats),
        passengers_info: `${booking.travelers_count} ${ManagerBookingsController.getPassengerWord(booking.travelers_count)}`
      }));
      res.json({ success: true, bookings: formattedBookings });
    } catch (error) {
      console.error('Error searching bookings:', error);
      res.status(500).json({ success: false, message: 'Ошибка при поиске бронирований' });
    }
  }

  async getBookingStats(req, res) {
    try {
      const statsQuery = `
        SELECT 
          status,
          COUNT(*) as count,
          SUM(total_price) as total_revenue
        FROM bookings 
        GROUP BY status
      `;

      const [stats] = await pool.execute(statsQuery);

      const typeStatsQuery = `
        SELECT 
          CASE 
            WHEN tour_id IS NOT NULL THEN 'tour'
            WHEN flight_id IS NOT NULL THEN 'flight'
          END as type,
          COUNT(*) as count
        FROM bookings 
        GROUP BY type
      `;

      const [typeStats] = await pool.execute(typeStatsQuery);

      res.json({
        success: true,
        stats: {
          byStatus: stats,
          byType: typeStats
        }
      });
    } catch (error) {
      console.error('Error fetching booking stats:', error);
      res.status(500).json({ success: false, message: 'Ошибка при загрузке статистики' });
    }
  }
  async getAvailableYears(req, res)
  {
    try
    {
      const query =
        `
          SELECT DISTINCT YEAR(booking_date) as year
          FROM bookings
          ORDER BY year DESC 
        `;
      const [years] = await pool.execute(query);
      const yearList = years.map(item => item.year);
      res.json({ success: true, years: yearList });
    }
    catch(error)
    {
      console.error('Error fetching years:', error);
      res.status(500).json({ success: false, message: 'Ошибка при загрузке годов' });
    }
  }
  async getStatisticsData(req, res)
  {
    try
    {
      const {year,type,status,groupBy} = req.query;
      let baseQuery =
        `
        SELECT 
        b.*,
        u.name as user_name,
        u.last_name as user_last_name,
        t.title as tour_title,
        t.country as tour_country,
        t.start_date as tour_start_date, 
        t.end_date as tour_end_date,
        t.city as tour_city,
        f.airline as flight_airline,
        f.departure_city as flight_departure_city,
        f.arrival_city as flight_arrival_city,
        f.departure_time as flight_departure_time,
        f.arrival_time as flight_arrival_time
        FROM bookings b 
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN tours t ON b.tour_id = t.id
        LEFT JOIN flights f ON b.flight_id = f.id
        WHERE 1 = 1
      `;
      const params = [];
      if (year && year !== 'all')
      {
        baseQuery += ` AND YEAR(b.booking_date) = ?`;
        params.push(year);
      }
      if (type && type !== 'all')
      {
        if (type === 'tour')
        {
          baseQuery += ` AND b.tour_id IS NOT NULL`;
        } else if (type === 'flight')
        {
          baseQuery += ` AND b.flight_id IS NOT NULL`;
        }
      }
      if (status && status !== 'all')
      {
        baseQuery += ` AND b.status = ?`;
        params.push(status);
      }
      const [bookings] = await pool.execute(baseQuery, params);
      const stats = ManagerBookingsController.formatStatisticsData(bookings,groupBy);
      res.json({ success: true, stats });
    }
    catch(error)
    {
      console.error('Error fetching statistics:', error);
      res.status(500).json({ success: false, message: 'Ошибка при загрузке статистики' });
    }
  }
  static formatStatisticsData(bookings, groupBy) {
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, booking) => sum + (parseFloat(booking.total_price) || 0), 0);
    const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
    const completedBookings = bookings.filter(b => b.status === 'Завершено').length;
    const completionRate = totalBookings > 0 ? (completedBookings / totalBookings * 100).toFixed(1) : 0;

    const overview = {
      totalBookings,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgBookingValue: Math.round(avgBookingValue * 100) / 100,
      completionRate
    };
    const bookingsByMonth = ManagerBookingsController.groupByTime(bookings, groupBy, 'count');
    const bookingsByType = ManagerBookingsController.groupByType(bookings);
    const revenueByMonth = ManagerBookingsController.groupByTime(bookings, groupBy, 'revenue');
    const bookingsByCountry = ManagerBookingsController.groupByCountry(bookings);
    const bookingsByStatus = ManagerBookingsController.groupByStatus(bookings);
    const bookingsByCity = ManagerBookingsController.groupByCity(bookings);
    const revenueByType = ManagerBookingsController.groupRevenueByType(bookings);
    const bookingsByAirline = ManagerBookingsController.groupByAirline(bookings);
    const bookingsBySeason = ManagerBookingsController.groupBySeason(bookings);
    const bookingsByPrice = ManagerBookingsController.groupByPriceRange(bookings);
    const bookingsByTravelers = ManagerBookingsController.groupByTravelersCount(bookings);

    return {
      overview,
      bookingsByMonth,
      bookingsByType,
      revenueByMonth,
      revenueByType,
      bookingsByCountry,
      bookingsByStatus,
      bookingsByCity,
      bookingsByAirline,
      bookingsBySeason,
      bookingsByPrice,
      bookingsByTravelers
    };
  }
  static groupByTime(bookings, groupBy, dataType = 'count')
  {
    const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const quarterNames = ['1 квартал', '2 квартал', '3 квартал', '4 квартал'];
    const groups = {};
    bookings.forEach(booking =>
    {
      const date = new Date(booking.booking_date);
      let key, label;
      if (groupBy === 'month') {
        const year = date.getFullYear();
        const month = date.getMonth();
        key = `${year}-${month}`;
        label = `${monthNames[month]} ${year}`;
      } else if (groupBy === 'quarter') {
        const year = date.getFullYear();
        const quarter = Math.floor(date.getMonth() / 3);
        key = `${year}-${quarter}`;
        label = `${quarterNames[quarter]} ${year}`;
      } else {
        key = date.getFullYear();
        label = key.toString();
      }
      if (!groups[key]) {
        groups[key] = {
          count: 0,
          revenue: 0,
          label
        };
      }
      groups[key].count++;
      groups[key].revenue += parseFloat(booking.total_price) || 0;
    });
    const sortedKeys = Object.keys(groups).sort();
    const labels = sortedKeys.map(key => groups[key].label);
    const data = sortedKeys.map(key =>
      dataType === 'revenue' ? Math.round(groups[key].revenue * 100) / 100 : groups[key].count
    );
    return { labels, data };
  }
  static groupByType(bookings) {
    const types = {
      tour: { label: 'Туры', count: 0 },
      flight: { label: 'Авиабилеты', count: 0 }
    };
    bookings.forEach(booking => {
      const type = booking.tour_id ? 'tour' : 'flight';
      types[type].count++;
    });
    const filteredTypes = Object.values(types).filter(t => t.count > 0);
    const labels = filteredTypes.map(t => t.label);
    const data = filteredTypes.map(t => t.count);
    return { labels, data };
  }
  static groupByCountry(bookings) {
    const countries = {};
    bookings.forEach(booking => {
      let country = '';
      if (booking.tour_id && booking.tour_country) {
        country = booking.tour_country;
      } else if (booking.flight_id && booking.flight_arrival_country) {
        country = booking.flight_arrival_country;
      } else if (booking.flight_id && booking.flight_arrival_city) {
        country = booking.flight_arrival_city;
      } else {
        country = 'Не указано';
      }
      if (!countries[country]) {
        countries[country] = 0;
      }
      countries[country]++;
    });
    const sortedCountries = Object.entries(countries)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const labels = sortedCountries.map(([country]) => country);
    const data = sortedCountries.map(([, count]) => count);
    return { labels, data };
  }
  static groupByStatus(bookings)
  {
    const statuses = {
      'Активно': { label: 'Активно', count: 0 },
      'Завершено': { label: 'Завершено', count: 0 },
      'Отменено': { label: 'Отменено', count: 0 }
    };
    bookings.forEach(booking => {
      const status = booking.status || 'Активно';
      if (statuses[status]) {
        statuses[status].count++;
      }
    });
    const labels = Object.values(statuses).map(s => s.label);
    const data = Object.values(statuses).map(s => s.count);
    return { labels, data };
  }
  static groupByCity(bookings) {
    const cities = {};
    bookings.forEach(booking => {
      let city = '';
      if (booking.tour_id && booking.tour_city) {
        city = booking.tour_city;
      } else if (booking.flight_id && booking.flight_arrival_city) {
        city = booking.flight_arrival_city;
      } else if (booking.departure_city) {
        city = booking.departure_city;
      } else {
        city = 'Не указано';
      }
      if (!cities[city]) {
        cities[city] = 0;
      }
      cities[city]++;
    });
    const sortedCities = Object.entries(cities)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
    const labels = sortedCities.map(([city]) => city);
    const data = sortedCities.map(([, count]) => count);
    return { labels, data };
  }
  static groupRevenueByType(bookings) {
    const types = {
      tour: { label: 'Туры', revenue: 0 },
      flight: { label: 'Авиабилеты', revenue: 0 }
    };
    bookings.forEach(booking => {
      const type = booking.tour_id ? 'tour' : 'flight';
      types[type].revenue += parseFloat(booking.total_price) || 0;
    });
    Object.values(types).forEach(type => {
      type.revenue = Math.round(type.revenue * 100) / 100;
    });
    const filteredTypes = Object.values(types).filter(t => t.revenue > 0);
    const labels = filteredTypes.map(t => t.label);
    const data = filteredTypes.map(t => t.revenue);
    return { labels, data };
  }
  static groupByAirline(bookings) {
    const airlines = {};
    const flightBookings = bookings.filter(booking => booking.flight_id);
    flightBookings.forEach(booking => {
      const airline = booking.flight_airline || 'Неизвестная авиакомпания';
      if (!airlines[airline]) {
        airlines[airline] = 0;
      }
      airlines[airline]++;
    });
    const sortedAirlines = Object.entries(airlines)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const labels = sortedAirlines.map(([airline]) => airline);
    const data = sortedAirlines.map(([, count]) => count);
    return { labels, data };
  }
  static groupBySeason(bookings) {
    const seasons = {
      winter: { label: 'Зима', count: 0, months: [0, 1, 11] },
      spring: { label: 'Весна', count: 0, months: [2, 3, 4] },
      summer: { label: 'Лето', count: 0, months: [5, 6, 7] },
      autumn: { label: 'Осень', count: 0, months: [8, 9, 10] }
    };

    bookings.forEach(booking => {
      let targetDate = null;
      if (booking.tour_id && booking.tour_start_date) {
        targetDate = new Date(booking.tour_start_date);
      } else if (booking.flight_id && booking.flight_departure_time) {
        targetDate = new Date(booking.flight_departure_time);
      } else {
        targetDate = new Date(booking.booking_date);
      }

      if (targetDate && !isNaN(targetDate.getTime())) {
        const month = targetDate.getMonth();

        for (const [seasonKey, season] of Object.entries(seasons)) {
          if (season.months.includes(month)) {
            season.count++;
            break;
          }
        }
      }
    });

    const labels = Object.values(seasons).map(s => s.label);
    const data = Object.values(seasons).map(s => s.count);

    return { labels, data };
  }
  static groupByPriceRange(bookings) {
    const ranges = [
      { label: '0-100 €', min: 0, max: 100, count: 0 },
      { label: '101-300 €', min: 101, max: 300, count: 0 },
      { label: '301-500 €', min: 301, max: 500, count: 0 },
      { label: '501-1000 €', min: 501, max: 1000, count: 0 },
      { label: '1000+ €', min: 1001, max: Infinity, count: 0 }
    ];

    bookings.forEach(booking => {
      const price = parseFloat(booking.total_price) || 0;
      for (const range of ranges) {
        if (price >= range.min && price <= range.max) {
          range.count++;
          break;
        }
      }
    });

    const labels = ranges.map(r => r.label);
    const data = ranges.map(r => r.count);

    return { labels, data };
  }

  static groupByTravelersCount(bookings) {
    const counts = {};

    bookings.forEach(booking => {
      const count = booking.travelers_count || 1;
      if (!counts[count]) {
        counts[count] = 0;
      }
      counts[count]++;
    });
    const sortedCounts = Object.entries(counts)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

    const labels = sortedCounts.map(([count]) => `${count}`);
    const data = sortedCounts.map(([, bookingCount]) => bookingCount);

    return { labels, data };
  }
  async getExtendedStatistics(req, res) {
    try {
      const { year, type } = req.query;

      let baseQuery = `
          SELECT b.*,
                 t.country         as tour_country,
                 t.city            as tour_city,
                 f.airline         as flight_airline,
                 f.arrival_country as flight_arrival_country,
                 f.arrival_city    as flight_arrival_city
          FROM bookings b
                   LEFT JOIN tours t ON b.tour_id = t.id
                   LEFT JOIN flights f ON b.flight_id = f.id
          WHERE 1 = 1
      `;

      const params = [];

      if (year && year !== 'all') {
        baseQuery += ` AND YEAR(b.booking_date) = ?`;
        params.push(year);
      }

      if (type && type !== 'all') {
        if (type === 'tour') {
          baseQuery += ` AND b.tour_id IS NOT NULL`;
        } else if (type === 'flight') {
          baseQuery += ` AND b.flight_id IS NOT NULL`;
        }
      }

      const [bookings] = await pool.execute(baseQuery, params);

      const extendedStats = {
        bySeason: ManagerBookingsController.groupBySeason(bookings),
        byPriceRange: ManagerBookingsController.groupByPriceRange(bookings),
        byTravelersCount: ManagerBookingsController.groupByTravelersCount(bookings)
      };

      res.json({ success: true, stats: extendedStats });
    } catch (error) {
      console.error('Error fetching extended statistics:', error);
      res.status(500).json({ success: false, message: 'Ошибка при загрузке расширенной статистики' });
    }
  }
  static formatSeatInfo(selectedSeats, travelersCount) {
    try {
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
      return travelersCount > 1 ? `${travelers_count} мест` : 'Место не выбрано';
    }
  }

  static getDetailedSeatInfo(selectedSeats) {
    try {
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

  static getPassengerWord(count) {
    if (count % 10 === 1 && count % 100 !== 11) {
      return 'пассажир';
    } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
      return 'пассажира';
    } else {
      return 'пассажиров';
    }
  }
  static formatNormalDate(dateString) {
    try {
      if (!dateString) return 'Дата не указана';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
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
}


module.exports = new ManagerBookingsController();