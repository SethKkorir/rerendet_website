// models/Order.js - REFACTORED FOR GRANULAR LIFECYCLE MANAGEMENT
import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String, required: true },
  size: { type: String, required: true },
  itemTotal: { type: Number, required: true }
});

const shippingAddressSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  country: { type: String, required: true },
  county: { type: String },
  town: { type: String },
  address: { type: String, required: true },
  city: { type: String }, // Keep for legacy
  postalCode: { type: String }
});

const orderEventSchema = new mongoose.Schema({
  status: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  note: { type: String },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // User who triggered the event (null if system)
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  shippingAddress: shippingAddressSchema,

  // Financials
  subtotal: { type: Number, required: true },
  shippingCost: { type: Number, required: true, default: 0 },
  tax: { type: Number, required: true, default: 0 },
  total: { type: Number, required: true },

  // === GRANULAR STATUS FIELDS ===

  // Overall Lifecycle State
  orderStatus: {
    type: String,
    enum: ['open', 'completed', 'cancelled'],
    default: 'open',
    index: true
  },

  // Payment Lifecycle
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
    index: true
  },

  // Fulfillment Lifecycle (Packing & Delivery)
  fulfillmentStatus: {
    type: String,
    enum: ['unfulfilled', 'packed', 'shipped', 'delivered', 'returned'],
    default: 'unfulfilled',
    index: true
  },

  // Metadata
  paymentMethod: { type: String, required: true },
  transactionId: { type: String },
  manualTransactionId: { type: String }, // For Paybill/Manual Verification
  paymentVerificationStatus: {
    type: String,
    enum: ['unverified', 'verified', 'rejected'],
    default: 'unverified'
  },
  trackingNumber: { type: String },
  estimatedDeliveryDate: { type: Date },
  notes: { type: String },

  // Audit Trail
  orderEvents: [orderEventSchema],
  trackingHistory: [
    {
      status: String,
      location: String,
      message: String,
      timestamp: { type: Date, default: Date.now }
    }
  ],

  // Subscription & Discounts
  isSubscription: { type: Boolean, default: false },
  subscriptionFrequency: { type: String, enum: ['weekly', 'bi-weekly', 'monthly'] },
  couponCode: { type: String, uppercase: true },
  discountAmount: { type: Number, default: 0 },

  // Inventory Reservation (Auto-expiry)
  expiresAt: {
    type: Date,
    default: function () {
      // Default: Expires in 30 minutes if unpaid
      return new Date(Date.now() + 30 * 60 * 1000);
    },
    index: { expires: 0 } // Create TTL index but managing logic manually for better control
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Backward Compatibility Virtual for 'status'
orderSchema.virtual('status').get(function () {
  if (this.orderStatus === 'cancelled') return 'cancelled';
  if (this.fulfillmentStatus === 'delivered') return 'delivered';
  if (this.fulfillmentStatus === 'shipped') return 'shipped';
  if (this.fulfillmentStatus === 'packed') return 'processing';

  // If we reach here, it's either confirmed (paid/CoD) or pending
  // We treat all open uncancelled orders as 'confirmed' at minimum once placed
  return 'confirmed';
});

// Generate Order Number
orderSchema.pre('save', function (next) {
  if (this.isNew && !this.orderNumber) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.orderNumber = `ORD-${timestamp}-${random}`;

    // Initial Log
    this.orderEvents.push({
      status: 'ORDER_CREATED',
      note: 'Order placed by customer'
    });
  }
  next();
});

const Order = mongoose.model('Order', orderSchema, 'orders');

export default Order;