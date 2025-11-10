const express = require('express')
const router = express.Router()
const ProfileController = require('../controllers/ProfileController');
const BookingController = require('../controllers/BookingController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware'); // Теперь это multer

router.use(authMiddleware);

router.get('/profile', ProfileController.getProfile);
router.put('/profile', ProfileController.updateProfile);
router.post('/profile/photo', upload.single('photo'), ProfileController.uploadPhoto);
router.post('/profile/password', ProfileController.changePassword);
router.get('/bookings', BookingController.getUserBookings);
router.get('/bookings/:id', BookingController.getBookingDetails);
router.post('/bookings/:id/cancel', BookingController.cancelBooking);

module.exports = router;