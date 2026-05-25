const express = require('express');
const router = express.Router();
const deliveryController = require('../../controllers/deliveryController');
const { authenticateToken } = require('../../middleware/auth');

router.post('/login', deliveryController.login);
router.get('/orders', authenticateToken, deliveryController.getOrders);
router.get('/orders/:id', authenticateToken, deliveryController.getOrderById);
router.put('/orders/:id/status', authenticateToken, deliveryController.updateOrderStatus);
router.put('/fcm-token', authenticateToken, deliveryController.registerFcmToken);
router.delete('/fcm-token', authenticateToken, deliveryController.unregisterFcmToken);

module.exports = router;
