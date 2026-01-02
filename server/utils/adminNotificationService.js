import { sendEmail } from './emailService.js';
import { getLowStockAlertEmail } from './emailTemplates.js';
import Settings from '../models/Settings.js';

/**
 * Notify admin when stock is low for a product
 */
export const sendLowStockAlert = async (product) => {
    // 1. Determine Admin Email (Try DB Settings first, fall back to Env)
    let adminEmail = process.env.SUPER_ADMIN_EMAIL || process.env.EMAIL_USER;
    let logoUrl;

    try {
        const settings = await Settings.getSettings();
        if (settings) {
            if (settings.store?.email) adminEmail = settings.store.email; // Send to store contact email
            logoUrl = settings.store?.logo;
        }
    } catch (error) {
        console.warn('⚠️ Could not fetch settings for low stock alert', error);
    }

    if (!adminEmail) {
        console.warn('⚠️ No admin email configured for low stock alerts');
        return;
    }

    // 2. Generate Email Content
    const productUrl = `${process.env.FRONTEND_URL}/admin/products/${product._id}`;
    const htmlContent = getLowStockAlertEmail(
        product.name,
        product.inventory.stock,
        product.inventory.lowStockAlert,
        productUrl,
        logoUrl
    );

    // 3. Send Email
    try {
        await sendEmail({
            to: adminEmail,
            subject: `⚠️ Low Stock Alert: ${product.name}`,
            html: htmlContent
        });
        console.log(`📧 Low stock alert sent for ${product.name} to ${adminEmail}`);
    } catch (error) {
        console.error('❌ Failed to send low stock alert:', error.message);
    }
};
