const { Order, Customer, Tenant } = require('../models');
const { verifyWebhookSignature } = require('../services/paymentService');
const { getTenantConfig } = require('../utils/tenantHelpers');
const { sendTextMessage } = require('../services/whatsappService');

const handleRazorpayWebhook = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      console.error(`Webhook error: Tenant ${tenantId} not found`);
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Verify signature if tenant has a webhook secret set
    if (tenant.razorpayWebhookSecret) {
      const isValid = verifyWebhookSignature(body, signature, tenant.razorpayWebhookSecret);
      if (!isValid) {
        console.error(`Invalid signature for tenant ${tenantId}`);
        return res.status(400).json({ error: 'Invalid signature' });
      }
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment_link.paid' || event === 'payment.captured') {
      const paymentLink = payload.payment_link ? payload.payment_link.entity : null;
      const payment = payload.payment ? payload.payment.entity : null;
      const notes = paymentLink ? paymentLink.notes : (payment ? payment.notes : {});
      const orderId = notes.order_id;
      const paymentId = payment ? payment.id : (payload.payment_link ? payload.payment_link.entity.payment_id : null);

      if (orderId) {
        const order = await Order.findByPk(orderId);
        if (order) {
          order.paymentStatus = 'paid';
          order.paymentTransactionId = paymentId;
          await order.save();

          // Notify customer on WhatsApp
          try {
            const config = await getTenantConfig(order.tenantId || (await order.getBranch())?.tenantId);
            await sendTextMessage(order.customerPhone, `✅ *Payment Confirmed!*\n\nWe have received your payment for Order *#${order.id}*. Your order is being processed. 🛍️`, config);
          } catch (notifError) {
            console.error('WhatsApp Notification Error:', notifError.message);
          }
        }
      }
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Razorpay Webhook Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  handleRazorpayWebhook
};
