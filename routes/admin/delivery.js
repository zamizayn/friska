const express = require('express');
const router = express.Router();
const adminDeliveryController = require('../../controllers/adminDeliveryController');

router.get('/delivery-boys', adminDeliveryController.listDeliveryBoys);
router.post('/delivery-boys', adminDeliveryController.createDeliveryBoy);
router.put('/delivery-boys/:id', adminDeliveryController.updateDeliveryBoy);
router.delete('/delivery-boys/:id', adminDeliveryController.deleteDeliveryBoy);
router.put('/orders/:id/assign-delivery', adminDeliveryController.assignDeliveryBoy);
router.get('/orders/available', adminDeliveryController.getAvailableOrders);

module.exports = router;
