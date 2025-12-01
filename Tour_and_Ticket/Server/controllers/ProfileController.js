const User = require("../models/User.js");
const path = require("path");
const fs = require("fs");
const pool = require('../config/database');
class ProfileController
{
  async getProfile(req, res) {
    try {
      const userId = req.user.userId;
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'UserID не определен'
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Пользователь не найден'
        });
      }
      res.json({
        success: true,
        user: user.toJSON()
      });

    } catch (error) {
      console.error('❌ Ошибка получения профиля:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка сервера'
      });
    }
  }
  async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const { name, lastName, phone } = req.body;
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'UserID не определен'
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Пользователь не найден'
        });
      }
      let changesMade = false;
      if (name !== undefined && name !== user.userName) {
        user.userName = name;
        changesMade = true;
      }

      if (lastName !== undefined && lastName !== user.userLastName) {
        user.userLastName = lastName;
        changesMade = true;
      }

      if (phone !== undefined && phone !== user.userPhone) {
        user.userPhone = phone;
        changesMade = true;
      }

      if (!changesMade) {
        return res.json({
          success: true,
          message: 'Данные не изменились',
          user: user.toJSON()
        });
      }

      const saveResult = await user.save();
      const updatedUser = await User.findById(userId);

      res.json({
        success: true,
        message: 'Профиль успешно обновлен',
        user: updatedUser.toJSON()
      });

    } catch (error) {
      console.error('❌ Ошибка обновления профиля:', error);
      console.error('🔍 Stack trace:', error.stack);
      res.status(500).json({
        success: false,
        error: 'Ошибка сервера при обновлении профиля',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  async getPersonalOffers(req, res) {
    try {
      const userId = req.user.userId;
      const [personalTourOffers] = await pool.execute(
        `SELECT 
          po.id,
          po.discount_percent,
          po.valid_until,
          po.description,
          po.created_at,
          t.id as tour_id,
          t.title as tour_title,
          t.description as tour_description,
          t.country as tour_country,
          t.city as tour_city,
          t.start_date as tour_start_date,
          t.end_date as tour_end_date,
          t.price as tour_original_price,
          ROUND(t.price * (1 - po.discount_percent / 100), 2) as tour_final_price,
          ti.image_url as tour_image,
          'tour' as item_type,
          'personal' as offer_type,
          CASE WHEN po.tour_id IS NULL OR po.tour_id = 0 THEN 'all_tours' ELSE 'specific_tour' END as discount_scope
       FROM personalized_offers po
       LEFT JOIN tours t ON (po.tour_id = t.id OR (po.tour_id IS NULL OR po.tour_id = 0))
       LEFT JOIN tour_images ti ON t.id = ti.tour_id AND ti.sort_order = 1
       WHERE po.user_id = ? 
         AND po.valid_until >= CURDATE()
         AND (po.tour_id IS NOT NULL OR po.tour_id IS NULL OR po.tour_id = 0)
         AND (po.flight_id IS NULL OR po.flight_id = 0)
         AND t.available = TRUE
       ORDER BY po.discount_percent DESC, po.valid_until ASC`,
        [userId]
      );
      const [personalFlightOffers] = await pool.execute(
        `SELECT 
          po.id,
          po.discount_percent,
          po.valid_until,
          po.description,
          po.created_at,
          f.id as flight_id,
          f.airline as flight_airline,
          f.flight_number as flight_number,
          f.departure_city as flight_departure_city,
          f.arrival_city as flight_arrival_city,
          f.departure_time as flight_departure_time,
          f.arrival_time as flight_arrival_time,
          f.price as flight_original_price,
          ROUND(f.price * (1 - po.discount_percent / 100), 2) as flight_final_price,
          fi.image_url as flight_image,
          'flight' as item_type,
          'personal' as offer_type,
          CASE WHEN po.flight_id IS NULL OR po.flight_id = 0 THEN 'all_flights' ELSE 'specific_flight' END as discount_scope
       FROM personalized_offers po
       LEFT JOIN flights f ON (po.flight_id = f.id OR (po.flight_id IS NULL OR po.flight_id = 0))
       LEFT JOIN flight_images fi ON f.id = fi.flight_id
       WHERE po.user_id = ? 
         AND po.valid_until >= CURDATE()
         AND (po.flight_id IS NOT NULL OR po.flight_id IS NULL OR po.flight_id = 0)
         AND (po.tour_id IS NULL OR po.tour_id = 0)
         AND f.available = TRUE
       ORDER BY po.discount_percent DESC, po.valid_until ASC`,
        [userId]
      );
      const [generalTourOffers] = await pool.execute(
        `SELECT 
          d.id,
          d.discount_percent,
          d.end_date as valid_until,
          CONCAT('Специальное предложение: скидка ', d.discount_percent, '%') as description,
          d.created_at,
          t.id as tour_id,
          t.title as tour_title,
          t.description as tour_description,
          t.country as tour_country,
          t.city as tour_city,
          t.start_date as tour_start_date,
          t.end_date as tour_end_date,
          t.price as tour_original_price,
          ROUND(t.price * (1 - d.discount_percent / 100), 2) as tour_final_price,
          ti.image_url as tour_image,
          'tour' as item_type,
          'general' as offer_type,
          'specific_tour' as discount_scope
       FROM discounts d
       LEFT JOIN tours t ON d.tour_id = t.id
       LEFT JOIN tour_images ti ON t.id = ti.tour_id AND ti.sort_order = 1
       WHERE d.is_active = TRUE
         AND (d.start_date IS NULL OR d.start_date <= CURDATE())
         AND (d.end_date IS NULL OR d.end_date >= CURDATE())
         AND t.available = TRUE
         AND t.id NOT IN (
           SELECT COALESCE(tour_id, 0) FROM personalized_offers 
           WHERE user_id = ? AND valid_until >= CURDATE()
         )
       ORDER BY d.discount_percent DESC, d.end_date ASC
       LIMIT 10`,
        [userId]
      );
      const [generalFlightOffers] = await pool.execute(
        `SELECT 
          d.id,
          d.discount_percent,
          d.end_date as valid_until,
          CONCAT('Специальное предложение: скидка ', d.discount_percent, '%') as description,
          d.created_at,
          f.id as flight_id,
          f.airline as flight_airline,
          f.flight_number as flight_number,
          f.departure_city as flight_departure_city,
          f.arrival_city as flight_arrival_city,
          f.departure_time as flight_departure_time,
          f.arrival_time as flight_arrival_time,
          f.price as flight_original_price,
          ROUND(f.price * (1 - d.discount_percent / 100), 2) as flight_final_price,
          fi.image_url as flight_image,
          'flight' as item_type,
          'general' as offer_type,
          'specific_flight' as discount_scope
       FROM discounts d
       LEFT JOIN flights f ON (d.flight_id = f.id OR d.airline = f.airline)
       LEFT JOIN flight_images fi ON f.id = fi.flight_id
       WHERE d.is_active = TRUE
         AND (d.start_date IS NULL OR d.start_date <= CURDATE())
         AND (d.end_date IS NULL OR d.end_date >= CURDATE())
         AND f.available = TRUE
         AND f.id NOT IN (
           SELECT COALESCE(flight_id, 0) FROM personalized_offers 
           WHERE user_id = ? AND valid_until >= CURDATE()
         )
       ORDER BY d.discount_percent DESC, d.end_date ASC
       LIMIT 10`,
        [userId]
      );
      const allOffers = [
        ...personalTourOffers,
        ...personalFlightOffers,
        ...generalTourOffers,
        ...generalFlightOffers
      ];
      const formattedOffers = allOffers.map(offer => {
        const isTour = offer.item_type === 'tour';
        const isPersonal = offer.offer_type === 'personal';
        const isAllItems = offer.discount_scope === 'all_tours' || offer.discount_scope === 'all_flights';

        const baseUrl = isTour ? '/client/tour' : '/client/flight';
        const itemId = isTour ? offer.tour_id : offer.flight_id;
        if (isAllItems) {
          return {
            id: `personal_${offer.id}`,
            offerId: offer.id,
            type: 'personal',
            itemType: offer.item_type,
            title: isTour ? 'Персональная скидка на все туры' : 'Персональная скидка на все авиабилеты',
            description: offer.description || `Ваша персональная скидка ${offer.discount_percent}%`,
            discountPercent: offer.discount_percent,
            originalPrice: null,
            finalPrice: null,
            validUntil: offer.valid_until,
            imageUrl: isTour ? '/images/all-tours.jpg' : '/images/all-flights.jpg',
            destination: isTour ? 'Все направления' : 'Все маршруты',
            dates: 'Постоянное предложение',
            airline: null,
            detailsLink: isTour ? '/client/tours' : '/client/flights',
            discountScope: offer.discount_scope,
            isGlobalDiscount: true
          };
        }
        return {
          id: isTour ? offer.tour_id : offer.flight_id,
          offerId: offer.id,
          type: offer.offer_type,
          itemType: offer.item_type,
          title: isTour ? offer.tour_title : `${offer.flight_airline} ${offer.flight_number}`,
          description: offer.description || (isTour ? offer.tour_description : `Рейс ${offer.flight_departure_city} → ${offer.flight_arrival_city}`),
          discountPercent: offer.discount_percent,
          originalPrice: isTour ? offer.tour_original_price : offer.flight_original_price,
          finalPrice: isTour ? offer.tour_final_price : offer.flight_final_price,
          validUntil: offer.valid_until,
          imageUrl: ProfileController.convertImagePathToUrl(isTour ? offer.tour_image : offer.flight_image, offer.item_type),
          destination: isTour ? `${offer.tour_city}, ${offer.tour_country}` : `${offer.flight_departure_city} → ${offer.flight_arrival_city}`,
          dates: isTour ?
            `${new Date(offer.tour_start_date).toLocaleDateString('ru-RU')} - ${new Date(offer.tour_end_date).toLocaleDateString('ru-RU')}` :
            new Date(offer.flight_departure_time).toLocaleDateString('ru-RU'),
          airline: isTour ? null : offer.flight_airline,
          detailsLink: `${baseUrl}/${itemId}`,
          discountScope: offer.discount_scope,
          isGlobalDiscount: false
        };
      });
      formattedOffers.sort((a, b) => {
        if (a.type === 'personal' && b.type !== 'personal') return -1;
        if (a.type !== 'personal' && b.type === 'personal') return 1;
        return b.discountPercent - a.discountPercent;
      });
      res.json({
        success: true,
        offers: formattedOffers,
        stats: {
          total: formattedOffers.length,
          personal: formattedOffers.filter(o => o.type === 'personal').length,
          general: formattedOffers.filter(o => o.type === 'general').length,
          globalDiscounts: formattedOffers.filter(o => o.isGlobalDiscount).length
        }
      });

    } catch (error) {
      console.error('Ошибка получения персонализированных предложений:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при загрузке персональных предложений',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  async uploadPhoto(req,res)
  {
    try
    {
      const userId = req.user.userId;
      if(!req.file)
      {
        return res.status(400).json({
          success: false,
          error: 'Файл не загружен'
        });
      }
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Пользователь не найден'
        });
      }
      const photoPath = `/uploads/profiles/${req.file.filename}`;
      user.userPhoto = photoPath;
      await user.save();
      res.json({
        success: true,
        message: 'Фото успешно загружено',
        photoUrl: photoPath
      });
    }
    catch (error)
    {
      console.error('Ошибка загрузки фото:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка сервера'
      });
    }
  }
  static convertImagePathToUrl(filePath, type) {
    if (!filePath) {
      return type === 'tour' ? '/images/default-tour.jpg' : '/images/default-flight.jpg';
    }

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

      return webUrl || (type === 'tour' ? '/images/default-tour.jpg' : '/images/default-flight.jpg');
    } catch (error) {
      console.error('Ошибка преобразования пути:', error);
      return type === 'tour' ? '/images/default-tour.jpg' : '/images/default-flight.jpg';
    }
  }
  async changePassword(req,res)
  {
    try
    {
      const userId = req.user.userId;
      const {currentPassword,newPassword} = req.body;
      const user = await User.findById(userId);
      if(!user)
      {
        return res.status(404).json(
          {
            success:false,
            message:'Пользователь не найден'
          });
      }
      const isCurrentPasswordValid = await user.validatePassword(currentPassword);
      if (!isCurrentPasswordValid)
      {
        return res.status(400).json({
          success: false,
          error: 'Текущий пароль неверен'
        });
      }
      await user.changePassword(newPassword);
      res.json({
        success: true,
        message: 'Пароль успешно изменен'
      });
    }catch(error)
    {
      console.error('Ошибка смены пароля:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка сервера'
      });
    }
  }
}
module.exports = new ProfileController();