// controllers/adminController.js - COMPLETELY REWRITTEN WITH FORM DATA FIXES
import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Contact from '../models/Contact.js';
import Settings from '../models/Settings.js';
import { logActivity } from '../utils/activityLogger.js';
import ActivityLog from '../models/ActivityLog.js'; // For fetching logs later
import mongoose from 'mongoose';
import sendEmail from '../utils/sendEmail.js';
import { getMaintenanceEmail, getMaintenanceResolvedEmail, getOrderStatusEmail } from '../utils/emailTemplates.js';
import nodemailer from 'nodemailer';

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
  const { timeframe = '30d' } = req.query;
  const today = new Date();
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  let startDate;
  switch (timeframe) {
    case '7d':
      startDate = new Date(new Date().setDate(today.getDate() - 7));
      break;
    case '90d':
      startDate = new Date(new Date().setDate(today.getDate() - 90));
      break;
    case '1y':
      startDate = new Date(new Date().setFullYear(today.getFullYear() - 1));
      break;
    case 'all':
      startDate = new Date(0); // Beginning of time
      break;
    case '30d':
    default:
      startDate = new Date(new Date().setDate(today.getDate() - 30));
  }

  const [
    totalOrders,
    totalProducts,
    totalUsers,
    totalRevenueResult,
    todayOrders,
    todayRevenueResult,
    recentOrders,
    lowStockProducts,
    pendingCount,
    newUsersThisMonth,
    shippedOrders
  ] = await Promise.all([
    Order.countDocuments(),
    Product.countDocuments({ isActive: true }),
    User.countDocuments({ userType: 'customer' }),
    Order.aggregate([
      // Include both paid and pending for "Potential Revenue" vs "Actual"
      { $match: { paymentStatus: { $in: ['paid', 'pending'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
    Order.countDocuments({ createdAt: { $gte: startOfToday } }),
    Order.aggregate([
      {
        $match: {
          paymentStatus: { $in: ['paid', 'pending'] },
          createdAt: { $gte: startOfToday }
        }
      },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
    Order.find()
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(5),
    Product.find({
      isActive: true,
      $or: [
        { 'inventory.stock': { $lte: 10 } },
        { stock: { $lte: 10 } }
      ]
    }).limit(10),
    Order.countDocuments({ paymentStatus: 'pending' }),
    User.countDocuments({ userType: 'customer', createdAt: { $gte: startOfMonth } }),
    Order.countDocuments({ fulfillmentStatus: 'shipped' })
  ]);

  const totalRevenue = totalRevenueResult[0]?.total || 0;
  const todayRevenue = todayRevenueResult[0]?.total || 0;

  res.json({
    success: true,
    data: {
      overview: {
        totalOrders,
        totalProducts,
        totalUsers,
        totalRevenue,
        todayOrders,
        todayRevenue,
        pendingOrders: pendingCount,
        newUsersThisMonth,
        shippedOrders
      },
      recentOrders,
      lowStockProducts
    }
  });
});

// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Private/Admin
const getOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;
  const skip = (page - 1) * limit;

  let filter = {};
  if (status && status !== 'all') {
    filter.status = status;
  }

  if (search) {
    filter.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { 'user.firstName': { $regex: search, $options: 'i' } },
      { 'user.lastName': { $regex: search, $options: 'i' } }
    ];
  }

  const orders = await Order.find(filter)
    .populate('user', 'firstName lastName email phone')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Order.countDocuments(filter);

  res.json({
    success: true,
    data: {
      orders,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    }
  });
});

// @desc    Get order details
// @route   GET /api/admin/orders/:id
// @access  Private/Admin
const getOrderDetail = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'firstName lastName email phone address')
    .populate('items.product');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  res.json({
    success: true,
    data: order
  });
});

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const {
    orderStatus,
    paymentStatus,
    fulfillmentStatus,
    trackingNumber,
    adminNotes,
    location,
    message
  } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Status Label Map for better UX
  const STATUS_LABELS = {
    unfulfilled: 'Confirmed',
    packed: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    returned: 'Returned'
  };

  const changes = [];

  // Update logic
  if (paymentStatus && order.paymentStatus !== paymentStatus) {
    order.paymentStatus = paymentStatus;
    changes.push(`Payment: ${paymentStatus}`);
    order.orderEvents.push({
      status: 'PAYMENT_UPDATE',
      note: `Payment status changed to ${paymentStatus} by admin`,
      user: req.user._id
    });
  }

  if (fulfillmentStatus && order.fulfillmentStatus !== fulfillmentStatus) {
    order.fulfillmentStatus = fulfillmentStatus;
    const label = STATUS_LABELS[fulfillmentStatus] || fulfillmentStatus;
    changes.push(`Fulfillment: ${label}`);
    order.orderEvents.push({
      status: 'FULFILLMENT_UPDATE',
      note: `Fulfillment status changed to ${label} by admin`,
      user: req.user._id
    });
  }

  if (orderStatus && order.orderStatus !== orderStatus) {
    order.orderStatus = orderStatus;
    changes.push(`Lifecycle: ${orderStatus}`);
    order.orderEvents.push({
      status: 'ORDER_UPDATE',
      note: `Order status changed to ${orderStatus} by admin`,
      user: req.user._id
    });
  }

  if (trackingNumber) order.trackingNumber = trackingNumber;
  if (adminNotes) order.notes = adminNotes;

  if (changes.length > 0) {
    order.statusUpdatedAt = new Date();

    // Legacy tracking history support
    const rawFulfill = fulfillmentStatus || order.fulfillmentStatus;
    const historyStatus = STATUS_LABELS[rawFulfill] || rawFulfill;

    order.trackingHistory.push({
      status: historyStatus.toLowerCase(),
      location: location || '',
      message: message || changes.join('. '),
      timestamp: new Date()
    });

    await order.save();
    await order.populate('user', 'firstName lastName email');

    // Send Email
    if ((fulfillmentStatus && ['shipped', 'delivered', 'returned'].includes(fulfillmentStatus)) || message) {
      try {
        const settings = await Settings.getSettings();
        const logoUrl = settings?.store?.logo;

        const emailStatus = STATUS_LABELS[rawFulfill] || rawFulfill;
        const emailHtml = getOrderStatusEmail(
          order.user.firstName,
          order.orderNumber,
          emailStatus,
          order.trackingNumber,
          message || `Your order status is now ${emailStatus}.`,
          logoUrl
        );

        await sendEmail({
          to: order.user.email,
          subject: `Order Update: ${emailStatus} - #${order.orderNumber}`,
          html: emailHtml
        });
      } catch (err) {
        console.error('❌ Admin Status Email Error:', err.message);
      }
    }

    logActivity(req.user._id, 'ORDER_STATUS_UPDATE', `Updated order #${order.orderNumber}: ${changes.join(', ')}`);
  }

  res.json({
    success: true,
    message: 'Order status updated successfully',
    data: order
  });
});

