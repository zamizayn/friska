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

const createRegistrationPaymentLink = async (tenant, amountInRupees) => {
  try {
    const amount = Math.round(amountInRupees * 100);
    const razorpay = getRazorpayInstance(
      process.env.PLATFORM_RAZORPAY_KEY_ID,
      process.env.PLATFORM_RAZORPAY_KEY_SECRET
    );

    const response = await razorpay.paymentLink.create({
      amount: amount,
      currency: 'INR',
      accept_partial: false,
      description: `Registration Fee for ${tenant.name}`,
      customer: {
        name: tenant.contactName || 'Tenant Admin',
        contact: tenant.contactPhone || undefined,
        email: tenant.contactEmail || undefined,
      },
      notify: {
        sms: false,
        email: false
      },
      reminder_enable: true,
      notes: {
        tenant_id: tenant.id.toString(),
        type: 'registration'
      }
    });

    return response;
  } catch (error) {
    console.error('Razorpay Registration Payment Link Error:', error);
    throw new Error('Failed to create registration payment link');
  }
};

const verifyWebhookSignature = (body, signature, secret) => {
  return Razorpay.validateWebhookSignature(JSON.stringify(body), signature, secret);
};

module.exports = {
  createPaymentLink,
  createRegistrationPaymentLink,
  verifyWebhookSignature,
  getRazorpayInstance
};
