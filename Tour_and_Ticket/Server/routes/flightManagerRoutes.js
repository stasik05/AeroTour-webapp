const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const FlightManagerController = require('../controllers/ManagerFlightController');
const uploadsPath = path.join(__dirname, '../../public/uploads/flights');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
    }

    cb(null, uploadsPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = 'flight-' + uniqueSuffix + extension;
    cb(null, filename);
  }
});
const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});
router.get('/all',FlightManagerController.getAllFlights);
router.get('/:id',FlightManagerController.getFlightDetails);
router.post('/add',upload.array('images',1),FlightManagerController.addFlight);
router.put('/update/:id',upload.array('image',1),FlightManagerController.updateFlight);
router.delete('/delete/:id',FlightManagerController.deleteFlight);
router.delete('/image/:imageId',FlightManagerController.deleteFlightImage);
module.exports = router;