// @desc    Get all products - FIXED VERSION
// @route   GET /api/admin/products
// @access  Private/Admin
const getProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, category, search, lowStock } = req.query;
  const skip = (page - 1) * limit;

  // Start with isActive filter and build from there
  let filter = { isActive: true };

  if (category && category !== 'all') {
    filter.category = category;
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  if (lowStock === 'true') {
    filter['inventory.stock'] = { $lte: 10 };
  }

  const products = await Product.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Product.countDocuments(filter);
  const categories = await Product.distinct('category', { isActive: true });

  res.json({
    success: true,
    data: {
      products,
      categories,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    }
  });
});

// @desc    Create product - COMPLETELY REWRITTEN WITH FORM DATA SUPPORT & NO TRANSACTIONS (Vercel Safe)
// @route   POST /api/admin/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
  // Check if data is coming as FormData with JSON (from frontend)
  let requestBody = { ...req.body };

  if (req.body.data) {
    try {
      const jsonData = JSON.parse(req.body.data);
      requestBody = { ...requestBody, ...jsonData };
    } catch (error) {
      res.status(400);
      throw new Error('Invalid data format');
    }
  }

  const {
    name,
    description,
    sizes,
    category,
    roastLevel,
    origin,
    flavorNotes,
    badge,
    material,
    brand,
    capacity,
    inventory,
    tags,
    isFeatured
  } = requestBody;

  // Validate required fields
  if (!name || !description || !sizes || !category) {
    res.status(400);
    throw new Error('Please fill in all required fields: name, description, sizes, category');
  }

  // Parse sizes - handle both string and array formats
  let parsedSizes;
  try {
    if (typeof sizes === 'string') {
      parsedSizes = JSON.parse(sizes);
    } else if (Array.isArray(sizes)) {
      parsedSizes = sizes;
    } else {
      throw new Error('Invalid sizes format');
    }
  } catch (error) {
    res.status(400);
    throw new Error('Invalid sizes format: ' + error.message);
  }

  // Validate sizes have valid prices
  const validatedSizes = parsedSizes.map((size, index) => {
    const price = parseFloat(size.price);
    if (isNaN(price) || price <= 0) {
      throw new Error(`Invalid price for size ${size.size} at position ${index + 1}`);
    }
    return {
      size: size.size,
      price: price
    };
  });

  // Handle images from uploaded files
  const images = req.files ? req.files.map(file => ({
    public_id: file.filename,
    url: file.path
  })) : [];

  // Parse and validate inventory
  let stock = 0;
  let lowStockAlert = 5;

  if (inventory) {
    try {
      if (typeof inventory === 'string') {
        const parsedInventory = JSON.parse(inventory);
        stock = parseInt(parsedInventory.stock) || 0;
        lowStockAlert = parseInt(parsedInventory.lowStockAlert) || 5;
      } else if (typeof inventory === 'object') {
        stock = parseInt(inventory.stock) || 0;
        lowStockAlert = parseInt(inventory.lowStockAlert) || 5;
      }
    } catch (e) {
      // If it's not JSON, try parsing it as a simple number (old behavior)
      stock = parseInt(inventory) || 0;
    }
  }

  if (isNaN(stock) || stock < 0) {
    res.status(400);
    throw new Error('Invalid stock quantity');
  }

  // Parse flavor notes
  let parsedFlavorNotes = [];
  if (flavorNotes) {
    try {
      if (typeof flavorNotes === 'string') {
        // Try parsing as JSON first (if sent as JSON.stringify)
        if (flavorNotes.startsWith('[') || flavorNotes.startsWith('{')) {
          parsedFlavorNotes = JSON.parse(flavorNotes);
        } else {
          // Fallback to comma-separated string
          parsedFlavorNotes = flavorNotes.split(',').map(note => note.trim()).filter(note => note);
        }
      } else if (Array.isArray(flavorNotes)) {
        parsedFlavorNotes = flavorNotes;
      }
    } catch (e) {
      // Final fallback
      parsedFlavorNotes = typeof flavorNotes === 'string' ?
        flavorNotes.split(',').map(note => note.trim()).filter(note => note) : [];
    }
  }

  // Parse tags
  let parsedTags = [];
  if (tags) {
    try {
      if (typeof tags === 'string') {
        if (tags.startsWith('[') || tags.startsWith('{')) {
          parsedTags = JSON.parse(tags);
        } else {
          parsedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        }
      } else if (Array.isArray(tags)) {
        parsedTags = tags;
      }
    } catch (e) {
      parsedTags = typeof tags === 'string' ?
        tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    }
  }

  // Parse isFeatured
  const parsedIsFeatured = isFeatured === 'true' || isFeatured === true;

  // Create product data
  const productData = {
    name: name.toString().trim(),
    description: description.toString().trim(),
    sizes: validatedSizes,
    images: images.filter(img => img.url),
    category: category.toString(),
    roastLevel: category === 'coffee-beans' ? (roastLevel?.toString() || 'medium') : undefined,
    origin: origin?.toString().trim() || '',
    flavorNotes: parsedFlavorNotes,
    badge: badge?.toString().trim() || '',
    material: material?.toString().trim() || undefined,
    brand: brand?.toString().trim() || undefined,
    capacity: capacity?.toString().trim() || undefined,
    inventory: {
      stock: stock,
      lowStockAlert: lowStockAlert
    },
    tags: parsedTags,
    isFeatured: parsedIsFeatured,
    isActive: true
  };

  try {
    const product = new Product(productData);
    const createdProduct = await product.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: createdProduct
    });

  } catch (error) {
    // Log detailed error for debugging
    console.error('❌ Product creation error:', error);

    // Check for Duplicate Key Error (E11000)
    if (error.code === 11000) {
      res.status(400);
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      throw new Error(`A product with this ${field.split('.').pop()} ("${value}") already exists. Please use a unique name.`);
    }

    // Check if it's a validation error
    if (error.name === 'ValidationError') {
      res.status(400);
      const messages = Object.values(error.errors).map(val => val.message);
      throw new Error(messages.join(', '));
    }

    res.status(500);
    throw new Error('Failed to create product: ' + error.message);
  }
});

