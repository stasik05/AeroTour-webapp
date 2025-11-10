const express = require('express');
const router = express.Router();
const FavoriteController = require('../controllers/FavoritesController');
const authMiddleware = require('../middleware/authMiddleware');
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const favorites = await FavoriteController.getUserFavorites(userId);
    res.json({
      success: true,
      data: favorites
    });
  } catch (error) {
    console.error('Error getting favorites:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении избранного'
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { tourId, flightId } = req.body;

    if (!tourId && !flightId) {
      return res.status(400).json({
        success: false,
        error: 'Необходимо указать tourId или flightId'
      });
    }

    const favorite = await FavoriteController.addToFavorites(userId, tourId, flightId);
    res.json({
      success: true,
      message: 'Добавлено в избранное',
      data: favorite
    });
  } catch (error) {
    console.error('Error adding to favorites:', error);

    // Специальная обработка для ошибки "Уже в избранном"
    if (error.message && error.message.includes('Уже в избранном')) {
      return res.status(409).json({ // 409 Conflict - подходящий статус для дублирования
        success: false,
        error: error.message,
        isAlreadyFavorite: true
      });
    }

    res.status(500).json({
      success: false,
      error: 'Ошибка при добавлении в избранное'
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.userId;
    const favoriteId = req.params.id;
    await FavoriteController.removeFromFavorites(userId, favoriteId);
    res.json({
      success: true,
      message: 'Удалено из избранного'
    });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении из избранного'
    });
  }
});

module.exports = router;