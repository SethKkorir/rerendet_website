import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Ad from './models/Ad.js';

(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const ads = await Ad.find();
    console.log(JSON.stringify(ads, null, 2));
    mongoose.disconnect();
})();
