const nodemailer = require('nodemailer');

// Configure the SMTP Transporter
// Will default to standard environment variables
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT || '2525'),
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Sends a welcome email to the tenant upon successful account registration.
 * 
 * @param {Object} tenant - The tenant sequelize object
 */
const sendWelcomeEmail = async (tenant) => {
    const fromEmail = process.env.SMTP_FROM || 'no-reply@wstore.com';
    const contactEmail = tenant.contactEmail;

    if (!contactEmail) {
        console.warn(`[EmailService] No contact email found for tenant: ${tenant.name || tenant.id}. Skipping welcome email.`);
        return;
    }

    const mailOptions = {
        from: `"WStore Platform" <${fromEmail}>`,
        to: contactEmail,
        subject: 'Welcome to WStore - Registration Successful! 🎉',
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div style="background: linear-gradient(135deg, #6366f1, #a855f7); padding: 32px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 26px; font-weight: bold;">Welcome to WStore!</h1>
                    <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 15px;">Your Multi-tenant WhatsApp Commerce Platform</p>
                </div>
                <div style="padding: 32px; background-color: #ffffff;">
                    <p style="font-size: 16px; margin-top: 0;">Dear ${tenant.contactName || 'Merchant Admin'},</p>
                    <p style="font-size: 15px;">Congratulations! Your merchant account for <strong>${tenant.name}</strong> has been successfully created. We are excited to support you in launching and operating your business on WhatsApp.</p>
                    
                    <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
                        <h3 style="margin-top: 0; color: #4f46e5; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Your Account Credentials</h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr>
                                <td style="padding: 6px 0; color: #6b7280; font-weight: bold; width: 150px;">Store Name:</td>
                                <td style="padding: 6px 0; color: #111827; font-weight: bold;">${tenant.name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #6b7280;">Admin Username:</td>
                                <td style="padding: 6px 0; color: #111827; font-family: monospace;">${tenant.username}</td>
                            </tr>
                        </table>
                    </div>

                    <p style="font-size: 15px;"><strong>What's next?</strong></p>
                    <ol style="font-size: 14px; color: #4b5563; padding-left: 20px; margin-bottom: 24px;">
                        <li style="margin-bottom: 8px;">Complete the registration fee payment if you haven't already.</li>
                        <li style="margin-bottom: 8px;">Configure your WhatsApp Meta Business Integration credentials inside your dashboard.</li>
                        <li style="margin-bottom: 8px;">Add products and branches to begin receiving WhatsApp orders.</li>
                    </ol>

                    <p style="font-size: 15px; margin-bottom: 0;">Should you have any questions or need technical support, feel free to contact us.</p>
                </div>
                <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6;">
                    This is an automated system email. Please do not reply directly to this inbox.
                </div>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[EmailService] Welcome email sent to ${contactEmail}: ${info.messageId}`);
        return info;
    } catch (err) {
        console.error(`[EmailService] Failed to send welcome email to ${contactEmail}:`, err.message);
        throw err;
    }
};

/**
 * Sends a payment confirmation email to the tenant.
 * 
 * @param {Object} tenant - The tenant sequelize object
 */
const sendPaymentConfirmationEmail = async (tenant) => {
    const fromEmail = process.env.SMTP_FROM || 'no-reply@wstore.com';
    const contactEmail = tenant.contactEmail;

    if (!contactEmail) {
        console.warn(`[EmailService] No contact email found for tenant: ${tenant.name || tenant.id}. Skipping confirmation email.`);
        return;
    }

    const mailOptions = {
        from: `"WStore Platform" <${fromEmail}>`,
        to: contactEmail,
        subject: 'Payment Confirmed - Your WStore Store is Active! 🚀',
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div style="background: #10b981; padding: 32px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 26px; font-weight: bold;">Onboarding Completed!</h1>
                    <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 15px;">Payment Confirmed successfully</p>
                </div>
                <div style="padding: 32px; background-color: #ffffff;">
                    <p style="font-size: 16px; margin-top: 0;">Dear ${tenant.contactName || 'Merchant Admin'},</p>
                    <p style="font-size: 15px;">Excellent news! We have received your onboarding registration payment for <strong>${tenant.name}</strong>.</p>
                    
                    <p style="font-size: 15px;">Your merchant account status has been updated to <strong>Paid</strong> and is now fully active on WStore.</p>

                    <div style="background-color: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; padding: 20px; margin: 24px 0; color: #065f46;">
                        <h3 style="margin-top: 0; color: #059669; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Payment Details</h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #065f46;">
                            <tr>
                                <td style="padding: 6px 0; font-weight: bold; width: 150px;">Store Name:</td>
                                <td style="padding: 6px 0; font-weight: bold;">${tenant.name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0;">Payment Status:</td>
                                <td style="padding: 6px 0; font-weight: bold;">PAID</td>
                            </tr>
                        </table>
                    </div>

                    <p style="font-size: 15px;">You can now log in to the WStore administration panel and configure your Meta WhatsApp parameters, create branches, and start setting up catalogs.</p>

                    <p style="font-size: 15px; margin-bottom: 0;">Welcome aboard! We are thrilled to have you in the WStore ecosystem.</p>
                </div>
                <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6;">
                    This is an automated system email. Please do not reply directly to this inbox.
                </div>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[EmailService] Payment confirmation email sent to ${contactEmail}: ${info.messageId}`);
        return info;
    } catch (err) {
        console.error(`[EmailService] Failed to send payment confirmation email to ${contactEmail}:`, err.message);
        throw err;
    }
};

module.exports = {
    sendWelcomeEmail,
    sendPaymentConfirmationEmail,
    transporter
};
