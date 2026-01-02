// controllers/mpesaController.js
import axios from 'axios';
import crypto from 'crypto';
import Payment from '../models/PaymentTransaction.js';
import Order from '../models/Order.js';
import asyncHandler from 'express-async-handler';

// M-Pesa Configuration
const MPESA_CONFIG = {
  consumerKey: process.env.MPESA_CONSUMER_KEY?.trim(),
  consumerSecret: process.env.MPESA_CONSUMER_SECRET?.trim(),
  shortCode: process.env.MPESA_SHORTCODE?.trim(),
  passkey: process.env.MPESA_PASSKEY?.trim(),
  callbackURL: (process.env.MPESA_CALLBACK_URL || `${process.env.BASE_URL}/api/payments/mpesa-callback`)?.trim(),
  environment: (process.env.MPESA_ENVIRONMENT || 'sandbox').split('#')[0].trim() // Handle potential inline comments
};

// Generate M-Pesa access token
const generateMpesaAccessToken = async () => {
  try {
    const auth = Buffer.from(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`).toString('base64');

    const response = await axios.get(
      MPESA_CONFIG.environment === 'production'
        ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
        : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`
        }
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error('M-Pesa Access Token Error:', error.response?.data || error.message);
    throw new Error('Failed to generate M-Pesa access token');
  }
};

// Generate M-Pesa password
const generateMpesaPassword = () => {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
  const password = Buffer.from(`${MPESA_CONFIG.shortCode}${MPESA_CONFIG.passkey}${timestamp}`).toString('base64');
  return { password, timestamp };
};

