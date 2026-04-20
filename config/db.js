// config/db.js
import mongoose from 'mongoose';

const connectDB = async () => {
  // Check if we have an existing connection
  if (mongoose.connections[0].readyState) {
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    // Don't exit process in serverless updates
    console.error('Failed to connect to MongoDB');
  }
};

export default connectDB;