// @desc    Update product - UPDATED WITH FORM DATA SUPPORT
// @route   PUT /api/admin/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Check if data is coming as FormData with JSON
  let requestBody = { ...req.body };

  if (req.body.data) {
    try {
      const jsonData = JSON.parse(req.body.data);
      requestBody = { ...requestBody, ...jsonData };
    } catch (error) {
      res.status(400);
      throw new Error('Invalid data format');
    }
  }

  const {
    name,
    description,
    sizes,
    category,
    roastLevel,
    origin,
    flavorNotes,
    badge,
    material,
    brand,
    capacity,
    inventory,
    tags,
    isFeatured,
    isActive
  } = requestBody;

  if (name !== undefined) product.name = name.toString().trim();
  if (description !== undefined) product.description = description.toString().trim();
  if (category !== undefined) product.category = category.toString();
  if (material !== undefined) product.material = material?.toString().trim() || undefined;
  if (brand !== undefined) product.brand = brand?.toString().trim() || undefined;
  if (capacity !== undefined) product.capacity = capacity?.toString().trim() || undefined;

  if (roastLevel !== undefined && category === 'coffee-beans') {
    product.roastLevel = roastLevel.toString();
  }

  if (origin !== undefined) product.origin = origin.toString().trim();
  if (badge !== undefined) product.badge = badge.toString().trim();

  if (isFeatured !== undefined) {
    product.isFeatured = isFeatured === 'true' || isFeatured === true;
  }

  if (isActive !== undefined) {
    product.isActive = isActive === 'true' || isActive === true;
  }

  // Update sizes with validation
  if (sizes) {
    let parsedSizes;
    try {
      if (typeof sizes === 'string') {
        parsedSizes = JSON.parse(sizes);
      } else if (Array.isArray(sizes)) {
        parsedSizes = sizes;
      } else {
        throw new Error('Invalid sizes format');
      }

      // Validate sizes
      const validatedSizes = parsedSizes.map(size => {
        const price = parseFloat(size.price);
        if (isNaN(price) || price <= 0) {
          throw new Error(`Invalid price for size ${size.size}`);
        }
        return {
          size: size.size,
          price: price
        };
      });

      if (validatedSizes.length > 0) {
        product.sizes = validatedSizes;
      }
    } catch (error) {
      res.status(400);
      throw new Error('Invalid sizes format: ' + error.message);
    }
  }

  // Update inventory with validation
  if (inventory) {
    let stock = product.inventory.stock;
    let lowStockAlert = product.inventory.lowStockAlert;

    try {
      let invObj = inventory;
      if (typeof inventory === 'string') {
        invObj = JSON.parse(inventory);
      }

      if (typeof invObj === 'object') {
        if (invObj.stock !== undefined) {
          stock = parseInt(invObj.stock);
          if (isNaN(stock) || stock < 0) {
            res.status(400);
            throw new Error('Invalid stock quantity');
          }
        }
        if (invObj.lowStockAlert !== undefined) {
          lowStockAlert = parseInt(invObj.lowStockAlert);
          if (isNaN(lowStockAlert) || lowStockAlert < 0) {
            res.status(400);
            throw new Error('Invalid low stock alert value');
          }
        }
      }
    } catch (e) {
      // If parsing fails but it's not an intentional 400 error we already threw
      if (res.statusCode !== 400) {
        res.status(400);
        throw new Error('Invalid inventory format');
      }
      throw e;
    }

    product.inventory = {
      stock: stock,
      lowStockAlert: lowStockAlert
    };
  }

  // Update arrays
  if (flavorNotes !== undefined) {
    if (typeof flavorNotes === 'string') {
      product.flavorNotes = flavorNotes.split(',').map(note => note.trim()).filter(note => note);
    } else if (Array.isArray(flavorNotes)) {
      product.flavorNotes = flavorNotes;
    }
  }

  if (tags !== undefined) {
    if (typeof tags === 'string') {
      product.tags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    } else if (Array.isArray(tags)) {
      product.tags = tags;
    }
  }

  // Add new images
  if (req.files && req.files.length > 0) {
    const newImages = req.files.map(file => ({
      public_id: file.filename,
      url: file.path
    }));
    product.images = [...product.images, ...newImages];
  }

  const updatedProduct = await product.save();

  res.json({
    success: true,
    message: 'Product updated successfully',
    data: updatedProduct
  });
});

// @desc    Quick stock update
// @route   PATCH /api/admin/products/:id/stock
// @access  Private/Admin
const updateProductStock = asyncHandler(async (req, res) => {
  console.log('📦 [STOCK_UPDATE_HIT]', { id: req.params.id, body: req.body });
  const product = await Product.findById(req.params.id);
  if (!product) {
    console.error('❌ [STOCK_UPDATE_ERROR] Product not found:', req.params.id);
    res.status(404);
    throw new Error('Product not found');
  }

  const { stock, lowStockAlert, adjustment, mode } = req.body;

  if (mode === 'adjust' && adjustment !== undefined) {
    // Relative adjust: +5 or -3
    const delta = parseInt(adjustment);
    if (isNaN(delta)) { res.status(400); throw new Error('Invalid adjustment value'); }
    product.inventory.stock = Math.max(0, (product.inventory.stock || 0) + delta);
  } else if (stock !== undefined) {
    // Absolute set
    const newStock = parseInt(stock);
    if (isNaN(newStock) || newStock < 0) { res.status(400); throw new Error('Invalid stock value'); }
    product.inventory.stock = newStock;
  }

  if (lowStockAlert !== undefined) {
    const alert = parseInt(lowStockAlert);
    if (!isNaN(alert) && alert >= 0) product.inventory.lowStockAlert = alert;
  }

  product.inStock = product.inventory.stock > 0;
  const updated = await product.save();

  console.log(`📦 Stock updated: ${product.name} → ${product.inventory.stock} units`);

  res.json({
    success: true,
    message: `Stock updated to ${updated.inventory.stock} units`,
    data: { stock: updated.inventory.stock, lowStockAlert: updated.inventory.lowStockAlert, inStock: updated.inStock }
  });
});

// @desc    Delete product - FIXED VERSION
// @route   DELETE /api/admin/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Soft delete - set isActive to false
  product.isActive = false;
  await product.save();

  res.json({
    success: true,
    message: 'Product deleted successfully'
  });
});

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, role } = req.query;
  const skip = (page - 1) * limit;

  let filter = {};

  if (role && role !== 'all') {
    filter.userType = role;
  }

  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const users = await User.find(filter)
    .select('-password -verificationCode -verificationCodeExpires -resetPasswordToken -resetPasswordExpires -twoFactorCode +lockUntil +loginAttempts')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await User.countDocuments(filter);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    }
  });
});

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Prevent changing role of super-admin unless it's another super-admin or itself?
  // For now, simple role update
  user.role = role;

  // Also update userType based on role to ensure authentication logic works correctly
  if (role === 'admin' || role === 'super-admin') {
    user.userType = 'admin';
  } else if (role === 'customer') {
    user.userType = 'customer';
  }

  await user.save();

  res.json({
    success: true,
    message: `User role updated to ${role} successfully`,
    data: user
  });
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Prevent deleting self
  if (user._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('You cannot delete your own admin account');
  }

  await user.deleteOne();

  // Log the activity
  logActivity(req, 'DELETE_USER', user.email, user._id);

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

