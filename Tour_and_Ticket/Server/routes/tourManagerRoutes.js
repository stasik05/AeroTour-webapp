const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const TourManagerController = require('../controllers/ManagerTourController');
const uploadsPath = path.join(__dirname, '../../public/uploads/tours');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
      console.log('Создана папка:', uploadsPath);
    }

    cb(null, uploadsPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = 'tour-' + uniqueSuffix + extension;
    console.log('Сохранение файла:', filename);
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

router.get('/all', TourManagerController.getAllTours);
router.get('/:id', TourManagerController.getTourDetails);
router.post('/add', upload.array('images', 4), TourManagerController.addTour);
router.put('/update/:id', upload.array('images', 4), TourManagerController.updateTour);
router.delete('/delete/:id', TourManagerController.deleteTour);
router.delete('/image/:imageId', TourManagerController.deleteTourImage);

module.exports = router;