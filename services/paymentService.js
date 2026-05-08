const Razorpay = require('razorpay');

const getRazorpayInstance = (key_id, key_secret) => {
  if (!key_id || !key_secret) {
    throw new Error('Razorpay keys are missing for this tenant');
  }

  return new Razorpay({ key_id, key_secret });
};

/**
 * Creates a Razorpay Payment Link for an order
 * @param {Object} order - The order object
 * @param {Object} customer - The customer object (optional)
 * @returns {Promise<Object>} - The payment link object
 */
const createPaymentLink = async (order, tenant, customer = null) => {
  try {
    const amount = Math.round(order.total * 100); // Razorpay expects amount in paise
    const razorpay = getRazorpayInstance(tenant.razorpayKeyId, tenant.razorpayKeySecret);

    const response = await razorpay.paymentLink.create({
      amount: amount,
      currency: 'INR',
      accept_partial: false,
      description: `Payment for Order #${order.id}`,
      customer: {
        name: customer?.name || 'Customer',
        contact: order.customerPhone,
        email: customer?.email || undefined,
      },
      notify: {
        sms: false,
        email: false
      },
      reminder_enable: true,
      notes: {
        order_id: order.id.toString(),
      }
    });

    return response;
  } catch (error) {
    console.error('Razorpay Payment Link Error:', error);
    throw new Error('Failed to create payment link');
  }
};

/**
 * Verifies a Razorpay payment signature (for webhooks)
 * @param {string} body - The raw request body
 * @param {string} signature - The signature from X-Razorpay-Signature header
 * @returns {boolean}
 */
const verifyWebhookSignature = (body, signature, secret) => {
  return Razorpay.validateWebhookSignature(body, signature, secret);
};

module.exports = {
  createPaymentLink,
  verifyWebhookSignature,
  getRazorpayInstance
};