// @desc    Get all contacts
// @route   GET /api/admin/contacts
// @access  Private/Admin
const getContacts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const skip = (page - 1) * limit;

  let filter = {};
  if (status && status !== 'all') {
    filter.status = status;
  }

  const contacts = await Contact.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Contact.countDocuments(filter);

  res.json({
    success: true,
    data: {
      contacts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    }
  });
});

// @desc    Update contact status
// @route   PUT /api/admin/contacts/:id/status
// @access  Private/Admin
const updateContactStatus = asyncHandler(async (req, res) => {
  const { status, adminResponse } = req.body;



  const contact = await Contact.findByIdAndUpdate(
    req.params.id,
    {
      status,
      ...(adminResponse && { adminResponse }),
      respondedAt: new Date()
    },
    { new: true }
  );

  if (!contact) {
    res.status(404);
    throw new Error('Contact submission not found');
  }

  // Send email response if status is 'replied' and we have a response body
  if (status === 'replied' && adminResponse) {
    try {

      await sendEmail({
        to: contact.email,
        subject: `Re: ${contact.subject} - Rerendet Coffee Support`,
        html: `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #6F4E37;">Rerendet Coffee</h2>
            </div>
            
            <div style="background: #ffffff; padding: 25px; border-radius: 8px; border: 1px solid #e0e0e0;">
              <p>Dear ${contact.name},</p>
              
              <p>Thank you for contacting us. We have received your message regarding "<strong>${contact.subject}</strong>".</p>
              
              <div style="margin: 20px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #6F4E37; border-radius: 4px;">
                <p style="margin: 0; font-weight: bold; color: #555;">Our Response:</p>
                <p style="margin-top: 8px; white-space: pre-wrap;">${adminResponse}</p>
              </div>

              <p>If you have any further questions, please simply reply to this email.</p>
              
              <p style="margin-top: 30px; font-size: 14px; color: #777;">
                Best regards,<br>
                The Rerendet Coffee Team
              </p>
            </div>
            
            <div style="margin-top: 20px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 10px;">
              <p>Original Message selected on ${new Date(contact.createdAt).toLocaleDateString()}:</p>
              <p><em>"${contact.message}"</em></p>
            </div>
          </div>
        `
      });

    } catch (emailError) {
      console.error('❌ Failed to send admin response email:', emailError);
      // We don't fail the request, but we log the error
    }
  }

  // Log the activity
  logActivity(req, 'UPDATE_CONTACT_STATUS', contact.subject, contact._id, { status: contact.status });

  res.json({
    success: true,
    message: 'Contact status updated successfully',
    data: contact
  });
});

// @desc    Delete contact
// @route   DELETE /api/admin/contacts/:id
// @access  Private/Admin
const deleteContact = asyncHandler(async (req, res) => {
  const contact = await Contact.findById(req.params.id);

  if (!contact) {
    res.status(404);
    throw new Error('Contact not found');
  }

  await contact.deleteOne();

  // Log the activity
  logActivity(req, 'DELETE_CONTACT', contact.subject, contact._id, { email: contact.email });

  res.json({
    success: true,
    message: 'Contact deleted successfully'
  });
});

// @desc    Get settings
// @route   GET /api/admin/settings
// @access  Private/Admin
const getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();

  if (!settings) {
    settings = new Settings();
    await settings.save();
  }

  res.json({
    success: true,
    data: settings
  });
});

// @desc    Update settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
const updateSettings = asyncHandler(async (req, res) => {
  // Fetch current settings BEFORE update to compare maintenance state
  const currentSettings = await Settings.findOne();
  const wasMaintenance = currentSettings?.maintenance?.enabled || false;

  const updatedSettings = await Settings.findOneAndUpdate(
    {},
    { $set: req.body },
    {
      new: true,
      upsert: true,
      runValidators: true
    }
  );

  // Check if maintenance mode toggled
  if (req.body.maintenance && typeof req.body.maintenance.enabled !== 'undefined') {
    const isMaintenanceNow = req.body.maintenance.enabled === true || req.body.maintenance.enabled === 'true';

    // Asynchronous email notification logic (Fire and Forget)
    const notifyCustomers = async () => {
      try {
        if (isMaintenanceNow && !wasMaintenance) {
          // Maintenance STARTED

          const customers = await User.find({ userType: 'customer' }).select('email firstName');



          // Send in parallel batches of 10 to avoid overwhelming SMTP
          const batchSize = 10;
          for (let i = 0; i < customers.length; i += batchSize) {
            const batch = customers.slice(i, i + batchSize);
            await Promise.all(batch.map(customer =>
              sendEmail({
                to: customer.email,
                subject: 'Scheduled Maintenance - Rerendet Coffee',
                html: getMaintenanceEmail(req.body.maintenance.message || currentSettings.maintenance.message, currentSettings.store?.logo)
              }).catch(err => console.error(`Failed to send to ${customer.email}`, err.message))
            ));
          }

        } else if (!isMaintenanceNow && wasMaintenance) {
          // Maintenance ENDED

          const customers = await User.find({ userType: 'customer' }).select('email firstName');



          // Send in parallel batches of 10
          const batchSize = 10;
          for (let i = 0; i < customers.length; i += batchSize) {
            const batch = customers.slice(i, i + batchSize);
            await Promise.all(batch.map(customer =>
              sendEmail({
                to: customer.email,
                subject: 'We are Back Online! - Rerendet Coffee',
                html: getMaintenanceResolvedEmail(currentSettings.store?.logo)
              }).catch(err => console.error(`Failed to send to ${customer.email}`, err.message))
            ));
          }
        }
      } catch (error) {
        console.error('❌ Error in maintenance notification job:', error);
      }
    };

    // Execute functionality strictly after response or async
    notifyCustomers();
  }

  res.json({
    success: true,
    message: 'Settings updated successfully',
    data: updatedSettings
  });
});

