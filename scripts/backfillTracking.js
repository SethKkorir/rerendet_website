// scripts/backfillTracking.js
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Order from '../models/Order.js';

const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const backfill = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const orders = await Order.find({ trackingNumber: { $exists: false } });
        console.log(`Found ${orders.length} orders without tracking numbers`);

        for (let order of orders) {
            let randomPart = '';
            for (let i = 0; i < 3; i++) {
                randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            order.trackingNumber = `RC${randomPart}`;
            await order.save();
            console.log(`Generated tracking number for Order #${order.orderNumber}: ${order.trackingNumber}`);
        }

        console.log('Backfill complete!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

backfill();
