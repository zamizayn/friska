const express = require('express');
const router = express.Router();
const notificationController = require('../../controllers/notificationController');

router.post('/register', notificationController.registerFcmToken);
router.delete('/unregister', notificationController.unregisterFcmToken);

module.exports = router;
