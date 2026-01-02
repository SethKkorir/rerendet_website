
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../models/Order.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const checkOrders = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to DB');

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        console.log(`🔍 Searching for orders since: ${thirtyDaysAgo.toISOString()}`);

        const stats = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        status: "$status",
                        paymentStatus: "$paymentStatus"
                    },
                    count: { $sum: 1 },
                    dates: { $push: "$createdAt" }
                }
            }
        ]);

        console.log('\n📊 Order Summary (Last 30 Days):');
        if (stats.length === 0) {
            console.log('❌ No orders found in the last 30 days.');
        } else {
            stats.forEach(stat => {
                console.log(`\nStatus: ${stat._id.status || 'N/A'} | Payment: ${stat._id.paymentStatus || 'N/A'}`);
                console.log(`Count: ${stat.count}`);
                console.log(`Sample Date: ${stat.dates[0]}`);
            });
        }

        const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(3).select('status paymentStatus createdAt total orderNumber');
        console.log('\n📝 3 Most Recent Orders (Any time):');
        console.table(recentOrders.map(o => ({
            Order: o.orderNumber,
            Date: o.createdAt?.toISOString().split('T')[0],
            Status: o.status,
            Payment: o.paymentStatus,
            Total: o.total
        })));

        process.exit();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

checkOrders();
