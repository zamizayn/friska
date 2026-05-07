const express = require('express');
const router = express.Router();
const notificationController = require('../../controllers/notificationController');

router.get('/', notificationController.getNotificationHistory);
router.put('/read', notificationController.markNotificationsRead);

module.exports = router;
