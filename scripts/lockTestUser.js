// scripts/lockTestUser.js
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from '../models/User.js';

const lock = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ userType: 'customer' });
        if (!user) {
            console.log('No customer found to lock');
            process.exit(0);
        }
        const lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
        user.lockUntil = lockUntil;
        user.loginAttempts = 10;
        await user.save();
        console.log(`LOCKED user: ${user.firstName} ${user.lastName} (${user.email}) until ${lockUntil}`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
lock();
