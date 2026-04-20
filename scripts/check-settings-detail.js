import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Settings from '../models/Settings.js';

dotenv.config();

const checkSettingsDetail = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const settings = await Settings.getSettings();
        console.log('--- DB EMAIL CONFIG ---');
        console.log('Host:', settings.email.host);
        console.log('User:', settings.email.auth.user);
        console.log('Pass Length:', settings.email.auth.pass?.length || 0);
        console.log('----------------------');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkSettingsDetail();
