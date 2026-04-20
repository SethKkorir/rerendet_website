
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../models/Order.js';

dotenv.config();

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const totalOrders = await Order.countDocuments();
        console.log('Total Orders:', totalOrders);

        const paidOrders = await Order.countDocuments({ paymentStatus: 'paid' });
        console.log('Paid Orders:', paidOrders);

        const pendingOrders = await Order.countDocuments({ paymentStatus: 'pending' });
        console.log('Pending Orders:', pendingOrders);

        const sampleOrders = await Order.find().limit(5).select('createdAt paymentStatus total orderStatus items');
        console.log('Sample Orders:', JSON.stringify(sampleOrders, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkData();
