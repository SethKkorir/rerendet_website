import express from 'express';
import { simulateMpesaWebhook } from '../controllers/paymentController.js';

const router = express.Router();

router.post('/mpesa/callback', simulateMpesaWebhook);

export default router;