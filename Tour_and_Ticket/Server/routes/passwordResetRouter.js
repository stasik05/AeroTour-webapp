const express = require('express');
const router = express.Router();
const passwordResetController = require('../controllers/PasswordResetController');
router.post('/send-code', passwordResetController.sendResetCode);
router.post('/verify-code', passwordResetController.verifyCode);
router.post('/reset-password', passwordResetController.resetPassword);
module.exports = router;