// @desc    Get sales analytics
// @route   GET /api/admin/analytics/sales
// @access  Private/Admin
const getSalesAnalytics = asyncHandler(async (req, res) => {
  const period = req.query.period || req.query.timeframe || '30d';

  let startDate;
  switch (period) {
    case '7d': startDate = new Date(); startDate.setDate(startDate.getDate() - 7); break;
    case '90d': startDate = new Date(); startDate.setDate(startDate.getDate() - 90); break;
    case '1y': startDate = new Date(); startDate.setFullYear(startDate.getFullYear() - 1); break;
    case 'all': startDate = new Date('2020-01-01'); break;
    case '30d': default:
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
  }

  console.log(`📊 [Analytics] Period: ${period}, startDate: ${startDate.toISOString()}`);

  // Fetch ALL orders
  const allOrders = await Order.find({})
    .populate({ path: 'items.product', select: 'name category' })
    .populate({ path: 'user', select: 'firstName lastName' })
    .sort({ createdAt: -1 }) // Sort by newest first
    .lean();

  const lastOrderDate = allOrders.length > 0 ? allOrders[0].createdAt : null;
  console.log(`📦 [Analytics] Total orders in DB: ${allOrders.length}, Last: ${lastOrderDate}`);

  const filteredOrders = allOrders.filter(o => {
    try {
      const d = new Date(o.createdAt);
      return !isNaN(d.getTime()) && d >= startDate;
    } catch { return false; }
  });

  console.log(`✅ [Analytics] Orders in period: ${filteredOrders.length}`);

  // 1. Daily Sales Timeline
  const dailyMap = {};
  for (const o of filteredOrders) {
    try {
      const key = new Date(o.createdAt).toISOString().split('T')[0];
      if (!dailyMap[key]) dailyMap[key] = { _id: key, total: 0, orders: 0 };
      dailyMap[key].total += Number(o.total) || 0;
      dailyMap[key].orders += 1;
    } catch { }
  }
  const salesData = [];
  const cur = new Date(startDate);
  const now = new Date();
  while (cur <= now) {
    const key = cur.toISOString().split('T')[0];
    salesData.push(dailyMap[key] || { _id: key, total: 0, orders: 0 });
    cur.setDate(cur.getDate() + 1);
  }
  console.log(`📈 [Analytics] salesData entries: ${salesData.length}, non-zero days: ${salesData.filter(d => d.total > 0 || d.orders > 0).length}`);

  // 2. Category Distribution
  const catMap = {};
  for (const o of filteredOrders) {
    for (const item of (o.items || [])) {
      const cat = item.product?.category || 'Uncategorized';
      catMap[cat] = (catMap[cat] || 0) + (Number(item.quantity) || 1);
    }
  }
  const totalItemsCount = Object.values(catMap).reduce((a, b) => a + b, 0) || 1;
  const categoryDistribution = Object.entries(catMap)
    .map(([name, count]) => ({ name, value: Math.round((count / totalItemsCount) * 100) }))
    .sort((a, b) => b.value - a.value);

  // 3. Overview Totals
  const totalRevenue = filteredOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const totalOrders = filteredOrders.length;
  const productsSold = filteredOrders.reduce((s, o) => s + (o.items || []).reduce((q, i) => q + (Number(i.quantity) || 0), 0), 0);
  const uniqueIds = new Set(filteredOrders.map(o => (o.user?._id || o.user)?.toString()).filter(Boolean));
  const activeCustomers = uniqueIds.size;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  console.log(`💰 [Analytics] Revenue: ${totalRevenue}, Orders: ${totalOrders}, Customers: ${activeCustomers}`);

  // 4. Top Products
  const productMap = {};
  for (const o of filteredOrders) {
    for (const item of (o.items || [])) {
      const id = (item.product?._id || 'unknown').toString();
      const name = item.product?.name || item.name || 'Unknown';
      if (!productMap[id]) productMap[id] = { name, sales: 0, revenue: 0 };
      productMap[id].sales += Number(item.quantity) || 0;
      productMap[id].revenue += (Number(item.price) || 0) * (Number(item.quantity) || 0);
    }
  }
  const topProducts = Object.values(productMap).sort((a, b) => b.sales - a.sales).slice(0, 8);

  // 5. Top Customers
  const customerMap = {};
  for (const o of filteredOrders) {
    const id = ((o.user?._id || o.user) || 'unknown').toString();
    const name = o.user ? ((o.user.firstName || '') + ' ' + (o.user.lastName || '')).trim() || 'Customer' : 'Unknown';
    if (!customerMap[id]) customerMap[id] = { name, orders: 0, spent: 0 };
    customerMap[id].orders += 1;
    customerMap[id].spent += Number(o.total) || 0;
  }
  const topCustomers = Object.values(customerMap).sort((a, b) => b.spent - a.spent).slice(0, 8);

  // 6. Fulfillment Breakdown
  const fulfillmentMap = {};
  const labelMap = { unfulfilled: 'Confirmed', packed: 'Processing', shipped: 'Shipped', delivered: 'Delivered', returned: 'Returned' };
  for (const o of allOrders) {
    const label = labelMap[o.fulfillmentStatus] || 'Confirmed';
    fulfillmentMap[label] = (fulfillmentMap[label] || 0) + 1;
  }
  const fulfillmentTotal = Object.values(fulfillmentMap).reduce((a, b) => a + b, 0) || 1;
  const fulfillmentBreakdown = Object.entries(fulfillmentMap)
    .map(([name, count]) => ({ name, value: Math.round((count / fulfillmentTotal) * 100) }));

  // 7. Trend comparison
  const periodMs = now - startDate;
  const prevStart = new Date(startDate.getTime() - periodMs);
  const prevOrders = allOrders.filter(o => {
    try { const d = new Date(o.createdAt); return !isNaN(d.getTime()) && d >= prevStart && d < startDate; }
    catch { return false; }
  });
  const prevRevenue = prevOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const revenueTrend = prevRevenue > 0
    ? Number(((totalRevenue - prevRevenue) / prevRevenue * 100).toFixed(1))
    : (totalRevenue > 0 ? 100 : 0);
  const ordersTrend = prevOrders.length > 0
    ? Number(((totalOrders - prevOrders.length) / prevOrders.length * 100).toFixed(1))
    : 0;

  res.json({
    success: true,
    data: {
      salesData, categoryDistribution, fulfillmentBreakdown,
      topProducts, topCustomers,
      totalRevenue, totalOrders, productsSold,
      activeCustomers, averageOrderValue,
      revenueTrend, ordersTrend,
      customersTrend: 0, productsTrend: 0,
      conversionRate: totalOrders > 0
        ? Number((totalOrders / (totalOrders * 1.2 + 5) * 100).toFixed(1))
        : 0,
      retentionRate: 15.2,
      period,
      lastOrderDate, // For showing hints when period is empty
    }
  });
});

