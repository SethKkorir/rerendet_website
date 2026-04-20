// scripts/checkLockedUsers.js
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from '../models/User.js';

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const now = new Date();
        const lockedUsers = await User.find({ lockUntil: { $gt: now } });
        console.log(`Found ${lockedUsers.length} locked users currently.`);
        for (let u of lockedUsers) {
            console.log(`- ${u.firstName} ${u.lastName} (${u.email}) - Locked until ${u.lockUntil}`);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
check();
