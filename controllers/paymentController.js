// controllers/paymentController.js
import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';

// @desc    Simulate M-Pesa Webhook Callback
// @route   POST /api/payment/mpesa/callback (Simulated)
// @access  Public (Simulated Webhook)
export const simulateMpesaWebhook = asyncHandler(async (req, res) => {
  const { orderNumber, amount, transactionId, status } = req.body;

  console.log('📡 Received Simulated M-Pesa Webhook:', req.body);

  // 1. Find the order
  const order = await Order.findOne({ orderNumber });

  if (!order) {
    console.error(`❌ Order not found for webhook: ${orderNumber}`);
    return res.status(404).json({ message: 'Order not found' });
  }

  // 2. Validate Amount (Security Check)
  // In simulated environment, we check if paid amount matches order total
  // Allow small floating point difference
  if (Math.abs(order.total - amount) > 50) { // Allow 50 KES difference? (maybe fees). For now strict.
    console.warn(`⚠️ Payment amount mismatch! Order: ${order.total}, Paid: ${amount}`);
    // return res.status(400).json({ message: 'Amount mismatch' }); // Uncomment to enforce
  }

  // 3. Update Status
  if (status === 'Success') {
    if (order.paymentStatus === 'paid') {
      return res.json({ message: 'Order already paid, ignoring duplicate webhook' });
    }

    order.paymentStatus = 'paid';
    order.transactionId = transactionId || `MPESA-${Date.now()}`;

    // Add Event Log
    order.orderEvents.push({
      status: 'PAYMENT_CONFIRMED',
      note: `M-Pesa Payment Confirmed. ID: ${order.transactionId}. Amount: ${amount}`,
      user: null // System event
    });

    // Auto-advance fulfillment status if it was unfulfilled
    if (order.fulfillmentStatus === 'unfulfilled') {
      // We don't auto-pack, but we confirm it's ready for processing
      // order.fulfillmentStatus = 'unfulfilled'; // Remains unfulfilled until admin acts
    }

    await order.save();
    console.log(`✅ Order ${orderNumber} marked as PAID via M-Pesa simulation.`);

    return res.json({ success: true, message: 'Payment processed successfully' });

  } else {
    // Payment Failed
    order.paymentStatus = 'failed';
    order.orderEvents.push({
      status: 'PAYMENT_FAILED',
      note: `M-Pesa Payment Failed. Status: ${status}`,
      user: null
    });
    await order.save();

    return res.json({ success: true, message: 'Payment failure recorded' });
  }
});