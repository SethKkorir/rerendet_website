// config/db.js
import mongoose from 'mongoose';

const connectDB = async () => {
  // Check if we have an existing healthy connection
  if (mongoose.connections[0].readyState === 1) {
    console.log('✅ Using existing database connection');
    return;
  }

  try {
    console.log(`🔗 Connecting to MongoDB...`);
    
    const connectOptions = {
      maxPoolSize: 5,           // Smaller pool for serverless
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,                // Use IPv4
      retryWrites: true,
      w: 'majority'
    };

    const conn = await mongoose.connect(process.env.MONGO_URI, connectOptions);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    return conn;
  } catch (err) {
    console.error(`❌ MongoDB Connection Error: ${err.message}`);
    throw err; // Throw so caller knows connection failed
  }
};

export default connectDB;