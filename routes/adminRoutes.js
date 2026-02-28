// routes/adminRoutes.js - COMPLETE WITH ALL ENDPOINTS
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
  updateProductStock,
  getUsers,
  getContacts,
  updateContactStatus,
  replyContact,
  deleteContact,
  getSettings,
  updateSettings,
  getSalesAnalytics,
  getActivityLogs,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  testEmailConfig,
  checkNewOrders,
  getAdminOverview,
  getAbandonedCartsReport,
  getPaymentsReport,
  getCustomersReport,
  getInventoryReport,
  getCouponsReport,
  exportOrdersCSV,
  exportCustomersCSV
} from '../controllers/adminController.js';

const router = express.Router();

// All routes require authentication and admin privileges
router.use(protect, admin);

// ==================== ADMIN OVERVIEW ====================
router.get('/overview', getAdminOverview);

// ==================== ADMIN DASHBOARD STATS ====================
router.get('/dashboard/stats', adminAuth(['dashboard:view']), getDashboardStats);
router.get('/dashboard', (req, res) => res.json({
  success: true,
  data: { welcome: 'Welcome to Rerendet Coffee Admin', version: '2.0.0' }
}));

// ==================== ORDER MANAGEMENT ====================
router.get('/orders/status', adminAuth(['orders:manage']), checkNewOrders);
router.get('/orders', adminAuth(['orders:manage']), getOrders);
router.get('/orders/:id', adminAuth(['orders:manage']), getOrderDetail);
router.put('/orders/:id/status', adminAuth(['orders:update_status']), updateOrderStatus);

// ==================== PRODUCT MANAGEMENT ====================
router.get('/products', adminAuth(['products:manage']), getProducts);
router.post('/products', adminAuth(['products:manage']), upload.array('images', 5), createProduct);
router.put('/products/:id', adminAuth(['products:manage']), upload.array('images', 5), updateProduct);
router.patch('/products/:id/stock', adminAuth(['products:manage']), updateProductStock);
router.delete('/products/:id', adminAuth(['products:manage']), deleteProduct);

// ==================== USER MANAGEMENT ====================
router.get('/users', adminAuth(['users:view']), getUsers);
router.put('/users/:id/role', adminAuth(['users:manage']), updateUserRole);
router.put('/users/:id/status', adminAuth(['users:manage']), toggleUserStatus);
router.delete('/users/:id', adminAuth(['users:manage']), deleteUser);

// ==================== CONTACT MANAGEMENT ====================
router.get('/contacts', adminAuth(['contacts:manage']), getContacts);
router.put('/contacts/:id/status', adminAuth(['contacts:manage']), updateContactStatus);
router.post('/contacts/:id/reply', adminAuth(['contacts:manage']), replyContact);
router.delete('/contacts/:id', adminAuth(['contacts:manage']), deleteContact);

// ==================== SETTINGS MANAGEMENT ====================
router.get('/settings', adminAuth(['settings:manage']), getSettings);
router.put('/settings', adminAuth(['settings:manage']), updateSettings);
router.post('/settings/test-email', adminAuth(['settings:manage']), testEmailConfig);
router.post('/upload/logo', adminAuth(['settings:manage']), upload.single('logo'), asyncHandler(async (req, res) => {
  if (!req.file) { res.status(400); throw new Error('No logo file uploaded'); }
  res.json({ success: true, message: 'Logo uploaded successfully', data: { url: req.file.path } });
}));

// ==================== ANALYTICS ====================
router.get('/analytics/sales', adminAuth(['analytics:view']), getSalesAnalytics);
router.get('/logs', adminAuth(['logs:view']), getActivityLogs);

// ==================== EXTENDED REPORTS ====================
router.get('/reports/abandoned-carts', adminAuth(['analytics:view']), getAbandonedCartsReport);
router.get('/reports/payments', adminAuth(['analytics:view']), getPaymentsReport);
router.get('/reports/customers', adminAuth(['analytics:view']), getCustomersReport);
router.get('/reports/inventory', adminAuth(['analytics:view']), getInventoryReport);
router.get('/reports/coupons', adminAuth(['analytics:view']), getCouponsReport);

// ==================== CSV EXPORTS ====================
router.get('/export/orders', adminAuth(['analytics:view']), exportOrdersCSV);
router.get('/export/customers', adminAuth(['analytics:view']), exportCustomersCSV);

export default router;