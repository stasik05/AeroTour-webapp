const express = require('express')
const router = express.Router()
const UsersController = require('../controllers/UsersController')
const authMiddleware = require('../middleware/AuthMiddleware')
router.use(authMiddleware);
router.get('/all', authMiddleware, UsersController.getAllUsers);
router.get('/managers', authMiddleware, UsersController.getManagers);
router.post('/add', authMiddleware, UsersController.addManager);
router.put('/edit', authMiddleware, UsersController.updateManager);
router.delete('/delete/:id', authMiddleware, UsersController.deleteUser);
module.exports = router;