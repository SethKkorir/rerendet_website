import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import PaymentTransaction from '../models/PaymentTransaction.js';

// @desc    Process Card Payment
// @route   POST /api/payments/card
// @access  Private
export const processCardPayment = asyncHandler(async (req, res) => {
  const { orderId, cardDetails } = req.body;

  console.log(`💳 Processing Card Payment for Order: ${orderId}`);

  // 1. Find the order
  const order = await Order.findById(orderId);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  // 2. Security Check: Prevent double payment
  if (order.paymentStatus === 'paid') {
    return res.status(400).json({ success: false, message: 'Order is already paid' });
  }

  // 3. Simulate Payment Processing (In production, integrate with Stripe/Flutterwave here)
  const isSuccessful = true; // Simulated success for dev
  const transactionId = `STRP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  // 4. Create Transaction Record
  const transaction = await PaymentTransaction.create({
    order: order._id,
    provider: 'STRIPE',
    transactionId: transactionId,
    amount: order.total,
    currency: 'KES',
    status: isSuccessful ? 'SUCCESS' : 'FAILED',
    rawResponse: { simulation: true, method: 'card' },
    metadata: {
      cardBrand: cardDetails?.brand || 'visa',
      last4: cardDetails?.cardNumber?.slice(-4) || 'XXXX'
    }
  });

  if (isSuccessful) {
    order.paymentStatus = 'paid';
    order.transactionId = transactionId;
    order.orderEvents.push({
      status: 'PAYMENT_CONFIRMED',
      note: `Card payment successful via Stripe simulator. Transaction: ${transactionId}`,
      user: req.user?._id
    });

    await order.save();

    console.log(`✅ Order ${order.orderNumber} PAID via Card. Transaction: ${transactionId}`);
    return res.json({
      success: true,
      message: 'Card payment processed successfully',
      data: { transactionId, transaction: transaction._id }
    });
  } else {
    order.paymentStatus = 'failed';
    order.orderEvents.push({
      status: 'PAYMENT_FAILED',
      note: 'Card payment failed at gateway simulation',
      user: req.user?._id
    });
    await order.save();
    return res.status(400).json({ success: false, message: 'Card payment failed' });
  }
});

// @desc    Process M-Pesa Express (STK Push)
// @route   POST /api/payments/mpesa/stk
// @access  Private
export const processMpesaPayment = asyncHandler(async (req, res) => {
  const { orderId, phoneNumber } = req.body;

  console.log(`📱 Initiating M-Pesa STK Push for Order: ${orderId} to ${phoneNumber}`);

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  // Simulate triggering STK Push
  // In real implementation, call Daraja API here

  // Create a PENDING transaction record
  const transactionId = `MPESA-STK-${Date.now()}`;
  await PaymentTransaction.create({
    order: order._id,
    provider: 'MPESA',
    transactionId: transactionId,
    amount: order.total,
    currency: 'KES',
    status: 'PENDING',
    rawResponse: { simulation: true, method: 'stk_push' },
    metadata: { phoneNumber }
  });

  order.orderEvents.push({
    status: 'PAYMENT_INITIATED',
    note: `M-Pesa STK Push initiated for ${phoneNumber}. Ext ID: ${transactionId}`,
    user: req.user?._id
  });

  await order.save();

  res.json({
    success: true,
    message: 'STK Push initiated successfully. Please check your phone.'
  });
});

// @desc    Simulate M-Pesa Webhook Callback
// @route   POST /api/payments/mpesa/callback (Simulated)
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

  // 2. Update Transaction record if exists
  const existingTx = await PaymentTransaction.findOne({ order: order._id, provider: 'MPESA' }).sort({ createdAt: -1 });
  if (existingTx) {
    existingTx.status = status === 'Success' ? 'SUCCESS' : 'FAILED';
    existingTx.rawResponse = { ...existingTx.rawResponse, webhook: req.body };
    if (transactionId) existingTx.transactionId = transactionId;
    await existingTx.save();
  } else if (status === 'Success') {
    // Create new if none exists but successful
    await PaymentTransaction.create({
      order: order._id,
      provider: 'MPESA',
      transactionId: transactionId || `MPESA-WEB-${Date.now()}`,
      amount: amount || order.total,
      status: 'SUCCESS',
      rawResponse: req.body
    });
  }

  // 3. Update Order Status
  if (status === 'Success') {
    if (order.paymentStatus === 'paid') {
      return res.json({ message: 'Order already paid, ignoring duplicate webhook' });
    }

    order.paymentStatus = 'paid';
    order.transactionId = transactionId || `MPESA-${Date.now()}`;

    // Add Event Log
    order.orderEvents.push({
      status: 'PAYMENT_CONFIRMED',
      note: `M-Pesa Payment Confirmed via Webhook. ID: ${order.transactionId}. Amount: ${amount}`,
      user: null // System event
    });

    await order.save();
    console.log(`✅ Order ${orderNumber} marked as PAID via M-Pesa simulation.`);

    return res.json({ success: true, message: 'Payment processed successfully' });

  } else {
    // Payment Failed
    order.paymentStatus = 'failed';
    order.orderEvents.push({
      status: 'PAYMENT_FAILED',
      note: `M-Pesa Payment Failed via Webhook. Status: ${status}`,
      user: null
    });
    await order.save();

    return res.json({ success: true, message: 'Payment failure recorded' });
  }
});