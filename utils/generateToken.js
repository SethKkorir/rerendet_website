import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const generateToken = (userId) => {
  // Check if JWT_SECRET is set, otherwise use a fallback (Critical for Vercel initial setup)
  const secret = process.env.JWT_SECRET || 'rerendet_coffee_secret_fallback_2024';

  if (!process.env.JWT_SECRET) {
    console.warn('⚠️ JWT_SECRET not set. Using fallback secret.');
  }

  try {
    const token = jwt.sign(
      { id: userId },
      secret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      }
    );

    console.log('✅ Token generated successfully for user:', userId);
    return token;
  } catch (error) {
    console.error('❌ Token generation failed:', error.message);
    throw new Error('Failed to generate authentication token');
  }
};

export default generateToken;