// @desc    Initiate M-Pesa STK Push
// @route   POST /api/payments/mpesa/stk-push
// @access  Private
const initiateMpesaPayment = asyncHandler(async (req, res) => {
  const { orderId, phoneNumber } = req.body;

  if (!phoneNumber) {
    res.status(400);
    throw new Error('Phone number is required');
  }

  // Format phone number (2547...)
  const formattedPhone = formatPhoneNumber(phoneNumber);

  // Get order details
  const order = await Order.findById(orderId).populate('user', 'firstName lastName');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Generate transaction reference
  const transactionRef = `RCD${order.orderNumber}${Date.now().toString().slice(-6)}`;

  // DEBUG LOG
  console.log('🦁 M-Pesa Order Fetch:', {
    id: order._id,
    orderNumber: order.orderNumber,
    total: order.total,
    totalPrice: order.totalPrice, // Check if this exists
    paymentStatus: order.paymentStatus
  });

  try {
    const accessToken = await generateMpesaAccessToken();
    const { password, timestamp } = generateMpesaPassword();

    const stkPushData = {
      BusinessShortCode: MPESA_CONFIG.shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(order.total),
      PartyA: formattedPhone,
      PartyB: MPESA_CONFIG.shortCode,
      PhoneNumber: formattedPhone,
      CallBackURL: MPESA_CONFIG.callbackURL,
      AccountReference: transactionRef,
      TransactionDesc: `Payment for order ${order.orderNumber}`
    };

    const response = await axios.post(
      MPESA_CONFIG.environment === 'production'
        ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
        : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      stkPushData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Create payment record
    const payment = await Payment.create({
      order: orderId,
      provider: 'MPESA',
      transactionId: transactionRef,
      amount: order.total,
      currency: 'KES',
      status: 'PENDING',
      metadata: {
        user: req.user._id,
        phoneNumber: formattedPhone,
        checkoutRequestID: response.data.CheckoutRequestID
      }
    });

    res.json({
      success: true,
      message: 'M-Pesa payment initiated successfully',
      data: {
        checkoutRequestID: response.data.CheckoutRequestID,
        customerMessage: response.data.CustomerMessage,
        paymentId: payment._id
      }
    });

  } catch (error) {
    console.error('M-Pesa STK Push Error:', error.response?.data || error.message);

    // Create failed payment record
    await Payment.create({
      order: orderId,
      provider: 'MPESA',
      transactionId: transactionRef,
      amount: order.total,
      currency: 'KES',
      status: 'FAILED',
      metadata: {
        user: req.user?._id,
        phoneNumber: formattedPhone,
        failureReason: error.response?.data?.errorMessage || error.message || 'M-Pesa payment initiation failed'
      }
    });

    res.status(500).json({
      success: false,
      message: error.response?.data?.errorMessage || 'Failed to initiate M-Pesa payment'
    });
  }
});

// @desc    M-Pesa payment callback
// @route   POST /api/payments/mpesa-callback
// @access  Public (called by M-Pesa)
const mpesaCallback = asyncHandler(async (req, res) => {
  const callbackData = req.body;

  // Send immediate response to M-Pesa
  res.json({
    ResultCode: 0,
    ResultDesc: 'Accepted'
  });

  // Process callback asynchronously
  processMpesaCallback(callbackData);
});

// Process M-Pesa callback
const processMpesaCallback = async (callbackData) => {
  try {
    const resultCode = callbackData.Body.stkCallback.ResultCode;
    const resultDesc = callbackData.Body.stkCallback.ResultDesc;
    const callbackMetadata = callbackData.Body.stkCallback.CallbackMetadata;
    const checkoutRequestID = callbackData.Body.stkCallback.CheckoutRequestID;

    if (resultCode === 0) {
      // Payment successful
      const metadataItems = callbackMetadata.Item;

      let mpesaReceiptNumber, transactionDate;

      metadataItems.forEach(item => {
        switch (item.Name) {
          case 'MpesaReceiptNumber':
            mpesaReceiptNumber = item.Value;
            break;
          case 'TransactionDate':
            transactionDate = item.Value;
            break;
        }
      });

      // Find payment by checkoutRequestID
      const payment = await Payment.findOne({
        'metadata.checkoutRequestID': checkoutRequestID
      });

      if (payment) {
        payment.status = 'SUCCESS';
        payment.metadata = {
          ...payment.metadata,
          mpesaReceiptNumber,
          transactionDate,
          callbackData
        };
        await payment.save();

        // Update order status
        await Order.findByIdAndUpdate(payment.order, {
          isPaid: true,
          paidAt: new Date(),
          status: 'processing', // User requested single status 'processing' for paid orders implies moving forward
          paymentStatus: 'paid',
          paymentResult: {
            id: mpesaReceiptNumber,
            status: 'completed',
            update_time: new Date().toISOString()
          }
        });

        console.log(`M-Pesa payment completed for order: ${payment.order}`);
      }
    } else {
      // Payment failed
      const payment = await Payment.findOne({
        'metadata.checkoutRequestID': checkoutRequestID
      });

      if (payment) {
        payment.status = 'FAILED';
        payment.metadata = {
          ...payment.metadata,
          failureReason: resultDesc,
          callbackData
        };
        await payment.save();

        console.log(`M-Pesa payment failed for order: ${payment.order}, Reason: ${resultDesc}`);
      }
    }
  } catch (error) {
    console.error('Error processing M-Pesa callback:', error);
  }
};

// @desc    Check M-Pesa payment status
// @route   GET /api/payments/mpesa/status/:paymentId
// @access  Private
const checkMpesaPaymentStatus = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.paymentId)
    .populate('order');

  if (!payment) {
    res.status(404);
    throw new Error('Payment not found');
  }

  res.json({
    success: true,
    data: payment
  });
});

// Helper function to format phone number
// Helper function to format phone number
const formatPhoneNumber = (phone) => {
  if (!phone) return '';

  // Remove all non-numeric characters
  let cleaned = phone.toString().replace(/\D/g, '');

  // Handle 07XX... -> 2547XX...
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  }
  // Handle 2540XX... -> 254XX... (Fix double prefix)
  else if (cleaned.startsWith('2540')) {
    cleaned = '254' + cleaned.substring(4);
  }
  // Handle 7XX... -> 2547XX...
  else if (cleaned.startsWith('7') && cleaned.length === 9) {
    cleaned = '254' + cleaned;
  }
  // If it starts with 254, assume it's good (unless 2540 which is caught above)
  else if (!cleaned.startsWith('254')) {
    cleaned = '254' + cleaned;
  }

  return cleaned;
};

export {
  initiateMpesaPayment,
  mpesaCallback,
  checkMpesaPaymentStatus
};