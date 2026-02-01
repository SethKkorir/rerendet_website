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
import { getMaintenanceEmail, getMaintenanceResolvedEmail } from '../utils/emailTemplates.js';
import nodemailer from 'nodemailer';

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
  const today = new Date();
  const startOfToday = new Date(today.setHours(0, 0, 0, 0));
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalOrders,
    totalProducts,
    totalUsers,
    totalRevenueResult,
    todayOrders,
    todayRevenueResult,
    recentOrders,
    lowStockProducts,
    pendingOrders
  ] = await Promise.all([
    Order.countDocuments(),
    Product.countDocuments({ isActive: true }),
    User.countDocuments({ userType: 'customer' }),
    Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
    Order.countDocuments({ createdAt: { $gte: startOfToday } }),
    Order.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
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
      'inventory.stock': { $lte: 10 },
      isActive: true
    }).limit(5),
    Order.countDocuments({ status: 'pending' })
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
        pendingOrders
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
  const { status, trackingNumber, notifyCustomer = true } = req.body;

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    {
      status,
      ...(trackingNumber && { trackingNumber }),
      statusUpdatedAt: new Date()
    },
    { new: true }
  ).populate('user', 'firstName lastName email');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
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
    if (typeof inventory === 'object') {
      stock = parseInt(inventory.stock) || 0;
      lowStockAlert = parseInt(inventory.lowStockAlert) || 5;
    } else {
      // Handle case where inventory might be a string
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
    if (typeof flavorNotes === 'string') {
      parsedFlavorNotes = flavorNotes.split(',').map(note => note.trim()).filter(note => note);
    } else if (Array.isArray(flavorNotes)) {
      parsedFlavorNotes = flavorNotes;
    }
  }

  // Parse tags
  let parsedTags = [];
  if (tags) {
    if (typeof tags === 'string') {
      parsedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    } else if (Array.isArray(tags)) {
      parsedTags = tags;
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
    console.error('❌ Request body:', req.body);
    console.error('❌ Request files:', req.files);

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
    inventory,
    tags,
    isFeatured,
    isActive
  } = requestBody;

  // Update fields with proper validation
  if (name !== undefined) product.name = name.toString().trim();
  if (description !== undefined) product.description = description.toString().trim();
  if (category !== undefined) product.category = category.toString();

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

    if (typeof inventory === 'object') {
      if (inventory.stock !== undefined) {
        stock = parseInt(inventory.stock);
        if (isNaN(stock) || stock < 0) {
          res.status(400);
          throw new Error('Invalid stock quantity');
        }
      }
      if (inventory.lowStockAlert !== undefined) {
        lowStockAlert = parseInt(inventory.lowStockAlert);
        if (isNaN(lowStockAlert) || lowStockAlert < 0) {
          res.status(400);
          throw new Error('Invalid low stock alert value');
        }
      }
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
    .select('-password')
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
  const { period = '30d' } = req.query;

  let startDate;
  const endDate = new Date();

  switch (period) {
    case '7d':
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);
      break;
    case '1y':
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
  }

  // Aggregate metrics
  const [salesStats, categoryStats, totals] = await Promise.all([
    // Daily sales data for line chart
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          paymentStatus: { $in: ['paid', 'pending'] }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),

    // Category distribution for pie chart
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          paymentStatus: { $in: ['paid', 'pending'] }
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      {
        $group: {
          _id: '$productInfo.category',
          value: { $sum: '$items.quantity' }
        }
      },
      { $project: { name: '$_id', value: 1, _id: 0 } }
    ]),

    // Overview totals
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          paymentStatus: { $in: ['paid', 'pending'] } // Include pending for dev visibility
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          productsSold: { $sum: { $size: '$items' } }, // Simple count of items as fallback
          uniqueCustomers: { $addToSet: '$user' }
        }
      }
    ])
  ]);

  const overview = totals[0] || { totalRevenue: 0, totalOrders: 0, productsSold: 0, uniqueCustomers: [] };
  const activeCustomers = overview.uniqueCustomers.length;
  const averageOrderValue = overview.totalOrders > 0 ? overview.totalRevenue / overview.totalOrders : 0;

  // Fill in missing dates with 0 revenue for consistent chart
  const filledSalesStats = [];
  const currentDate = new Date(startDate);
  const now = new Date(); // Use current time as end boundary

  while (currentDate <= now) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const existingStat = salesStats.find(s => s._id === dateStr);

    filledSalesStats.push({
      _id: dateStr,
      total: existingStat ? existingStat.total : 0,
      count: existingStat ? existingStat.count : 0
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  res.json({
    success: true,
    data: {
      salesData: filledSalesStats,
      categoryDistribution: categoryStats,
      totalRevenue: overview.totalRevenue || 0,
      totalOrders: overview.totalOrders || 0,
      productsSold: overview.productsSold || 0,
      activeCustomers: activeCustomers,
      averageOrderValue: averageOrderValue,
      conversionRate: 3.5, // Simulated for now
      retentionRate: 15.2, // Simulated for now
      period
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
  deleteContact,
  getSettings,
  updateSettings,
  getSalesAnalytics,
  getActivityLogs,
  updateUserRole,
  deleteUser,
  testEmailConfig,
  checkNewOrders
};