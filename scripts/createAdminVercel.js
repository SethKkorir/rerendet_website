// scripts/createAdminVercel.js - Run this to create admin in Vercel database
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const createAdmin = async () => {
  try {
    console.log('🔗 Connecting to Vercel MongoDB...');
    console.log('URI:', process.env.MONGO_URI);
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    // Check if admin already exists
    const adminExists = await User.findOne({ email: 'admin@rerendetcoffee.com' });
    
    if (adminExists) {
      console.log('✅ Admin user already exists');
      console.log('📧 Email:', adminExists.email);
      console.log('👤 User Type:', adminExists.userType);
      console.log('🎯 Role:', adminExists.role);
      console.log('✔️ Verified:', adminExists.isVerified);
      console.log('🔒 Active:', adminExists.isActive);
    } else {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin123!', salt);

      // Create admin user
      const adminUser = await User.create({
        firstName: 'Super',
        lastName: 'Admin',
        email: 'admin@rerendetcoffee.com',
        password: hashedPassword,
        phone: '+254700000000',
        userType: 'admin',
        role: 'super-admin',
        isVerified: true,
        isActive: true,
        adminPermissions: {
          canManageUsers: true,
          canManageProducts: true,
          canManageOrders: true,
          canManageContent: true
        }
      });
      
      console.log('✅ Admin user created successfully!');
      console.log('📧 Email: admin@rerendetcoffee.com');
      console.log('🔑 Password: Admin123!');
      console.log('👤 User Type: admin');
      console.log('🎯 Role: super-admin');
      console.log('⚠️  Please change the password after first login!');
    }
    
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

createAdmin();
