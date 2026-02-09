// controllers/orderController.js - ENHANCED WITH SECURITY
import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { calculateShipping } from '../utils/shippingCalculator.js';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeObject, sanitizeEmail, sanitizePhone, sanitizeAmount } from '../utils/inputSanitizer.js';
import { sendEmail } from '../utils/emailService.js';
import { sendLowStockAlert } from '../utils/adminNotificationService.js';

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      shippingAddress,
      paymentMethod,
      items,
      subtotal,
      shippingCost,
      tax,
      totalAmount,
      notes
    } = req.body;

    const userId = req.user._id;

    // ✅ SECURITY: Block Admins from placing orders
    if (req.user.userType === 'admin' || req.user.role === 'admin' || req.user.role === 'super-admin') {
      console.warn('🚫 Admin attempted to create order:', req.user.email);
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: 'Administrators are not allowed to place orders. Please use a regular customer account.'
      });
    }

    console.log('🛒 Creating order for user:', userId);
    console.log('📦 Order items:', items?.length);

    // ✅ SECURITY: Sanitize shipping address to prevent XSS
    const sanitizedAddress = sanitizeObject(shippingAddress);
    sanitizedAddress.email = sanitizeEmail(shippingAddress.email);
    sanitizedAddress.phone = sanitizePhone(shippingAddress.phone);

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.warn('⚠️ No items in order:', items);
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Order items are required'
      });
    }

    if (!sanitizedAddress || !paymentMethod) {
      console.warn('⚠️ Missing address or payment method:', { hasAddress: !!sanitizedAddress, paymentMethod });
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Shipping address and payment method are required'
      });
    }

    if (!sanitizedAddress.email || !sanitizedAddress.phone) {
      console.warn('⚠️ Missing email or phone:', { email: sanitizedAddress.email, phone: sanitizedAddress.phone });
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Valid email and phone number are required'
      });
    }

    // ✅ SECURITY: Generate unique order number with UUID
    const uuid = uuidv4().split('-')[0].toUpperCase();
    const timestamp = Date.now().toString().slice(-8);
    const orderNumber = `ORD-${timestamp}-${uuid}`;

    // Process order items and validate stock
    let calculatedSubtotal = 0;
    const orderItems = [];
    const stockUpdates = [];

    for (const item of items) {
      // Validate item structure
      if (!item.product || !item.name || !item.price || !item.quantity || !item.size) {
        console.warn('⚠️ Invalid item data:', item);
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'Invalid item data. All item fields are required.'
        });
      }

      const product = await Product.findById(item.product).session(session);

      if (!product) {
        console.warn('⚠️ Product not found:', { id: item.product, name: item.name });
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.name}`
        });
      }

      // Check stock availability
      if (product.inventory.stock < item.quantity) {
        console.warn('⚠️ Stock failure:', { product: product.name, available: product.inventory.stock, requested: item.quantity });
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.inventory.stock}, Requested: ${item.quantity}`
        });
      }

      const itemPrice = parseFloat(product.sizes.find(s => s.size === item.size)?.price || product.price || item.price);
      const itemQuantity = parseInt(item.quantity);
      const itemTotal = itemPrice * itemQuantity;
      calculatedSubtotal += itemTotal;

      orderItems.push({
        product: product._id,
        name: item.name,
        price: itemPrice,
        quantity: itemQuantity,
        size: item.size,
        image: item.image || product.images?.[0]?.url || '/default-product.jpg',
        itemTotal: itemTotal
      });

      stockUpdates.push({
        productId: product._id,
        quantity: itemQuantity,
        currentStock: product.inventory.stock
      });
    }

    // ✅ SECURITY: Calculate final amounts and validate against client-provided total
    const finalSubtotal = sanitizeAmount(calculatedSubtotal);
    const finalShippingCost = sanitizeAmount(shippingCost);
    const finalTax = sanitizeAmount(finalSubtotal * 0.16); // 16% VAT
    const calculatedTotal = sanitizeAmount(finalSubtotal + finalShippingCost + finalTax);
    const clientTotal = sanitizeAmount(totalAmount);

    console.log('💰 Validating order amounts:', {
      itemsSubtotal: calculatedSubtotal,
      shipping: finalShippingCost,
      tax: finalTax,
      total: calculatedTotal
    });

    // Prevent price manipulation - verify client total matches server calculation
    // Allow small floating point differences (0.01)
    if (Math.abs(calculatedTotal - clientTotal) > 1.0) { // Increased tolerance to 1.0 for rounding issues, but still strict 
      await session.abortTransaction();
      session.endSession();
      console.warn(`⚠️ Price manipulation attempt detected: Client=${clientTotal}, Calculated=${calculatedTotal} (Subtotal=${finalSubtotal}, Shipping=${finalShippingCost}, Tax=${finalTax})`);
      return res.status(400).json({
        success: false,
        message: 'Order amount validation failed. Please refresh your cart and try again.',
        details: process.env.NODE_ENV === 'development' ? { clientTotal, calculatedTotal } : undefined
      });
    }

    const finalTotal = calculatedTotal;

    console.log('✅ Order amounts validated:', {
      subtotal: finalSubtotal,
      shipping: finalShippingCost,
      tax: finalTax,
      total: finalTotal
    });

    // Create order
    const order = new Order({
      orderNumber: orderNumber,
      user: userId,
      items: orderItems,
      shippingAddress: {
        firstName: sanitizedAddress.firstName,
        lastName: sanitizedAddress.lastName,
        email: sanitizedAddress.email,
        phone: sanitizedAddress.phone,
        address: sanitizedAddress.address,
        city: sanitizedAddress.city,
        county: sanitizedAddress.county,
        country: sanitizedAddress.country || 'Kenya',
        postalCode: sanitizedAddress.postalCode || ''
      },
      subtotal: finalSubtotal,
      shippingCost: finalShippingCost,
      tax: finalTax,
      total: finalTotal,
      paymentMethod: paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
      status: 'confirmed',
      notes: notes || '',
      trackingHistory: [
        {
          status: 'confirmed',
          message: 'Order received and confirmed',
          timestamp: new Date()
        }
      ]
    });

    console.log('📝 Saving order to database...');

    const savedOrder = await order.save({ session });

    // ✅ FIXED: Update product stock - SIMPLIFIED VERSION
    for (const update of stockUpdates) {
      const newStock = update.currentStock - update.quantity;

      const updatedProduct = await Product.findByIdAndUpdate(
        update.productId,
        {
          $inc: { 'inventory.stock': -update.quantity },
          $set: {
            inStock: newStock > 0
          }
        },
        { session, new: true } // Use new: true to get updated version for the alert
      );

      console.log(`📦 Updated stock for product ${update.productId}: ${update.currentStock} -> ${newStock}`);

      // SEND LOW STOCK ALERT
      if (updatedProduct && updatedProduct.inventory.stock <= updatedProduct.inventory.lowStockAlert) {
        sendLowStockAlert(updatedProduct).catch(err => console.error('Failed to send low stock email:', err));
      }
    }

    await session.commitTransaction();
    session.endSession();

    console.log('✅ Order saved successfully:', savedOrder.orderNumber);

    // Populate order for response
    const populatedOrder = await Order.findById(savedOrder._id)
      .populate('user', 'firstName lastName email phone')
      .populate('items.product', 'name images category');

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      data: populatedOrder
    });

    // Send order confirmation email (asynchronous, don't await/return)
    try {
      const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/account/orders/${savedOrder._id}`;

      // Try to get logo from settings, or default to standard path
      let logoUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/rerendet-logo.png`;
      try {
        const { default: Settings } = await import('../models/Settings.js');
        const settings = await Settings.getSettings();
        if (settings?.store?.logo) logoUrl = settings.store.logo;
      } catch (e) {
        // ignore settings load error
      }

      // Generate Invoice Buffer
      let invoiceBuffer = null;
      try {
        const { generateInvoice } = await import('../utils/invoiceGenerator.js');
        // Use populatedOrder to ensure we have all data needed (though savedOrder has mostly everything, populated references might be safer if used)
        invoiceBuffer = await generateInvoice(populatedOrder);
      } catch (invErr) {
        console.error('⚠️ Failed to generate invoce for email attachment:', invErr);
      }

      const emailData = {
        order: {
          ...savedOrder.toObject(),
          formattedDate: new Date(savedOrder.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          items: orderItems,
          shippingAddress: savedOrder.shippingAddress
        },
        dashboardUrl,
        logoUrl // Pass logo URL to template
      };

      const attachments = invoiceBuffer ? [{
        filename: `Invoice-${savedOrder.orderNumber}.pdf`,
        content: invoiceBuffer
      }] : [];

      sendEmail({
        to: savedOrder.shippingAddress.email,
        subject: `Order Confirmation - #${savedOrder.orderNumber}`,
        templateName: 'orderConfirmation',
        data: emailData,
        attachments: attachments
      });
    } catch (emailError) {
      console.error('📧 Background email sending error:', emailError);
    }

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error('❌ Order creation error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get user orders
// @route   GET /api/orders/my
// @access  Private
const getUserOrders = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    console.error('❌ getUserOrders: req.user is missing or incomplete', {
      hasUser: !!req.user,
      userId: req.user?._id
    });
    return res.status(401).json({
      success: false,
      message: 'Not authorized, user context missing'
    });
  }

  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;



  try {
    const [orders, total] = await Promise.all([
      Order.find({ user: userId })
        .populate('items.product', 'name images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments({ user: userId })
    ]);



    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  try {
    console.log('🔍 Fetching order:', req.params.id);
    console.log('👤 Current user:', {
      id: req.user._id,
      role: req.user.role, // or userType
      email: req.user.email
    });
    // Validate order ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const order = await Order.findById(req.params.id)
      .populate('user', 'firstName lastName email phone role')
      .populate('items.product', 'name images price category');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // FIXED: Check if order belongs to user or user is admin
    // Use req.user.role instead of req.user.userType
    const isOwner = order.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin'; // Changed from userType to role

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('❌ Get order by ID error:', error);

    // More specific error handling
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    search,
    startDate,
    endDate
  } = req.query;

  const skip = (page - 1) * limit;
  let filter = {};

  try {
    if (status && status !== 'all') {
      filter.status = status;
    }

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'user.firstName': { $regex: search, $options: 'i' } },
        { 'user.lastName': { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } }
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'firstName lastName email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, trackingNumber, adminNotes, location, message } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // ✅ STRICT STATUS TRANSITIONS
  // Defines what the NEXT status can be based on the CURRENT status
  const validTransitions = {
    'pending': ['confirmed', 'cancelled', 'processing'],
    'confirmed': ['processing', 'cancelled', 'shipped'], // Allow fast track
    'processing': ['shipped', 'cancelled'],
    'shipped': ['delivered', 'returned'],
    'delivered': ['returned'], // Cannot be cancelled once delivered
    'cancelled': [], // Terminal state
    'returned': [] // Terminal state
  };

  // Check if status is actually changing
  if (status && order.status !== status) {
    const allowed = validTransitions[order.status] || [];

    // Exception: Admin correcting a mistake? 
    // For now, strict as requested. "which should not be like that"
    if (!allowed.includes(status)) {
      res.status(400);
      throw new Error(`Invalid status transition. Cannot change order from '${order.status}' to '${status}'.`);
    }
  }

  // ✅ VALIDATION: Tracking Number
  if (status === 'shipped') {
    if (!trackingNumber && !order.trackingNumber) {
      res.status(400);
      throw new Error('Tracking number is required when marking an order as shipped.');
    }
  }

  // Update fields
  if (status) order.status = status;
  if (trackingNumber) order.trackingNumber = trackingNumber;
  if (adminNotes) order.adminNotes = adminNotes;
  order.statusUpdatedAt = new Date();

  // Add to history
  order.trackingHistory.push({
    status: status || order.status,
    location: location || '',
    message: message || `Order status updated to ${status}${trackingNumber ? '. Tracking: ' + trackingNumber : ''}`,
    timestamp: new Date()
  });

  const updatedOrder = await order.save();

  // Re-populate for frontend consistency
  await updatedOrder.populate('user', 'firstName lastName email');

  // SEND EMAIL NOTIFICATION
  try {
    const { getOrderStatusEmail } = await import('../utils/emailTemplates.js');

    // Fetch store logo
    let logoUrl;
    try {
      const { default: Settings } = await import('../models/Settings.js');
      const settings = await Settings.getSettings();
      logoUrl = settings?.store?.logo;
    } catch (e) {
      // ignore
    }

    const emailHtml = getOrderStatusEmail(
      updatedOrder.user.firstName,
      updatedOrder.orderNumber,
      updatedOrder.status,
      updatedOrder.trackingNumber,
      message, // Use the custom message from admin if provided
      logoUrl
    );

    // Dynamic subject based on status
    const subject = `Order ${updatedOrder.status === 'shipped' ? 'Shipped' : 'Update'} - #${updatedOrder.orderNumber}`;

    await sendEmail({
      to: updatedOrder.user.email,
      subject: subject,
      html: emailHtml
    });

    console.log(`📧 Status update email sent to ${updatedOrder.user.email}`);
  } catch (emailError) {
    console.error('❌ Failed to send status update email:', emailError);
    // Don't fail the request, just log it
  }

  res.json({
    success: true,
    message: 'Order status updated successfully',
    data: updatedOrder
  });
});

// @desc    Calculate shipping cost
// @route   POST /api/orders/shipping-cost
// @access  Public
const calculateShippingCost = asyncHandler(async (req, res) => {
  const { country, county } = req.body;

  if (!country || !county) {
    return res.status(400).json({
      success: false,
      message: 'Country and county are required'
    });
  }

  try {
    const shippingCost = calculateShipping({ country, county });

    res.json({
      success: true,
      data: {
        shippingCost,
        currency: 'KES'
      }
    });
  } catch (error) {
    console.error('Calculate shipping error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate shipping cost'
    });
  }
});

// @desc    Generate PDF invoice for order
// @route   GET /api/orders/:id/invoice
// @access  Private
const generateOrderInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'firstName lastName email');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Check if user owns the order or is admin
  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to access this invoice');
  }

  // Import invoice generator
  const { default: generateInvoice } = await import('../utils/invoiceGenerator.js');

  // Generate and stream PDF
  generateInvoice(order, res);
});

export {
  createOrder,
  getUserOrders,
  getOrderById,
  getOrders,
  updateOrderStatus,
  calculateShippingCost,
  generateOrderInvoice
};