import express from 'express';
import {
    simulateMpesaWebhook,
    processCardPayment,
    processMpesaPayment
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public webhook (called by simulated provider)
router.post('/mpesa/callback', simulateMpesaWebhook);

// Protected payment routes (called by frontend)
router.post('/card', protect, processCardPayment);
router.post('/mpesa/stk', protect, processMpesaPayment);

export default router;