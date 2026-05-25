const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/orderController');

router.get('/', orderController.getAllOrders);
router.put('/bulk-status', orderController.bulkUpdateOrderStatus);
router.get('/:id', orderController.getOrderById);
router.post('/', orderController.createOrder);
router.put('/:id/status', orderController.updateOrderStatus);
router.put('/:id/payment-status', orderController.updatePaymentStatus);

module.exports = router;
