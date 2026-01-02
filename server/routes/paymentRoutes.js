// routes/paymentRoutes.js
import express from 'express';
import {
  processCashOnDelivery,
  processAirtelPayment,
  getAirtelPaymentStatus,
  // processMpesaPayment, // Legacy mock, removing
  // processCardPayment,  // Legacy mock, removing
} from '../controllers/paymentController.js';

import {
  initiateMpesaPayment,
  mpesaCallback,
  checkMpesaPaymentStatus
} from '../controllers/mpesaController.js';

import {
  createPaymentIntent,
  handleStripeWebhook
} from '../controllers/stripeController.js';

import { protect } from '../middleware/authMiddleware.js';

import PaymentMethod from '../models/PaymentMethod.js';

const router = express.Router();

// --- MPESA Routes ---
router.post('/mpesa/stk-push', protect, initiateMpesaPayment);
router.post('/mpesa-callback', mpesaCallback);
router.get('/mpesa/status/:paymentId', checkMpesaPaymentStatus);


// --- Stripe Routes ---
router.post('/stripe/create-payment-intent', createPaymentIntent);
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);


// --- Other Payment Methods ---
router.post('/cash-on-delivery', processCashOnDelivery);

// Airtel Money (keeping existing logic for now)
router.post('/airtel/request', processAirtelPayment);
router.get('/airtel/status/:paymentId', getAirtelPaymentStatus);

// --- Payment Methods Management ---
router.get('/methods/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const paymentMethods = await PaymentMethod.find({
      user: userId,
      isActive: true
    }).sort({ isDefault: -1, createdAt: -1 });

    res.json({
      success: true,
      data: paymentMethods
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payment methods',
      error: error.message
    });
  }
});

router.patch('/methods/:methodId/set-default', async (req, res) => {
  try {
    const { methodId } = req.params;
    const { userId } = req.body;

    await PaymentMethod.updateMany(
      { user: userId },
      { $set: { isDefault: false } }
    );

    await PaymentMethod.findByIdAndUpdate(methodId, {
      isDefault: true
    });

    res.json({
      success: true,
      message: 'Default payment method updated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating default payment method',
      error: error.message
    });
  }
});

export default router;