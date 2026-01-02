// utils/emailService.js
import { generateInvoice } from './invoiceGenerator.js';
import sendEmail from './sendEmail.js';

/**
 * Send Order Confirmation Email with Invoice
 * @param {Object} order - Order object populated with user and items
 */
export const sendOrderConfirmationEmail = async (order) => {
    try {
        // Generate PDF Buffer
        const invoiceBuffer = await generateInvoice(order);

        // Prepare email content
        const subject = `Order Confirmation #${order.orderNumber}`;
        const html = `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h2 style="color: #6F4E37;">Thank you for your order!</h2>
                <p>Dear ${order.user.firstName},</p>
                <p>We confirm receipt of your order <strong>#${order.orderNumber}</strong>.</p>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0; font-weight: bold;">Order Summary</p>
                    <p style="margin: 5px 0;">Total Paid: KSh ${order.total.toLocaleString()}</p>
                    <p style="margin: 5px 0;">Items: ${order.items.length}</p>
                </div>
                <p>Please find your invoice attached.</p>
                <p>We will notify you as soon as your package is shipped.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="font-size: 12px; color: #888;">Rerendet Coffee • Nairobi, Kenya</p>
            </div>
        `;

        // Send using shared utility (uses Admin Settings)
        await sendEmail({
            to: order.user.email,
            subject: subject,
            html: html,
            attachments: [
                {
                    filename: `Invoice-${order.orderNumber}.pdf`,
                    content: invoiceBuffer,
                    contentType: 'application/pdf'
                }
            ]
        });

        console.log(`✅ Order Confirmation Email sent to ${order.user.email}`);
        return true;

    } catch (error) {
        console.error('❌ Failed to send order confirmation email:', error);
        return false;
    }
};

/**
 * Export generic sendEmail for compatibility if needed elsewhere
 */
export { sendEmail };
