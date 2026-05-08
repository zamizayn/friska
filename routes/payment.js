const express = require('express');
const router = express.Router();
const { handleRazorpayWebhook } = require('../controllers/paymentController');

router.post('/webhook/:tenantId', handleRazorpayWebhook);

module.exports = router;
