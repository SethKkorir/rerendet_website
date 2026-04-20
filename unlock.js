import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from './models/User.js';

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const result = await User.updateMany(
            { lockUntil: { $exists: true, $ne: null } },
            { $set: { loginAttempts: 0, lockUntil: 1 } } // Set lockUntil to 1 or null to unlock. Let's just unset it.
        );
        await User.updateMany({}, { $unset: { lockUntil: "" }, $set: { loginAttempts: 0 } });
        console.log('All locked accounts have been successfully unlocked!');
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
})();
