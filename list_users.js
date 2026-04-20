import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const listUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Define a minimal schema since we only need to query
        const UserSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
        const User = mongoose.model('User', UserSchema);

        const users = await User.find({}, 'email firstName lastName role userType').limit(10);
        console.log('--- Current Users (First 10) ---');
        console.table(users.map(u => ({
            email: u.email,
            name: `${u.firstName} ${u.lastName}`,
            role: u.role,
            userType: u.userType
        })));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

listUsers();
