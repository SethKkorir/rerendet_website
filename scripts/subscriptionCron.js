// scripts/subscriptionCron.js
import cron from 'node-cron';
import Subscription from '../models/Subscription.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * DAILY CRON JOB: Runs at midnight
 * Identifies due subscriptions and creates orders
 */
const startSubscriptionCron = () => {
    // schedule for 00:00 every day
    cron.schedule('0 0 * * *', async () => {
        console.log('⏰ Running daily subscription processing...');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        try {
            // 1. Find all active subscriptions due today
            const dueSubscriptions = await Subscription.find({
                status: 'active',
                nextBillingDate: { $lte: today }
            });

            console.log(`Found ${dueSubscriptions.length} subscriptions due for renewal.`);

            for (const sub of dueSubscriptions) {
                try {
                    // 2. Load latest product price
                    const product = await Product.findById(sub.product);
                    if (!product || !product.isActive || product.inventory.stock < sub.quantity) {
                        console.error(`Subscription ${sub._id} failed: Product unavailable or out of stock.`);
                        continue;
                    }

                    const price = product.sizes.find(s => s.size === sub.size)?.price || product.price;
                    const subtotal = price * sub.quantity;
                    const discount = (subtotal * (product.subscriptionDiscount || 10)) / 100;
                    const total = subtotal - discount; // Apply subscription discount

                    // 3. Create a new Order
                    const orderNumber = `SUB-${Date.now()}-${uuidv4().split('-')[0].toUpperCase()}`;

                    const newOrder = await Order.create({
                        orderNumber,
                        user: sub.user,
                        items: [{
                            product: sub.product,
                            name: `${product.name} (Subscription)`,
                            price: price,
                            quantity: sub.quantity,
                            size: sub.size,
                            image: product.images?.[0]?.url,
                            itemTotal: subtotal
                        }],
                        shippingAddress: sub.shippingAddress,
                        subtotal,
                        total,
                        paymentMethod: sub.paymentMethod,
                        paymentStatus: 'pending', // Automatic verification needed
                        orderStatus: 'open',
                        notes: `Recurring subscription renewal for ${sub.frequency} delivery.`
                    });

                    // 4. Update Subscription dates
                    sub.lastBillingDate = today;
                    sub.nextBillingDate = Subscription.calculateNextDate(sub.frequency);
                    await sub.save();

                    console.log(`✅ Success: Generated Order ${newOrder.orderNumber} for Subscription ${sub._id}`);

                } catch (subError) {
                    console.error(`❌ Error processing subscription ${sub._id}:`, subError.message);
                }
            }
        } catch (globalError) {
            console.error('❌ Global error in subscription cron:', globalError);
        }
    });
};

export default startSubscriptionCron;