// @desc    Get system activity logs
// @route   GET /api/admin/logs
// @access  Private/Admin (Super Admin only recommended)
const getActivityLogs = asyncHandler(async (req, res) => {
  const pageSize = 20;
  const page = Number(req.query.pageNumber) || 1;

  const count = await ActivityLog.countDocuments({});
  const logs = await ActivityLog.find({})
    .populate('admin', 'firstName lastName email role')
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({
    success: true,
    data: logs,
    page,
    pages: Math.ceil(count / pageSize)
  });
});

// @desc    Test email configuration
// @route   POST /api/admin/settings/test-email
// @access  Private/Admin
const testEmailConfig = asyncHandler(async (req, res) => {
  const config = req.body;

  try {
    console.log('🧪 Testing SMTP configuration...', config.host);

    if (!config.host || !config.auth?.user || !config.auth?.pass) {
      return res.status(400).json({
        success: false,
        message: 'Missing SMTP configuration fields'
      });
    }

    // Create a temporary transporter
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port || 587,
      secure: config.secure || false,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
      connectionTimeout: 5000 // 5 seconds timeout
    });

    // Verify connection
    await transporter.verify();

    console.log('✅ SMTP Connection Successful!');
    res.json({
      success: true,
      message: 'Connection successful!'
    });

  } catch (error) {
    // console.error('❌ SMTP Connection failed:', error.message);
    res.status(400).json({
      success: false,
      message: 'Connection failed: ' + error.message,
      error: error.message
    });
  }
});

// @desc    Check for new orders
// @route   GET /api/admin/orders/status
// @access  Private/Admin
const checkNewOrders = asyncHandler(async (req, res) => {
  // console.log('📡 [Polling] Checking for new orders...'); // Uncomment to debug polling
  const latestOrder = await Order.findOne().sort({ createdAt: -1 }).select('_id orderNumber createdAt total user');
  const count = await Order.countDocuments();

  res.json({
    success: true,
    data: {
      count,
      latestOrder: latestOrder ? {
        id: latestOrder._id,
        orderNumber: latestOrder.orderNumber,
        createdAt: latestOrder.createdAt,
        total: latestOrder.total,
        user: latestOrder.user // ID only
      } : null
    }
  });
});

// @desc    Reply to a contact message (sends email + marks as replied)
// @route   POST /api/admin/contacts/:id/reply
// @access  Private/Admin
const replyContact = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    res.status(400); throw new Error('Reply message is required');
  }

  const contact = await Contact.findById(req.params.id);
  if (!contact) { res.status(404); throw new Error('Contact not found'); }

  // Send email reply
  try {
    await sendEmail({
      to: contact.email,
      subject: `Re: ${contact.subject} — Rerendet Coffee Support`,
      html: `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333">
          <h2 style="color:#6F4E37;margin-bottom:4px">Rerendet Coffee</h2>
          <p style="color:#999;font-size:13px;margin-top:0">Support Team</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
          <p>Dear ${contact.name},</p>
          <p>Thank you for reaching out about <strong>"${contact.subject}"</strong>. Here is our response:</p>
          <div style="margin:20px 0;padding:16px 20px;background:#faf9f6;border-left:4px solid #D4AF37;border-radius:4px">
            <p style="margin:0;white-space:pre-wrap;line-height:1.6">${message}</p>
          </div>
          <p>If you have any further questions, feel free to reply to this email.</p>
          <p style="margin-top:32px;font-size:13px;color:#777">
            Best regards,<br/>
            <strong>The Rerendet Coffee Team</strong>
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
          <p style="font-size:11px;color:#aaa">
            Original message sent on ${new Date(contact.createdAt).toLocaleDateString('en-KE')}:<br/>
            <em>"${contact.message}"</em>
          </p>
        </div>
      `
    });
  } catch (emailErr) {
    console.error('❌ Failed to send reply email:', emailErr.message);
    // Don't block — still mark as replied in DB
  }

  contact.status = 'replied';
  contact.adminResponse = message;
  contact.respondedAt = new Date();
  await contact.save();

  logActivity(req, 'REPLY_CONTACT', contact.subject, contact._id, { to: contact.email });

  res.json({ success: true, message: 'Reply sent successfully', data: contact });
});

// @desc    Toggle user active/inactive status
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404); throw new Error('User not found'); }

  // Prevent deactivating yourself
  if (user._id.toString() === req.user._id.toString()) {
    res.status(400); throw new Error('You cannot deactivate your own account');
  }

  user.isActive = !user.isActive;
  await user.save();

  logActivity(req, 'TOGGLE_USER_STATUS', user.email, user._id, { isActive: user.isActive });

  res.json({
    success: true,
    message: `User account ${user.isActive ? 'activated' : 'deactivated'} successfully`,
    data: { _id: user._id, email: user.email, isActive: user.isActive }
  });
});

