const express = require('express');
const router = express.Router();
const SearchController = require('../controllers/SearchController');
const authMiddleware = require('../middleware/authMiddleware');
router.get('/tours',SearchController.searchTours);
router.get('/flights',SearchController.searchFlights);
router.post('/favorites',authMiddleware,SearchController.addToFavorites);
module.exports = router;