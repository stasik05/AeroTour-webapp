const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const ManagerSupportController = require('../controllers/ManagerSupportController');
router.use(authMiddleware);

router.get('/chat', ManagerSupportController.getClientChat);
router.post('/message', ManagerSupportController.sendClientMessage);
router.get('/manager-info', ManagerSupportController.getManagerInfo);

module.exports = router;