const pool = require('../config/database');
class DiscountsController {
  async getAllDiscounts(req, res) {
    try {
      const query = `
                SELECT 
                    d.id,
                    d.title,
                    d.description,
                    d.discount_percent,
                    d.start_date,
                    d.end_date,
                    d.tour_id,
                    d.flight_id,
                    d.is_active,
                    d.created_at,
                    t.title as tour_title,
                    t.country as tour_country,
                    t.city as tour_city,
                    f.flight_number,
                    f.airline as flight_airline,
                    f.departure_city as flight_departure_city,
                    f.arrival_city as flight_arrival_city,
                    CASE 
                        WHEN d.start_date > CURDATE() THEN 'Запланирована'
                        WHEN d.end_date < CURDATE() THEN 'Истекла'
                        ELSE 'Активна'
                    END as status,
                    CASE 
                        WHEN d.tour_id IS NOT NULL THEN 'tour'
                        WHEN d.flight_id IS NOT NULL THEN 'flight'
                        ELSE 'all'
                    END as discount_type
                FROM discounts d
                LEFT JOIN tours t ON d.tour_id = t.id
                LEFT JOIN flights f ON d.flight_id = f.id
                ORDER BY d.created_at DESC
            `;

      const [discounts] = await pool.execute(query);

      const formattedDiscounts = discounts.map(discount => ({
        id: discount.id,
        title: discount.title,
        description: discount.description,
        discount_percent: discount.discount_percent,
        start_date: discount.start_date,
        end_date: discount.end_date,
        tour_id: discount.tour_id,
        flight_id: discount.flight_id,
        is_active: discount.is_active,
        created_at: discount.created_at,
        status: discount.status,
        discount_type: discount.discount_type,
        tour: discount.tour_id ? {
          id: discount.tour_id,
          title: discount.tour_title,
          country: discount.tour_country,
          city: discount.tour_city
        } : null,
        flight: discount.flight_id ? {
          id: discount.flight_id,
          flight_number: discount.flight_number,
          airline: discount.flight_airline,
          departure_city: discount.flight_departure_city,
          arrival_city: discount.flight_arrival_city
        } : null,
        discount_info: DiscountsController.formatDiscountInfo(discount),
        date_info: DiscountsController.formatDateInfo(discount.start_date, discount.end_date),
        status_class: DiscountsController.getStatusClass(discount.status)
      }));

      res.json({ success: true, discounts: formattedDiscounts });
    } catch(error) {
      console.error('Error fetching discounts:', error);
      res.status(500).json({ success: false, message: 'Ошибка при загрузке скидок' });
    }
  }

  async getAllPersonalizedOffers(req, res) {
    try {
      const query = `
                SELECT 
                    po.id,
                    po.discount_percent,
                    po.valid_until,
                    po.description,
                    po.created_at,
                    u.id as user_id,
                    u.name as user_name,
                    u.last_name as user_last_name,
                    u.email as user_email,
                    u.photo as user_photo,
                    t.id as tour_id,
                    t.title as tour_title,
                    t.country as tour_country,
                    t.city as tour_city,
                    t.price as tour_price,
                    f.id as flight_id,
                    f.airline as flight_airline,
                    f.flight_number,
                    f.departure_city as flight_departure_city,
                    f.arrival_city as flight_arrival_city,
                    f.price as flight_price,
                    CASE 
                        WHEN po.valid_until < CURDATE() THEN 'Истекло'
                        ELSE 'Активно'
                    END as status,
                    CASE 
                        WHEN po.tour_id IS NOT NULL THEN 'tour'
                        WHEN po.flight_id IS NOT NULL THEN 'flight'
                        ELSE 'general'
                    END as offer_type
                FROM personalized_offers po
                LEFT JOIN users u ON po.user_id = u.id
                LEFT JOIN tours t ON po.tour_id = t.id
                LEFT JOIN flights f ON po.flight_id = f.id
                ORDER BY po.created_at DESC
            `;

      const [offers] = await pool.execute(query);

      const formattedOffers = offers.map(offer => ({
        id: offer.id,
        discount_percent: offer.discount_percent,
        valid_until: offer.valid_until,
        description: offer.description,
        created_at: offer.created_at,
        status: offer.status,
        offer_type: offer.offer_type,
        user: offer.user_id ? {
          id: offer.user_id,
          name: offer.user_name,
          last_name: offer.user_last_name,
          email: offer.user_email,
          photo: offer.user_photo
        } : null,
        tour: offer.tour_id ? {
          id: offer.tour_id,
          title: offer.tour_title,
          country: offer.tour_country,
          city: offer.tour_city,
          price: offer.tour_price
        } : null,
        flight: offer.flight_id ? {
          id: offer.flight_id,
          airline: offer.flight_airline,
          flight_number: offer.flight_number,
          departure_city: offer.flight_departure_city,
          arrival_city: offer.flight_arrival_city,
          price: offer.flight_price
        } : null,
        offer_info: DiscountsController.formatOfferInfo(offer),
        date_info: DiscountsController.formatDateInfo(null, offer.valid_until),
        status_class: DiscountsController.getStatusClass(offer.status)
      }));

      res.json({ success: true, offers: formattedOffers });
    } catch(error) {
      console.error('Error fetching personalized offers:', error);
      res.status(500).json({ success: false, message: 'Ошибка при загрузке персонализированных предложений' });
    }
  }

