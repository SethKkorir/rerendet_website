// routes/authRoutes.js - CORRECTED VERSION
import express from 'express';
import {
  // Customer auth
  registerCustomer,
  loginCustomer,
  googleLogin,

  // Admin auth
  loginAdmin,
  createAdmin,

  // Common auth
  verifyEmail,
  verify2FALogin,
  toggle2FA,
  getCurrentUser,
  logout,
  checkEmail,
  forgotPassword,
  resetPassword,
  resendVerification,
  updateProfile,
  changePassword,
  deleteAccount,
  getCart,
  syncCart,
  requestWalletReveal,
  verifyWalletReveal
} from '../controllers/authController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

// Customer auth
router.post('/customer/register', registerCustomer);
router.post('/customer/login', loginCustomer);
router.post('/customer/verify-2fa', verify2FALogin);
router.post('/google', googleLogin);

// Admin auth
router.post('/admin/login', loginAdmin);
router.post('/admin/verify-2fa', verify2FALogin);

// Common auth
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/check-email', checkEmail);
router.post('/resend-verification', resendVerification);

// ==================== PROTECTED ROUTES ====================

// Protected User Routes
router.put('/profile', protect, updateProfile);
router.put('/toggle-2fa', protect, toggle2FA);
router.delete('/profile', protect, deleteAccount);
router.put('/change-password', protect, changePassword);

// Cart Routes
router.get('/cart', protect, getCart);
router.post('/cart', protect, syncCart);

// Common protected
router.get('/me', protect, getCurrentUser);
router.post('/logout', protect, logout);

// Admin management (admin only - using existing admin middleware)
router.post('/admin/create', protect, admin, createAdmin);

export default router;