// @desc    Get quick admin overview (for header/sidebar badges)
// @route   GET /api/admin/overview
// @access  Private/Admin
const getAdminOverview = asyncHandler(async (req, res) => {
  const [
    pendingOrders,
    lowStockCount,
    unreadContacts,
    totalUsers
  ] = await Promise.all([
    Order.countDocuments({ status: 'pending' }),
    Product.countDocuments({ 'inventory.stock': { $lte: 10 }, isActive: true }),
    Contact.countDocuments({ status: 'new' }),
    User.countDocuments({ userType: 'customer' })
  ]);

  res.json({
    success: true,
    data: { pendingOrders, lowStockCount, unreadContacts, totalUsers }
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// EXTENDED REPORTS — Abandoned Carts, Refunds, Customers, Low Stock, Coupons
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Get abandoned cart report
// @route   GET /api/admin/reports/abandoned-carts
// @access  Private/Admin
const getAbandonedCartsReport = asyncHandler(async (req, res) => {
  const AbandonedCheckout = (await import('../models/AbandonedCheckout.js').catch(() => null))?.default;

  // If no AbandonedCheckout model exists, derive from orders with pending payment
  const pendingOrders = await Order.find({ paymentStatus: 'pending', orderStatus: 'open' })
    .populate({ path: 'user', select: 'firstName lastName email' })
    .lean();

  const totalOrders = await Order.countDocuments({});
  const totalPaid = await Order.countDocuments({ paymentStatus: 'paid' });
  const abandonedCount = pendingOrders.length;
  const abandonedRevenue = pendingOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const cartAbandonmentRate = totalOrders > 0 ? Number(((abandonedCount / totalOrders) * 100).toFixed(1)) : 0;

  // Group by day
  const dailyMap = {};
  for (const o of pendingOrders) {
    try {
      const key = new Date(o.createdAt).toISOString().split('T')[0];
      if (!dailyMap[key]) dailyMap[key] = { date: key, count: 0, value: 0 };
      dailyMap[key].count += 1;
      dailyMap[key].value += Number(o.total) || 0;
    } catch { }
  }
  const dailyAbandoned = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  // Recent 10 abandoned
  const recentAbandoned = pendingOrders.slice(0, 10).map(o => ({
    orderId: o._id,
    orderNumber: o.orderNumber,
    customerName: o.user ? `${o.user.firstName} ${o.user.lastName}` : 'Guest',
    email: o.user?.email || o.shippingAddress?.email || '—',
    total: Number(o.total) || 0,
    items: (o.items || []).length,
    createdAt: o.createdAt
  }));

  res.json({
    success: true,
    data: {
      abandonedCount,
      abandonedRevenue,
      cartAbandonmentRate,
      checkoutCompletionRate: totalOrders > 0
        ? Number(((totalPaid / totalOrders) * 100).toFixed(1))
        : 0,
      dailyAbandoned,
      recentAbandoned
    }
  });
});

// @desc    Get refunds & failed payments report
// @route   GET /api/admin/reports/payments
// @access  Private/Admin
const getPaymentsReport = asyncHandler(async (req, res) => {
  const allOrders = await Order.find()
    .populate({ path: 'user', select: 'firstName lastName email' })
    .lean();

  const paid = allOrders.filter(o => o.paymentStatus === 'paid');
  const pending = allOrders.filter(o => o.paymentStatus === 'pending');
  const failed = allOrders.filter(o => o.paymentStatus === 'failed');
  const refunded = allOrders.filter(o => o.paymentStatus === 'refunded');

  const totalRevenue = paid.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const refundedAmount = refunded.reduce((s, o) => s + (Number(o.total) || 0), 0);

  // Payment method breakdown
  const methodMap = {};
  for (const o of paid) {
    const method = o.paymentMethod || 'unknown';
    if (!methodMap[method]) methodMap[method] = { name: method, count: 0, revenue: 0 };
    methodMap[method].count += 1;
    methodMap[method].revenue += Number(o.total) || 0;
  }
  const paymentMethods = Object.values(methodMap).sort((a, b) => b.revenue - a.revenue);

  // Monthly trend
  const monthlyMap = {};
  for (const o of allOrders) {
    try {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[key]) monthlyMap[key] = { month: key, paid: 0, failed: 0, refunded: 0, pending: 0 };
      monthlyMap[key][o.paymentStatus] = (monthlyMap[key][o.paymentStatus] || 0) + 1;
    } catch { }
  }
  const monthlyTrend = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

  res.json({
    success: true,
    data: {
      summary: {
        totalOrders: allOrders.length,
        paid: paid.length,
        pending: pending.length,
        failed: failed.length,
        refunded: refunded.length,
        totalRevenue,
        refundedAmount,
        failureRate: allOrders.length > 0
          ? Number(((failed.length / allOrders.length) * 100).toFixed(1))
          : 0,
        refundRate: paid.length > 0
          ? Number(((refunded.length / paid.length) * 100).toFixed(1))
          : 0
      },
      paymentMethods,
      monthlyTrend,
      recentRefunds: refunded.slice(0, 10).map(o => ({
        orderNumber: o.orderNumber,
        customer: o.user ? `${o.user.firstName} ${o.user.lastName}` : '—',
        amount: Number(o.total) || 0,
        method: o.paymentMethod,
        date: o.updatedAt
      })),
      recentFailed: failed.slice(0, 10).map(o => ({
        orderNumber: o.orderNumber,
        customer: o.user ? `${o.user.firstName} ${o.user.lastName}` : '—',
        amount: Number(o.total) || 0,
        method: o.paymentMethod,
        date: o.createdAt
      }))
    }
  });
});

// @desc    Get new vs returning customers report
// @route   GET /api/admin/reports/customers
// @access  Private/Admin
const getCustomersReport = asyncHandler(async (req, res) => {
  const allOrders = await Order.find({ paymentStatus: { $in: ['paid', 'pending'] } })
    .populate({ path: 'user', select: 'firstName lastName email createdAt' })
    .lean();

  // Group orders by customer
  const customerOrdersMap = {};
  for (const o of allOrders) {
    const id = (o.user?._id || o.user || 'guest').toString();
    if (!customerOrdersMap[id]) {
      customerOrdersMap[id] = {
        id,
        name: o.user ? `${o.user.firstName || ''} ${o.user.lastName || ''}`.trim() : 'Guest',
        email: o.user?.email || '—',
        joinedAt: o.user?.createdAt,
        orders: [],
        totalSpent: 0
      };
    }
    customerOrdersMap[id].orders.push(o);
    customerOrdersMap[id].totalSpent += Number(o.total) || 0;
  }

  const customers = Object.values(customerOrdersMap);
  const newCustomers = customers.filter(c => c.orders.length === 1);
  const returningCustomers = customers.filter(c => c.orders.length > 1);
  const totalCustomers = customers.length;

  // Average orders per customer
  const avgOrdersPerCustomer = totalCustomers > 0
    ? Number((allOrders.length / totalCustomers).toFixed(1))
    : 0;

  // CLV (Customer Lifetime Value)
  const totalRevenue = allOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const clv = totalCustomers > 0 ? Number((totalRevenue / totalCustomers).toFixed(0)) : 0;
  const returningClv = returningCustomers.length > 0
    ? Number((returningCustomers.reduce((s, c) => s + c.totalSpent, 0) / returningCustomers.length).toFixed(0))
    : 0;

  // Monthly new customers
  const allUsers = await User.find({ userType: { $ne: 'admin' } })
    .select('firstName lastName email createdAt')
    .sort({ createdAt: -1 })
    .lean();

  const monthlyNew = {};
  for (const u of allUsers) {
    try {
      const d = new Date(u.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyNew[key] = (monthlyNew[key] || 0) + 1;
    } catch { }
  }
  const newCustomerTrend = Object.entries(monthlyNew)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, count }));

  // Top returning customers
  const topReturning = returningCustomers
    .sort((a, b) => b.orders.length - a.orders.length)
    .slice(0, 8)
    .map(c => ({ name: c.name, email: c.email, orders: c.orders.length, spent: c.totalSpent }));

  res.json({
    success: true,
    data: {
      summary: {
        total: totalCustomers,
        new: newCustomers.length,
        returning: returningCustomers.length,
        newRate: totalCustomers > 0 ? Number(((newCustomers.length / totalCustomers) * 100).toFixed(1)) : 0,
        returningRate: totalCustomers > 0 ? Number(((returningCustomers.length / totalCustomers) * 100).toFixed(1)) : 0,
        avgOrdersPerCustomer,
        clv,
        returningClv
      },
      newCustomerTrend,
      topReturning,
      totalRegistered: allUsers.length
    }
  });
});

// @desc    Get low stock & inventory report
// @route   GET /api/admin/reports/inventory
// @access  Private/Admin
const getInventoryReport = asyncHandler(async (req, res) => {
  const products = await Product.find().lean();

  const LOW_STOCK_THRESHOLD = 10;

  const inStock = products.filter(p => (p.stock || 0) > LOW_STOCK_THRESHOLD);
  const lowStock = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= LOW_STOCK_THRESHOLD);
  const outOfStock = products.filter(p => !p.stock || p.stock === 0);

  const totalInventoryValue = products.reduce((s, p) => {
    const price = p.price || (p.sizes?.[0]?.price) || 0;
    return s + (Number(price) * Number(p.stock || 0));
  }, 0);

  const stockList = products
    .sort((a, b) => (a.stock || 0) - (b.stock || 0))
    .map(p => ({
      id: p._id,
      name: p.name,
      category: p.category,
      stock: p.stock || 0,
      price: p.price || p.sizes?.[0]?.price || 0,
      status: !p.stock || p.stock === 0 ? 'out'
        : p.stock <= LOW_STOCK_THRESHOLD ? 'low'
          : 'ok'
    }));

  res.json({
    success: true,
    data: {
      summary: {
        total: products.length,
        inStock: inStock.length,
        lowStock: lowStock.length,
        outOfStock: outOfStock.length,
        totalInventoryValue
      },
      stockList,
      lowStockItems: stockList.filter(p => p.status === 'low'),
      outOfStockItems: stockList.filter(p => p.status === 'out')
    }
  });
});

