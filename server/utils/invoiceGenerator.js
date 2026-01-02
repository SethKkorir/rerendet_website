// utils/invoiceGenerator.js - MODERN & DYNAMIC
import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import Settings from '../models/Settings.js'; // Import Settings Model

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate a professional PDF invoice for an order
 * @param {Object} order - The order object
 * @param {Object} [res] - Optional response object to stream PDF to.
 * @returns {Promise<Buffer>|void}
 */
export const generateInvoice = async (order, res = null) => {
    // 1. Fetch Store Settings
    let storeSettings = {
        name: 'Rerendet Coffee',
        address: 'Nairobi, Kenya',
        email: 'info@rerendetcoffee.com',
        phone: '+254 700 000 000',
        logo: ''
    };

    try {
        const settings = await Settings.getSettings();
        if (settings && settings.store) {
            storeSettings = {
                name: settings.store.name || storeSettings.name,
                address: settings.store.address || storeSettings.address,
                email: settings.store.email || storeSettings.email,
                phone: settings.store.phone || storeSettings.phone,
                logo: settings.store.logo || ''
            };
        }
    } catch (error) {
        console.warn('⚠️ Could not fetch settings for invoice, using defaults.', error);
    }

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 40, // Slightly tighter margin for modern look
                bufferPages: true
            });

            const buffers = [];

            if (res) {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=Invoice-${order.orderNumber}.pdf`);
                doc.pipe(res);
            } else {
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    const pdfData = Buffer.concat(buffers);
                    resolve(pdfData);
                });
            }

            // --- THEME ---
            const COLORS = {
                primary: '#6F4E37',    // Coffee Brown
                secondary: '#2c3e50',  // Dark Slate
                accent: '#E67E22',     // Orange Accent (Subtle)
                text: '#34495e',       // Grey Text
                lightGray: '#F5F6FA',  // Backgrounds
                border: '#DCDDE1'
            };

            const FONTS = {
                bold: 'Helvetica-Bold',
                regular: 'Helvetica'
            };

            // --- HEADER ---
            // Logo (Left)
            const logoPath = path.join(__dirname, '../../client/public/rerendet-logo.png');
            let hasLogo = false;
            try {
                // Try local file first (robustness)
                doc.image(logoPath, 40, 40, { width: 60 });
                hasLogo = true;
            } catch (e) {
                // Formatting fallback if logo fails
                doc.rect(40, 40, 60, 60).fill(COLORS.primary);
                doc.fontSize(24).fillColor('white').text(storeSettings.name.charAt(0), 55, 55);
            }

            // Company Info (Right)
            doc.fontSize(20).font(FONTS.bold).fillColor(COLORS.primary)
                .text('INVOICE', 0, 40, { align: 'right', indent: 0 });

            doc.fontSize(9).font(FONTS.regular).fillColor(COLORS.text)
                .text(storeSettings.name, 0, 70, { align: 'right' })
                .text(storeSettings.address, 0, 82, { align: 'right' })
                .text(storeSettings.email, 0, 94, { align: 'right' })
                .text(storeSettings.phone, 0, 106, { align: 'right' });

            // --- ORDER METADATA BAR ---
            const metaTop = 140;
            doc.rect(40, metaTop, 515, 45).fill(COLORS.lightGray); // Background strip

            const drawMetaItem = (label, value, x) => {
                doc.fontSize(8).font(FONTS.bold).fillColor(COLORS.secondary).text(label.toUpperCase(), x, metaTop + 10);
                doc.fontSize(10).font(FONTS.regular).fillColor(COLORS.text).text(value, x, metaTop + 25);
            };

            drawMetaItem('Invoice No', `#${order.orderNumber}`, 60);
            drawMetaItem('Date', new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), 180);
            drawMetaItem('Status', order.isPaid ? 'PAID' : 'PENDING', 300);
            drawMetaItem('Total', `KES ${order.total.toLocaleString()}`, 450);

            // --- BILLING & SHIPPING ---
            const addressTop = 210;

            // Container for Bill To
            doc.fontSize(10).font(FONTS.bold).fillColor(COLORS.primary).text('BILL TO', 40, addressTop);
            doc.fontSize(9).font(FONTS.regular).fillColor(COLORS.text)
                .text(`${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`, 40, addressTop + 15)
                .text(order.shippingAddress.email, 40, addressTop + 27)
                .text(order.shippingAddress.phone, 40, addressTop + 39);

            // Container for Ship To (Right side)
            doc.fontSize(10).font(FONTS.bold).fillColor(COLORS.primary).text('SHIP TO', 300, addressTop);
            doc.fontSize(9).font(FONTS.regular).fillColor(COLORS.text)
                .text(order.shippingAddress.address, 300, addressTop + 15)
                .text(`${order.shippingAddress.city}, ${order.shippingAddress.county}`, 300, addressTop + 27)
                .text(order.shippingAddress.country || 'Kenya', 300, addressTop + 39);

            // --- ITEMS TABLE ---
            const tableTop = 300;
            const colX = { item: 40, size: 250, qty: 340, price: 400, total: 480 };

            // Header
            doc.rect(40, tableTop, 515, 25).fill(COLORS.primary);
            doc.fontSize(9).font(FONTS.bold).fillColor('white');
            doc.text('ITEM DESCRIPTION', colX.item + 10, tableTop + 8);
            doc.text('SIZE', colX.size, tableTop + 8);
            doc.text('QTY', colX.qty, tableTop + 8);
            doc.text('PRICE', colX.price, tableTop + 8);
            doc.text('TOTAL', colX.total, tableTop + 8);

            // Rows
            let y = tableTop + 35;
            doc.font(FONTS.regular).fillColor(COLORS.text);

            order.items.forEach((item, i) => {
                const itemTotal = item.price * item.quantity;

                // Row Background (Zebra optional, using line separation instead)
                doc.moveTo(40, y + 15).lineTo(555, y + 15).lineWidth(0.5).strokeColor(COLORS.border).stroke();

                doc.fontSize(9).text(item.name, colX.item + 10, y);
                doc.text(item.size || '-', colX.size, y);
                doc.text(item.quantity.toString(), colX.qty, y);
                doc.text(item.price.toLocaleString(), colX.price, y);
                doc.font(FONTS.bold).text(itemTotal.toLocaleString(), colX.total, y).font(FONTS.regular);

                y += 25;
            });

            // --- SUMMARY SECTION ---
            const summaryTop = y + 20;
            const summaryLeft = 350;
            const summaryRight = 480;

            doc.fontSize(9).fillColor(COLORS.text);

            // Helper for summary line
            const drawSummaryLine = (label, value, isBold = false, yPos) => {
                doc.font(isBold ? FONTS.bold : FONTS.regular).text(label, summaryLeft, yPos);
                doc.font(isBold ? FONTS.bold : FONTS.regular).text(value, summaryRight, yPos, { align: 'left' }); // Align left relative to the X point, essentially column
            };

            let currentY = summaryTop;
            drawSummaryLine('Subtotal', `KES ${order.subtotal.toLocaleString()}`, false, currentY);
            currentY += 15;

            drawSummaryLine('Shipping', `KES ${order.shippingCost.toLocaleString()}`, false, currentY);
            currentY += 15;

            const tax = order.total - order.subtotal - order.shippingCost;
            // Always show Tax line as requested (regulation)
            drawSummaryLine('Tax (VAT 0%)', `KES ${Math.max(0, tax).toLocaleString()}`, false, currentY);
            currentY += 15;

            // Divider
            doc.moveTo(summaryLeft, currentY + 5).lineTo(555, currentY + 5).lineWidth(1).strokeColor(COLORS.primary).stroke();
            currentY += 15;

            // Grand Total
            doc.fontSize(12).fillColor(COLORS.primary);
            drawSummaryLine('Grand Total', `KES ${order.total.toLocaleString()}`, true, currentY);

            // --- PAYMENTS & FOOTER ---
            const footerTop = 750; // Near bottom
            doc.fontSize(8).font(FONTS.regular).fillColor('#95a5a6');

            // Payment Info
            const paymentMethod = order.paymentMethod === 'mpesa' ? 'M-PESA' : (order.paymentMethod || 'Card').toUpperCase();
            const transactionId = order.transactionId || order.paymentResult?.id || 'N/A';

            doc.text(`Payment Method: ${paymentMethod} | Transaction ID: ${transactionId}`, 40, footerTop);

            // Thank you note
            doc.fontSize(10).fillColor(COLORS.primary)
                .text('Thank you for your business!', 0, footerTop + 20, { align: 'center' });

            doc.fontSize(8).fillColor('#95a5a6')
                .text('For questions, contact us at ' + storeSettings.email, 0, footerTop + 35, { align: 'center' });

            doc.end();

        } catch (error) {
            console.error('Invoice generation error:', error);
            if (res && !res.headersSent) res.status(500).send('Error generating invoice');
            else if (!res) reject(error);
        }
    });
};

export default generateInvoice;
