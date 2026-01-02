
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import connectDB from '../config/db.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const debugDuplicateEmail = async () => {
    try {
        await connectDB();

        // 1. Count users
        const count = await User.countDocuments();
        console.log(`📊 Total Users: ${count}`);

        // 2. Fetch all emails to see what we have
        const users = await User.find().select('email');
        console.log('📧 Existing Emails:', users.map(u => u.email));

        if (users.length === 0) {
            console.log('⚠️ No users found. Please create a user first.');
            process.exit();
        }

        // 3. Pick an existing email
        const targetEmail = users[0].email;
        console.log(`🎯 Testing duplicate check for: '${targetEmail}'`);

        // 4. Test Case Sensitive
        const exactMatch = await User.findOne({ email: targetEmail });
        console.log(`🔎 Exact match found?`, !!exactMatch);

        // 5. Test Case Insensitive (uppercase)
        const upperEmail = targetEmail.toUpperCase();
        const upperMatch = await User.findOne({ email: upperEmail }); // This might fail if no collation
        console.log(`🔎 Upper case match found?`, !!upperMatch);

        // 6. Test Normalized
        const normalizedMatch = await User.findOne({ email: upperEmail.toLowerCase() });
        console.log(`🔎 Normalized match found?`, !!normalizedMatch);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

debugDuplicateEmail();