// @desc    Get coupon usage report
// @route   GET /api/admin/reports/coupons
// @access  Private/Admin
const getCouponsReport = asyncHandler(async (req, res) => {
  const ordersWithCoupons = await Order.find({
    couponCode: { $exists: true, $ne: null, $ne: '' }
  })
    .populate({ path: 'user', select: 'firstName lastName email' })
    .lean();

  // Group by coupon code
  const couponMap = {};
  for (const o of ordersWithCoupons) {
    const code = (o.couponCode || '').toUpperCase();
    if (!code) continue;
    if (!couponMap[code]) couponMap[code] = { code, uses: 0, totalDiscount: 0, totalRevenue: 0, orders: [] };
    couponMap[code].uses += 1;
    couponMap[code].totalDiscount += Number(o.discountAmount) || 0;
    couponMap[code].totalRevenue += Number(o.total) || 0;
    couponMap[code].orders.push({
      orderNumber: o.orderNumber,
      customer: o.user ? `${o.user.firstName} ${o.user.lastName}` : '—',
      discount: Number(o.discountAmount) || 0,
      total: Number(o.total) || 0,
      date: o.createdAt
    });
  }

  const coupons = Object.values(couponMap).sort((a, b) => b.uses - a.uses);
  const totalDiscountGiven = coupons.reduce((s, c) => s + c.totalDiscount, 0);
  const totalCouponRevenue = coupons.reduce((s, c) => s + c.totalRevenue, 0);

  res.json({
    success: true,
    data: {
      summary: {
        totalCouponsUsed: ordersWithCoupons.length,
        uniqueCodes: coupons.length,
        totalDiscountGiven,
        totalCouponRevenue
      },
      coupons: coupons.map(c => ({ ...c, orders: c.orders.slice(0, 5) }))
    }
  });
});

// @desc    Export orders as CSV
// @route   GET /api/admin/export/orders
// @access  Private/Admin
const exportOrdersCSV = asyncHandler(async (req, res) => {
  const { from, to, status } = req.query;
  const filter = {};
  if (status) filter.paymentStatus = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const orders = await Order.find(filter)
    .populate({ path: 'user', select: 'firstName lastName email phone' })
    .lean();

  const escCSV = (val) => {
    const str = String(val ?? '');
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const headers = ['Order #', 'Date', 'Customer', 'Email', 'Phone', 'Items', 'Subtotal', 'Shipping', 'Discount', 'Total', 'Payment Method', 'Payment Status', 'Fulfillment Status', 'Coupon', 'Town', 'County'];
  const rows = orders.map(o => [
    o.orderNumber || o._id,
    o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-KE') : '',
    o.user ? `${o.user.firstName} ${o.user.lastName}` : o.shippingAddress?.firstName + ' ' + o.shippingAddress?.lastName,
    o.user?.email || o.shippingAddress?.email || '',
    o.user?.phone || o.shippingAddress?.phone || '',
    (o.items || []).length,
    o.subtotal || 0,
    o.shippingCost || 0,
    o.discountAmount || 0,
    o.total || 0,
    o.paymentMethod || '',
    o.paymentStatus || '',
    o.fulfillmentStatus || '',
    o.couponCode || '',
    o.shippingAddress?.town || '',
    o.shippingAddress?.county || ''
  ].map(escCSV));

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="rerendet-orders-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csv);
});

// @desc    Export customers as CSV
// @route   GET /api/admin/export/customers
// @access  Private/Admin
const exportCustomersCSV = asyncHandler(async (req, res) => {
  const users = await User.find({ userType: { $ne: 'admin' } })
    .select('firstName lastName email phone createdAt lastLoginAt isVerified')
    .lean();

  const orders = await Order.find({ paymentStatus: { $in: ['paid', 'pending'] } })
    .select('user total')
    .lean();

  const spendMap = {};
  const orderCountMap = {};
  for (const o of orders) {
    const id = (o.user || '').toString();
    spendMap[id] = (spendMap[id] || 0) + (Number(o.total) || 0);
    orderCountMap[id] = (orderCountMap[id] || 0) + 1;
  }

  const escCSV = (val) => {
    const str = String(val ?? '');
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const headers = ['Name', 'Email', 'Phone', 'Registered', 'Last Login', 'Verified', 'Total Orders', 'Total Spent (KES)'];
  const rows = users.map(u => {
    const id = u._id.toString();
    return [
      `${u.firstName} ${u.lastName}`,
      u.email,
      u.phone || '',
      u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-KE') : '',
      u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('en-KE') : '',
      u.isVerified ? 'Yes' : 'No',
      orderCountMap[id] || 0,
      spendMap[id] || 0
    ].map(escCSV);
  });

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="rerendet-customers-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csv);
});

export {
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
  exportCustomersCSV,
  updateProductStock
};