  async addDiscount(req, res) {
    try {
      const { title, description, discount_percent, start_date, end_date, apply_to, tour_id, flight_id, airline } = req.body;
      let finalTourId = null;
      let finalFlightId = null;
      let finalAirline = null;

      if (apply_to === 'tour' && tour_id) {
        finalTourId = tour_id;
      } else if (apply_to === 'flight') {
        if (flight_id) {
          finalFlightId = flight_id;
        } else if (airline) {
          finalAirline = airline;
        }
      }

      const query = `
            INSERT INTO discounts (title, description, discount_percent, start_date, end_date, tour_id, flight_id, airline, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;

      const [result] = await pool.execute(query, [
        title,
        description,
        discount_percent,
        start_date,
        end_date,
        finalTourId,
        finalFlightId,
        finalAirline
      ]);

      res.json({
        success: true,
        message: 'Скидка успешно добавлена',
        discountId: result.insertId
      });
    } catch(error) {
      console.error('Error adding discount:', error);
      res.status(500).json({ success: false, message: 'Ошибка при добавлении скидки' });
    }
  }
  async addPersonalizedOffer(req, res) {
    try {
      const { user_id, tour_id, flight_id, discount_percent, valid_until, description } = req.body;
      const query = `
                INSERT INTO personalized_offers (user_id, tour_id, flight_id, discount_percent, valid_until, description, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            `;
      const [result] = await pool.execute(query, [
        user_id || null,
        tour_id || null,
        flight_id || null,
        discount_percent,
        valid_until,
        description
      ]);
      res.json({
        success: true,
        message: 'Персонализированное предложение успешно добавлено',
        offerId: result.insertId
      });
    } catch(error) {
      console.error('Error adding personalized offer:', error);
      res.status(500).json({ success: false, message: 'Ошибка при добавлении персонализированного предложения' });
    }
  }
  async updateDiscount(req, res) {
    try {
      const discountId = req.params.id;
      const { title, description, discount_percent, start_date, end_date, apply_to, tour_id, flight_id, airline, is_active } = req.body;

      let finalTourId = null;
      let finalFlightId = null;
      let finalAirline = null;
      if (apply_to === 'tour' && tour_id) {
        finalTourId = tour_id;
      } else if (apply_to === 'flight') {
        if (flight_id) {
          finalFlightId = flight_id;
        } else if (airline) {
          finalAirline = airline;
        }
      }

      const query = `
      UPDATE discounts
      SET title = ?, description = ?, discount_percent = ?, start_date = ?, end_date = ?, 
          tour_id = ?, flight_id = ?, airline = ?, is_active = ?, updated_at = NOW()
      WHERE id = ?
    `;
      await pool.execute(query, [
        title,
        description,
        discount_percent,
        start_date,
        end_date,
        finalTourId,
        finalFlightId,
        finalAirline,
        is_active !== undefined ? is_active : true,
        discountId
      ]);

      res.json({ success: true, message: 'Скидка успешно обновлена' });
    } catch(error) {
      console.error('Error updating discount:', error);
      res.status(500).json({ success: false, message: 'Ошибка при обновлении скидки' });
    }
  }
  async updatePersonalizedOffer(req, res) {
    try {
      const offerId = req.params.id;
      const { user_id, tour_id, flight_id, discount_percent, valid_until, description } = req.body;

      const query = `
                UPDATE personalized_offers 
                SET user_id = ?, tour_id = ?, flight_id = ?, discount_percent = ?, 
                    valid_until = ?, description = ?
                WHERE id = ?
            `;
      await pool.execute(query, [
        user_id || null,
        tour_id || null,
        flight_id || null,
        discount_percent,
        valid_until,
        description,
        offerId
      ]);

      res.json({ success: true, message: 'Персонализированное предложение успешно обновлено' });
    } catch(error) {
      console.error('Error updating personalized offer:', error);
      res.status(500).json({ success: false, message: 'Ошибка при обновлении персонализированного предложения' });
    }
  }
  async deleteDiscount(req, res) {
    try {
      const discountId = req.params.id;
      await pool.execute('DELETE FROM discounts WHERE id = ?', [discountId]);
      res.json({ success: true, message: 'Скидка успешно удалена' });
    } catch(error) {
      console.error('Error deleting discount:', error);
      res.status(500).json({ success: false, message: 'Ошибка при удалении скидки' });
    }
  }

  async deletePersonalizedOffer(req, res) {
    try {
      const offerId = req.params.id;
      await pool.execute('DELETE FROM personalized_offers WHERE id = ?', [offerId]);
      res.json({ success: true, message: 'Персонализированное предложение успешно удалено' });
    } catch(error) {
      console.error('Error deleting personalized offer:', error);
      res.status(500).json({ success: false, message: 'Ошибка при удалении персонализированного предложения' });
    }
  }

  async searchDiscounts(req, res) {
    try {
      const { query, status, discountType, dateFrom, dateTo } = req.query;

      let searchQuery = `
                SELECT 
                    d.id,
                    d.title,
                    d.description,
                    d.discount_percent,
                    d.start_date,
                    d.end_date,
                    d.tour_id,
                    d.flight_id,
                    d.created_at,
                    t.title as tour_title,
                    f.flight_number,
                    CASE 
                        WHEN d.start_date > CURDATE() THEN 'Запланирована'
                        WHEN d.end_date < CURDATE() THEN 'Истекла'
                        ELSE 'Активна'
                    END as status,
                    CASE 
                        WHEN d.tour_id IS NOT NULL THEN 'tour'
                        WHEN d.flight_id IS NOT NULL THEN 'flight'
                        ELSE 'all'
                    END as discount_type
                FROM discounts d
                LEFT JOIN tours t ON d.tour_id = t.id
                LEFT JOIN flights f ON d.flight_id = f.id
                WHERE 1=1
            `;

      const params = [];

      if (query) {
        searchQuery += ` AND (
                    d.title LIKE ? OR 
                    d.description LIKE ? OR
                    t.title LIKE ? OR
                    f.flight_number LIKE ?
                )`;
        const searchParam = `%${query}%`;
        params.push(searchParam, searchParam, searchParam, searchParam);
      }

      if (status && status !== 'all') {
        if (status === 'active') {
          searchQuery += ` AND d.start_date <= CURDATE() AND d.end_date >= CURDATE() AND d.is_active = TRUE`;
        } else if (status === 'planned') {
          searchQuery += ` AND d.start_date > CURDATE() AND d.is_active = TRUE`;
        } else if (status === 'expired') {
          searchQuery += ` AND d.end_date < CURDATE()`;
        } else if (status === 'inactive') {
          searchQuery += ` AND d.is_active = FALSE`;
        }
      }

      if (discountType && discountType !== 'all') {
        if (discountType === 'tour') {
          searchQuery += ` AND d.tour_id IS NOT NULL`;
        } else if (discountType === 'flight') {
          searchQuery += ` AND d.flight_id IS NOT NULL`;
        } else if (discountType === 'all') {
          searchQuery += ` AND d.tour_id IS NULL AND d.flight_id IS NULL`;
        }
      }

      if (dateFrom) {
        searchQuery += ` AND DATE(d.created_at) >= ?`;
        params.push(dateFrom);
      }

      if (dateTo) {
        searchQuery += ` AND DATE(d.created_at) <= ?`;
        params.push(dateTo);
      }

      searchQuery += ` ORDER BY d.created_at DESC`;

      const [discounts] = await pool.execute(searchQuery, params);

      const formattedDiscounts = discounts.map(discount => ({
        id: discount.id,
        title: discount.title,
        description: discount.description,
        discount_percent: discount.discount_percent,
        start_date: discount.start_date,
        end_date: discount.end_date,
        tour_id: discount.tour_id,
        flight_id: discount.flight_id,
        created_at: discount.created_at,
        status: discount.status,
        discount_type: discount.discount_type,
        tour: discount.tour_id ? {
          id: discount.tour_id,
          title: discount.tour_title
        } : null,
        flight: discount.flight_id ? {
          id: discount.flight_id,
          flight_number: discount.flight_number
        } : null,
        discount_info: DiscountsController.formatDiscountInfo(discount),
        date_info: DiscountsController.formatDateInfo(discount.start_date, discount.end_date),
        status_class: DiscountsController.getStatusClass(discount.status)
      }));

      res.json({ success: true, discounts: formattedDiscounts });
    } catch (error) {
      console.error('Error searching discounts:', error);
      res.status(500).json({ success: false, message: 'Ошибка при поиске скидок' });
    }
  }
  async searchPersonalizedOffers(req, res) {
    try {
      const { query, status, offerType, dateFrom, dateTo } = req.query;

      let searchQuery = `
                SELECT 
                    po.id,
                    po.discount_percent,
                    po.valid_until,
                    po.description,
                    po.created_at,
                    u.id as user_id,
                    u.name as user_name,
                    u.last_name as user_last_name,
                    u.email as user_email,
                    u.photo as user_photo,
                    t.id as tour_id,
                    t.title as tour_title,
                    f.id as flight_id,
                    f.flight_number,
                    CASE 
                        WHEN po.valid_until < CURDATE() THEN 'Истекло'
                        ELSE 'Активно'
                    END as status,
                    CASE 
                        WHEN po.tour_id IS NOT NULL THEN 'tour'
                        WHEN po.flight_id IS NOT NULL THEN 'flight'
                        ELSE 'general'
                    END as offer_type
                FROM personalized_offers po
                LEFT JOIN users u ON po.user_id = u.id
                LEFT JOIN tours t ON po.tour_id = t.id
                LEFT JOIN flights f ON po.flight_id = f.id
                WHERE 1=1
            `;

      const params = [];

      if (query) {
        searchQuery += ` AND (
                    u.name LIKE ? OR 
                    u.last_name LIKE ? OR 
                    u.email LIKE ? OR
                    t.title LIKE ? OR
                    f.flight_number LIKE ? OR
                    po.description LIKE ?
                )`;
        const searchParam = `%${query}%`;
        params.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
      }

      if (status && status !== 'all') {
        if (status === 'active') {
          searchQuery += ` AND po.valid_until >= CURDATE()`;
        } else if (status === 'expired') {
          searchQuery += ` AND po.valid_until < CURDATE()`;
        }
      }

      if (offerType && offerType !== 'all') {
        if (offerType === 'tour') {
          searchQuery += ` AND po.tour_id IS NOT NULL`;
        } else if (offerType === 'flight') {
          searchQuery += ` AND po.flight_id IS NOT NULL`;
        } else if (offerType === 'general') {
          searchQuery += ` AND po.tour_id IS NULL AND po.flight_id IS NULL`;
        }
      }

      if (dateFrom) {
        searchQuery += ` AND DATE(po.created_at) >= ?`;
        params.push(dateFrom);
      }

      if (dateTo) {
        searchQuery += ` AND DATE(po.created_at) <= ?`;
        params.push(dateTo);
      }

      searchQuery += ` ORDER BY po.created_at DESC`;

      const [offers] = await pool.execute(searchQuery, params);

      const formattedOffers = offers.map(offer => ({
        id: offer.id,
        discount_percent: offer.discount_percent,
        valid_until: offer.valid_until,
        description: offer.description,
        created_at: offer.created_at,
        status: offer.status,
        offer_type: offer.offer_type,
        user: offer.user_id ? {
          id: offer.user_id,
          name: offer.user_name,
          last_name: offer.user_last_name,
          email: offer.user_email,
          photo:offer.user_photo
        } : null,
        tour: offer.tour_id ? {
          id: offer.tour_id,
          title: offer.tour_title
        } : null,
        flight: offer.flight_id ? {
          id: offer.flight_id,
          flight_number: offer.flight_number
        } : null,
        offer_info: DiscountsController.formatOfferInfo(offer),
        date_info: DiscountsController.formatDateInfo(null, offer.valid_until),
        status_class: DiscountsController.getStatusClass(offer.status)
      }));

      res.json({ success: true, offers: formattedOffers });
    } catch (error) {
      console.error('Error searching personalized offers:', error);
      res.status(500).json({ success: false, message: 'Ошибка при поиске персонализированных предложений' });
    }
  }

  async getDiscountsStats(req, res) {
    try {
      const statsQuery = `
                SELECT 
                    status,
                    COUNT(*) as count
                FROM (
                    SELECT 
                        CASE 
                            WHEN start_date > CURDATE() THEN 'Запланирована'
                            WHEN end_date < CURDATE() THEN 'Истекла'
                            ELSE 'Активна'
                        END as status
                    FROM discounts
                    WHERE is_active = TRUE
                ) as status_table
                GROUP BY status
            `;

      const [discountStats] = await pool.execute(statsQuery);

      const offersStatsQuery = `
                SELECT 
                    CASE 
                        WHEN valid_until < CURDATE() THEN 'Истекло'
                        ELSE 'Активно'
                    END as status,
                    COUNT(*) as count
                FROM personalized_offers
                GROUP BY status
            `;

      const [offersStats] = await pool.execute(offersStatsQuery);

      const typeStatsQuery = `
                SELECT 
                    CASE 
                        WHEN tour_id IS NOT NULL THEN 'tour'
                        WHEN flight_id IS NOT NULL THEN 'flight'
                        ELSE 'general'
                    END as type,
                    COUNT(*) as count
                FROM personalized_offers 
                GROUP BY type
            `;

      const [typeStats] = await pool.execute(typeStatsQuery);

      const discountTypeStatsQuery = `
                SELECT 
                    CASE 
                        WHEN tour_id IS NOT NULL THEN 'tour'
                        WHEN flight_id IS NOT NULL THEN 'flight'
                        ELSE 'all'
                    END as type,
                    COUNT(*) as count
                FROM discounts 
                WHERE is_active = TRUE
                GROUP BY type
            `;

      const [discountTypeStats] = await pool.execute(discountTypeStatsQuery);

      res.json({
        success: true,
        stats: {
          discounts: discountStats,
          offers: offersStats,
          offer_types: typeStats,
          discount_types: discountTypeStats
        }
      });
    } catch (error) {
      console.error('Error fetching discounts stats:', error);
      res.status(500).json({ success: false, message: 'Ошибка при загрузке статистики' });
    }
  }
  async deleteExpiredDiscounts(req, res) {
    try {
      const [result] = await pool.execute(`
            DELETE FROM discounts 
            WHERE end_date < CURDATE()
        `);

      res.json({
        success: true,
        message: 'Истекшие скидки удалены',
        deletedCount: result.affectedRows
      });
    } catch(error) {
      console.error('Error deleting expired discounts:', error);
      res.status(500).json({ success: false, message: 'Ошибка при удалении истекших скидок' });
    }
  }

  async deleteInactiveDiscounts(req, res) {
    try {
      const [result] = await pool.execute(`
            DELETE FROM discounts 
            WHERE is_active = FALSE
        `);

      res.json({
        success: true,
        message: 'Неактивные скидки удалены',
        deletedCount: result.affectedRows
      });
    } catch(error) {
      console.error('Error deleting inactive discounts:', error);
      res.status(500).json({ success: false, message: 'Ошибка при удалении неактивных скидок' });
    }
  }

  async getUsers(req, res) {
    try {
      const [users] = await pool.execute('SELECT id, name, last_name, email, photo FROM users ORDER BY name');
      res.json({ success: true, users });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ success: false, message: 'Ошибка при загрузке пользователей' });
    }
  }

  async getTours(req, res) {
    try {
      const [tours] = await pool.execute('SELECT id, title, country, city, price FROM tours WHERE available = TRUE ORDER BY title');
      res.json({ success: true, tours });
    } catch (error) {
      console.error('Error fetching tours:', error);
      res.status(500).json({ success: false, message: 'Ошибка при загрузке туров' });
    }
  }

  async getFlights(req, res) {
    try {
      const [flights] = await pool.execute('SELECT id, flight_number, airline, departure_city, arrival_city, price FROM flights WHERE available = TRUE ORDER BY flight_number');
      res.json({ success: true, flights });
    } catch (error) {
      console.error('Error fetching flights:', error);
      res.status(500).json({ success: false, message: 'Ошибка при загрузке авиаперелетов' });
    }
  }

  async getUserBookings(req, res) {
    try {
      const userId = req.params.userId;
      const query = `
                SELECT 
                    b.id,
                    b.booking_date,
                    b.status,
                    b.total_price,
                    t.id as tour_id,
                    t.title as tour_title,
                    t.country as tour_country,
                    t.city as tour_city,
                    f.id as flight_id,
                    f.flight_number,
                    f.departure_city as flight_departure_city,
                    f.arrival_city as flight_arrival_city,
                    CASE 
                        WHEN b.tour_id IS NOT NULL THEN 'tour'
                        WHEN b.flight_id IS NOT NULL THEN 'flight'
                    END as booking_type
                FROM bookings b
                LEFT JOIN tours t ON b.tour_id = t.id
                LEFT JOIN flights f ON b.flight_id = f.id
                WHERE b.user_id = ?
                ORDER BY b.booking_date DESC
                LIMIT 10
            `;
      const [bookings] = await pool.execute(query, [userId]);
      res.json({ success: true, bookings });
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      res.status(500).json({ success: false, message: 'Ошибка при загрузке истории бронирований' });
    }
  }
  async getAirlines(req, res) {
    try {
      const [airlines] = await pool.execute(`
            SELECT DISTINCT airline 
            FROM flights 
            WHERE airline IS NOT NULL AND airline != '' 
            ORDER BY airline
        `);

      const airlineList = airlines.map(item => item.airline);
      res.json({ success: true, airlines: airlineList });
    } catch (error) {
      console.error('Error fetching airlines:', error);
      res.status(500).json({ success: false, message: 'Ошибка при загрузке авиакомпаний' });
    }
  }

  static formatDiscountInfo(discount) {
    if (discount.tour_id) {
      return `Скидка на тур: ${discount.tour_title}`;
    } else if (discount.flight_id) {
      return `Скидка на рейс: ${discount.flight_number}`;
    } else {
      return 'Общая скидка на все туры и перелеты';
    }
  }

  static formatOfferInfo(offer) {
    if (offer.tour_id) {
      return `Тур: ${offer.tour_title}`;
    } else if (offer.flight_id) {
      return `Рейс: ${offer.flight_number}`;
    } else if (offer.user_id) {
      return `Персональное предложение для ${offer.user_name} ${offer.user_last_name}`;
    } else {
      return 'Общее предложение';
    }
  }

  static formatDateInfo(startDate, endDate) {
    if (!startDate && !endDate) return 'Без ограничений по дате';

    if (startDate && endDate) {
      const start = new Date(startDate).toLocaleDateString('ru-RU');
      const end = new Date(endDate).toLocaleDateString('ru-RU');
      return `${start} - ${end}`;
    }

    if (endDate) {
      const end = new Date(endDate).toLocaleDateString('ru-RU');
      return `Действует до ${end}`;
    }

    return 'Без ограничений по дате';
  }

  static getStatusClass(status) {
    switch(status) {
      case 'Активна':
      case 'Активно':
        return 'status-active';
      case 'Запланирована':
        return 'status-planned';
      case 'Истекла':
      case 'Истекло':
        return 'status-expired';
      default:
        return 'status-unknown';
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

module.exports = new DiscountsController();