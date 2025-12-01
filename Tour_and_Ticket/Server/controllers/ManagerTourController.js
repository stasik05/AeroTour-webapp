const pool = require('../config/database')
class ManagerTourController
{
  async getAllTours(req, res)
  {
    try
    {
      const [tours] = await pool.execute
      (
        `
          SELECT t.*,
          ti.image_url as main_image
          FROM tours t 
          LEFT JOIN tour_images ti ON t.id = ti.tour_id AND ti.sort_order = 1
          ORDER BY t.id DESC
        `
      );
      const formattedTours = tours.map(tour => ({
        id: tour.id,
        title: tour.title,
        description: ManagerTourController.getFirstSentence(tour.description),
        country: tour.country,
        city: tour.city,
        startDate: ManagerTourController.formatNormalDate(tour.start_date),
        endDate: ManagerTourController.formatNormalDate(tour.end_date),
        price: ManagerTourController.formatPrice(tour.price),
        available: tour.available,
        transportationIncluded: tour.transportation_included,
        availableCities: tour.available_cities ? JSON.parse(tour.available_cities) : [],
        mainImage: ManagerTourController.convertImagePathToUrl(tour.main_image, 'tours') ,
        dates: `${ManagerTourController.formatNormalDate(tour.start_date)} → ${ManagerTourController.formatNormalDate(tour.end_date)}`
      }));
      res.json({
        success: true,
        tours: formattedTours
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
  async getTourDetails(req, res)
  {
    try
    {
      const tourId = req.params.id;
      const [tours] = await pool.execute(`
        SELECT * FROM tours WHERE id = ?
      `, [tourId]);
      if (tours.length === 0)
      {
        return res.status(404).json({
          success: false,
          error: 'Тур не найден'
        });
      }
      const tour = tours[0];
      const [images] = await pool.execute(`
        SELECT * FROM tour_images 
        WHERE tour_id = ? 
        ORDER BY sort_order
      `, [tourId]);
      const formattedImages = images.map(img => ({
        id: img.id,
        url: ManagerTourController.convertImagePathToUrl(img.image_url, 'tours'),
        sortOrder: img.sort_order
      }));
      const tourDetails =
        {
        id: tour.id,
        title: tour.title,
        description: tour.description,
        country: tour.country,
        city: tour.city,
        startDate: ManagerTourController.formatDateForInput(tour.start_date),
        endDate: ManagerTourController.formatDateForInput(tour.end_date),
        price: parseFloat(tour.price),
        available: tour.available,
        transportationIncluded: tour.transportation_included,
        availableCities: tour.available_cities ? JSON.parse(tour.available_cities) : [],
        images: formattedImages,
        dates: `${ManagerTourController.formatNormalDate(tour.start_date)} → ${ManagerTourController.formatNormalDate(tour.end_date)}`
      };
      res.json({
        success: true,
        tour: tourDetails
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
  async addTour(req,res) {
    try {
      const {
        title,
        description,
        country,
        city,
        start_date,
        end_date,
        price,
        transportation_included,
        available_cities,
        available
      } = req.body;
      if (!title || !country || !city || !start_date || !end_date || !price) {
        return res.status(400).json({
          success: false,
          error: 'Все обязательные поля должны быть заполнены'
        });
      }

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [result] = await connection.execute(
          `INSERT INTO tours 
        (title, description, country, city, start_date, end_date, price, transportation_included, available_cities, available) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            title,
            description || '',
            country,
            city,
            start_date,
            end_date,
            parseFloat(price),
            transportation_included === 'true',
            available_cities ? JSON.stringify(available_cities) : null,
            available === 'true'
          ]
        );

        const tourId = result.insertId;
        if (req.files && req.files.length > 0) {
          for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            await connection.execute(
              'INSERT INTO tour_images (tour_id, image_url, sort_order) VALUES (?, ?, ?)',
              [tourId, file.filename, i]
            );
          }
        }

        await connection.commit();
        connection.release();
        res.json({
          success: true,
          message: 'Тур успешно добавлен',
          tourId: tourId
        });
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      console.error('Ошибка добавления тура:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при добавлении тура'
      });
    }
  }
  async updateTour(req, res) {
    try {
      const tourId = req.params.id;
      const {
        title,
        description,
        country,
        city,
        start_date,
        end_date,
        price,
        transportation_included,
        available_cities,
        available
      } = req.body;
      const [existingTours] = await pool.execute(
        'SELECT id FROM tours WHERE id = ?',
        [tourId]
      );

      if (existingTours.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Тур не найден'
        });
      }
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const updateQuery = `
        UPDATE tours SET 
          title = ?, description = ?, country = ?, city = ?, 
          start_date = ?, end_date = ?, price = ?, 
          transportation_included = ?, available_cities = ?, available = ?
        WHERE id = ?
      `;

        const updateParams = [
          title,
          description || '',
          country,
          city,
          start_date,
          end_date,
          parseFloat(price),
          transportation_included === 'true',
          available_cities ? JSON.stringify(available_cities) : null,
          available === 'true',
          tourId
        ];
        const [updateResult] = await connection.execute(updateQuery, updateParams);
        if (req.files && req.files.length > 0) {
          const [currentImages] = await connection.execute(
            'SELECT MAX(sort_order) as max_order FROM tour_images WHERE tour_id = ?',
            [tourId]
          );
          let nextSortOrder = currentImages[0].max_order !== null ? currentImages[0].max_order + 1 : 0;
          for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            await connection.execute(
              'INSERT INTO tour_images (tour_id, image_url, sort_order) VALUES (?, ?, ?)',
              [tourId, file.filename, nextSortOrder + i]
            );
          }
        }
        await connection.commit();
        connection.release();
      } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('Ошибка в транзакции:', error);
        throw error;
      }

    } catch (error) {
      console.error('❌ Ошибка обновления тура:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при обновлении тура: ' + error.message
      });
    }
  }
  async deleteTour(req, res) {
    try {
      const tourId = req.params.id;
      const [existingTours] = await pool.execute(
        'SELECT id FROM tours WHERE id = ?',
        [tourId]
      );
      if (existingTours.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Тур не найден'
        });
      }
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.execute(
          'DELETE FROM tours WHERE id = ?',
          [tourId]
        );
        await connection.commit();
        connection.release();
        res.json({
          success: true,
          message: 'Тур успешно удален'
        });
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      console.error('Ошибка удаления тура:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при удалении тура'
      });
    }
  }
  async deleteTourImage(req, res) {
    try {
      const imageId = req.params.imageId;
      await pool.execute(
        'DELETE FROM tour_images WHERE id = ?',
        [imageId]
      );
      res.json({
        success: true,
        message: 'Изображение успешно удалено'
      });
    } catch (error) {
      console.error('Ошибка удаления изображения:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при удалении изображения'
      });
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
  static convertImagePathToUrl(filePath, type) {

    try {
      if (filePath.startsWith('http')) {
        return filePath;
      }
      if (filePath.startsWith('/uploads/tours/')) {
        return filePath;
      }
      if (filePath.startsWith('tour-')) {
        return `/uploads/tours/${filePath}`;
      }
      if (filePath.includes('Pictures\\Tours')) {
        const pathParts = filePath.split(/[\\\/]/);
        const toursIndex = pathParts.indexOf('Tours');

        if (toursIndex !== -1 && pathParts.length > toursIndex + 2) {
          const tourId = pathParts[toursIndex + 1];
          const fileName = pathParts[pathParts.length - 1];
          return `/images/tours/${tourId}/${fileName}`;
        }
      }
      const fileName = filePath.split(/[\\\/]/).pop();
      const imageUrl = `/uploads/tours/${fileName}`;
      return imageUrl;
    } catch (error) {
      console.error('Ошибка преобразования пути:', error);
    }
  }
  static formatDateForInput(dateString) {
    try {
      if (!dateString) return '';

      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '';
      }
      const timezoneOffset = date.getTimezoneOffset() * 60000;
      const adjustedDate = new Date(date.getTime() - timezoneOffset);
      return adjustedDate.toISOString().split('T')[0];
    } catch (error) {
      console.error('Ошибка форматирования даты для input:', error);
      return '';
    }
  }
}
module.exports = new ManagerTourController();