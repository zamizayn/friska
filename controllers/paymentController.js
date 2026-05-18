const { GlobalConfig, Order, Customer, Tenant } = require('../models');
const { verifyWebhookSignature, createRegistrationPaymentLink } = require('../services/paymentService');
const { getTenantConfig } = require('../utils/tenantHelpers');
const { sendTextMessage } = require('../services/whatsappService');

const createRegistrationPayment = async (req, res) => {
  try {
    const { tenantId } = req.body;
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const feeConfig = await GlobalConfig.findOne({ where: { key: 'registrationFee' } });
    const amount = parseFloat(feeConfig?.value || '1000');

    const paymentLink = await createRegistrationPaymentLink(tenant, amount);
    
    tenant.registrationPaymentId = paymentLink.id;
    await tenant.save();

    res.json({ url: paymentLink.short_url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const handleRazorpayWebhook = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    let tenant;
    let secret = process.env.PLATFORM_RAZORPAY_WEBHOOK_SECRET;

    // If tenantId is 'platform', it's a global registration payment
    if (tenantId !== 'platform') {
        tenant = await Tenant.findByPk(tenantId);
        if (tenant && tenant.razorpayWebhookSecret) {
            secret = tenant.razorpayWebhookSecret;
        }
    }

    if (secret) {
      const isValid = verifyWebhookSignature(body, signature, secret);
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
      const paymentType = notes.type; // 'registration'
      const targetTenantId = notes.tenant_id;
      
      const paymentId = payment ? payment.id : (payload.payment_link ? payload.payment_link.entity.payment_id : null);

      if (paymentType === 'registration' && targetTenantId) {
          const tenantToUpdate = await Tenant.findByPk(targetTenantId);
          if (tenantToUpdate) {
              tenantToUpdate.paymentStatus = 'paid';
              await tenantToUpdate.save();
              console.log(`Registration payment confirmed for tenant ${targetTenantId}`);
          }
      } else if (orderId) {
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
  handleRazorpayWebhook,
  createRegistrationPayment
};
