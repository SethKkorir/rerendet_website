// routes/adminRoutes.js - UPDATED WITH PROPER SETTINGS & ANALYTICS
import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, admin } from '../middleware/authMiddleware.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { upload } from '../middleware/uploadMiddleware.js';
import {
  getDashboardStats,
  getOrders,
  getOrderDetail,
  updateOrderStatus,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getUsers,
  getContacts,
  updateContactStatus,
  deleteContact,
  getSettings,
  updateSettings,
  getSalesAnalytics,
  getActivityLogs,
  updateUserRole,
  deleteUser,
  testEmailConfig,
  checkNewOrders,
  getPayments
} from '../controllers/adminController.js';

const router = express.Router();

// All routes require authentication and admin privileges
router.use(protect, admin);

// ==================== ADMIN DASHBOARD STATS ====================
router.get('/dashboard/stats', adminAuth(['dashboard:view']), getDashboardStats);

// ==================== ORDER MANAGEMENT ====================
router.get('/orders/status', adminAuth(['orders:manage']), checkNewOrders);
router.get('/orders', adminAuth(['orders:manage']), getOrders);
router.get('/orders/:id', adminAuth(['orders:manage']), getOrderDetail);
router.put('/orders/:id/status', adminAuth(['orders:update_status']), updateOrderStatus);

// ==================== PAYMENTS MANAGEMENT ====================
router.get('/payments', adminAuth(['orders:manage']), getPayments);

// ==================== PRODUCT MANAGEMENT ====================
router.get('/products', adminAuth(['products:manage']), getProducts);
router.post('/products', adminAuth(['products:manage']), upload.array('images', 5), createProduct);
router.put('/products/:id', adminAuth(['products:manage']), upload.array('images', 5), updateProduct);
router.delete('/products/:id', adminAuth(['products:manage']), deleteProduct);

// ==================== USER MANAGEMENT ====================
router.get('/users', adminAuth(['users:view']), getUsers);
router.put('/users/:id/role', adminAuth(['users:manage']), updateUserRole);
router.delete('/users/:id', adminAuth(['users:manage']), deleteUser);

// ==================== CONTACT MANAGEMENT ====================
router.get('/contacts', adminAuth(['contacts:manage']), getContacts);
router.put('/contacts/:id/status', adminAuth(['contacts:manage']), updateContactStatus);
router.delete('/contacts/:id', adminAuth(['contacts:manage']), deleteContact);

// ==================== SETTINGS MANAGEMENT ====================
router.get('/settings', adminAuth(['settings:manage']), getSettings);
router.put('/settings', adminAuth(['settings:manage']), updateSettings);
router.post('/upload/logo', adminAuth(['settings:manage']), upload.single('logo'), asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No logo file uploaded');
  }

  const logoUrl = req.file.path;

  res.json({
    success: true,
    message: 'Logo uploaded successfully',
    data: { url: logoUrl }
  });
}));

// ==================== ANALYTICS ====================
router.get('/analytics/sales', adminAuth(['analytics:view']), getSalesAnalytics);
router.get('/logs', adminAuth(['users:manage']), getActivityLogs); // Restricted to higher level admins

// ==================== ADMIN DASHBOARD ====================
router.get('/dashboard', (req, res) => {
  res.json({
    success: true,
    message: 'Admin dashboard',
    data: {
      welcome: 'Welcome to Rerendet Coffee Admin Dashboard',
      version: '1.0.0'
    }
  });
});

export default router;