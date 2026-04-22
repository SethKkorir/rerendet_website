// api/test.js - Debug endpoint to test admin login
import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Test route to check if admin exists and password is correct
router.post('/test-admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password required' 
      });
    }

    console.log('🧪 Test endpoint - checking admin:', email);

    // Find admin
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found',
        debugInfo: { email, searchedFor: 'any user with this email' }
      });
    }

    console.log('✅ User found:', {
      email: user.email,
      userType: user.userType,
      role: user.role,
      isVerified: user.isVerified,
      isActive: user.isActive,
      hasPassword: !!user.password
    });

    // Try password comparison
    const isMatch = await bcrypt.compare(password, user.password);
    
    const response = {
      success: true,
      user: {
        id: user._id,
        email: user.email,
        userType: user.userType,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
        firstName: user.firstName
      },
      passwordMatch: isMatch,
      message: isMatch ? 'Password matches! Login should work.' : 'Password does not match'
    };

    console.log('🧪 Test result:', response);
    res.json(response);

  } catch (err) {
    console.error('❌ Test endpoint error:', err.message, err.stack);
    res.status(500).json({ 
      success: false, 
      message: err.message,
      stack: err.stack 
    });
  }
});

// Test DB connection with detailed diagnostics
router.get('/db-status', async (req, res) => {
  try {
    const readyState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    const isConnected = readyState === 1;
    
    let adminCount = 0;
    let totalUsers = 0;
    
    if (isConnected) {
      try {
        adminCount = await User.countDocuments({ userType: 'admin' });
        totalUsers = await User.countDocuments();
      } catch (queryErr) {
        console.error('Query error:', queryErr.message);
      }
    }

    const response = {
      success: true,
      database: {
        state: states[readyState],
        connected: isConnected,
        host: mongoose.connection.host,
        database: mongoose.connection.name,
        readyState: readyState
      },
      adminCount,
      totalUsers,
      mongoUri: process.env.MONGO_URI ? process.env.MONGO_URI.split('@')[0] + '@...' : 'Not set',
      environment: process.env.NODE_ENV || 'development',
      vercel: !!process.env.VERCEL
    };

    console.log('📊 DB Status:', response);
    res.json(response);
  } catch (err) {
    console.error('❌ DB status check error:', err.message);
    res.status(500).json({
      success: false,
      message: err.message,
      mongoUri: process.env.MONGO_URI ? 'Set' : 'Not set',
      mongoUriPrefix: process.env.MONGO_URI ? process.env.MONGO_URI.split('@')[0] + '@...' : null
    });
  }
});

export default router;
