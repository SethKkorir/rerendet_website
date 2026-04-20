import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const testConnection = async () => {
  try {
    console.log('Connecting to MongoDB...');
    console.log('URI:', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected successfully');
    await mongoose.disconnect();
    console.log('Disconnected');
  } catch (err) {
    console.error('Error:', err.message);
  }
};

testConnection();