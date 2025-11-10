const express = require('express');
const router = express.Router();
const detailsController = require('../controllers/DetailsController.js');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/tour/:id',detailsController.getTourDetails);
router.get('/flight/:id',detailsController.getFlightDetails);
router.post('/favorites/add',authMiddleware,detailsController.addToFavorites);
router.post('/booking/create',authMiddleware,detailsController.createBooking);
router.post('/reviews/add',authMiddleware,detailsController.addReview)
router.get('/favorites',authMiddleware,detailsController.getUserFavorites);
module.exports = router;
