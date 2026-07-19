const express = require('express');
const router = express.Router();
const customerController = require('../../controllers/customerController');

router.get('/', customerController.getAllCustomers);
router.get('/:phone/orders', customerController.getCustomerOrders);
router.get('/:phone/logs', customerController.getCustomerLogs);
router.get('/:phone/addresses', customerController.getCustomerAddresses);
router.post('/:phone/addresses', customerController.addCustomerAddress);
router.post('/broadcast', customerController.broadcastMessage);

module.exports = router;
