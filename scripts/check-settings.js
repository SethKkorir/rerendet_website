import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Settings from '../models/Settings.js';

dotenv.config();

const checkSettings = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const settings = await Settings.getSettings();
        console.log('--- DATABASE EMAIL SETTINGS ---');
        console.log('Enabled:', settings.email.enabled);
        console.log('Host:', settings.email.host || '(empty - will use .env fallback)');
        console.log('User:', settings.email.auth.user);
        console.log('------------------------------');

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

checkSettings();
