// routes/orderRoutes.js - WITH RATE LIMITING
import express from 'express';
import {
  createOrder,
  getUserOrders,
  getOrderById,
  getOrders,
  updateOrderStatus,
  calculateShippingCost,
  generateOrderInvoice,
  validateCoupon
} from '../controllers/orderController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { checkoutLimiter } from '../middleware/checkoutRateLimit.js';

const router = express.Router();

// Public routes
router.post('/shipping-cost', calculateShippingCost);

// Protected routes
router.use(protect);



// Customer routes - Apply rate limiting to checkout
router.post('/validate-coupon', validateCoupon);
router.post('/', checkoutLimiter, createOrder);
router.get('/my', getUserOrders);
router.get('/:id', getOrderById);
router.get('/:id/invoice', generateOrderInvoice);

// Admin routes
router.get('/', admin, getOrders);
router.put('/:id/status', admin, updateOrderStatus);

export default router;