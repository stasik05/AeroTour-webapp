const express = require('express')
const router = express.Router()
const CalendarController = require('../controllers/CalendarController')
const authMiddleware = require('../middleware/AuthMiddleware')
router.use(authMiddleware);
router.get('/bookings',authMiddleware,CalendarController.getUserBookings);
router.get('/trip/:bookingId',authMiddleware,CalendarController.getTripDetails);
router.get('/export/ical',authMiddleware,CalendarController.exportToICal)
module.exports = router;