// models/Product.js - WITH EXPLICIT COLLECTION NAME
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },

  // Pricing & Sizes (CoffeeShop expects this structure)
  sizes: [{
    size: {
      type: String,
      required: true,
      enum: ['250g', '500g', '1000g']
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative']
    }
  }],

  // Images
  images: [{
    public_id: String,
    url: {
      type: String,
      required: true
    }
  }],

  // Product Details
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: ['coffee-beans', 'brewing-equipment', 'accessories', 'merchandise'],
    default: 'coffee-beans'
  },
  roastLevel: {
    type: String,
    enum: ['light', 'medium-light', 'medium', 'medium-dark', 'dark', 'espresso'],
    required: function () {
      return this.category === 'coffee-beans';
    }
  },
  flavorNotes: [String],
  origin: String,

  // Badge for special labels (CoffeeShop expects this)
  badge: {
    type: String,
    trim: true,
    maxlength: [50, 'Badge cannot exceed 50 characters']
  },

  // Inventory Management
  inventory: {
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Stock cannot be negative']
    },
    lowStockAlert: {
      type: Number,
      default: 5,
      min: [0, 'Low stock alert cannot be negative']
    }
  },

  // Status & Features
  inStock: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },

  // SEO & Metadata
  seo: {
    title: String,
    description: String,
    slug: {
      type: String,
      unique: true,
      sparse: true
    }
  },

  // Ratings
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot exceed 5']
    },
    count: {
      type: Number,
      default: 0,
      min: [0, 'Rating count cannot be negative']
    }
  },

  // Tags for search and filtering
  tags: [String]

}, {
  timestamps: true
});

// Virtual for checking if product is low stock
productSchema.virtual('isLowStock').get(function () {
  return this.inventory.stock <= this.inventory.lowStockAlert;
});

// Virtual for display name (CoffeeShop uses this)
productSchema.virtual('displayName').get(function () {
  return this.name;
});

// Method to check availability
productSchema.methods.checkAvailability = function (quantity = 1) {
  return this.inStock && this.inventory.stock >= quantity;
};

// Method to update stock
productSchema.methods.updateStock = function (newStock) {
  this.inventory.stock = newStock;
  this.inStock = newStock > 0;
  return this.save();
};

// Method to decrease stock
productSchema.methods.decreaseStock = function (quantity = 1) {
  if (this.inventory.stock >= quantity) {
    this.inventory.stock -= quantity;
    this.inStock = this.inventory.stock > 0;
    return this.save();
  }
  throw new Error('Insufficient stock');
};

// Method to increase stock
productSchema.methods.increaseStock = function (quantity = 1) {
  this.inventory.stock += quantity;
  this.inStock = true;
  return this.save();
};

// Pre-save middleware to generate slug if not provided
productSchema.pre('save', async function (next) {
  if (this.isModified('name') || !this.seo.slug) {
    const baseSlug = (this.seo.slug || this.name)
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Only apply the slug if it hasn't been set or if the name changed
    if (!this.seo.slug || this.isModified('name')) {
      // Check for uniqueness - if it exists, append a random short string
      // Note: We're doing a simple check here. For high-concurrency, this might still race,
      // but it's much better than nothing.
      const existingProduct = await mongoose.model('Product').findOne({
        'seo.slug': baseSlug,
        _id: { $ne: this._id }
      });

      if (existingProduct) {
        this.seo.slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;
      } else {
        this.seo.slug = baseSlug;
      }
    }
  }

  // Ensure inStock reflects actual stock
  this.inStock = this.inventory.stock > 0;

  next();
});

// Create compound indexes for better performance
productSchema.index({
  name: 'text',
  description: 'text',
  flavorNotes: 'text',
  tags: 'text',
  origin: 'text'
});

productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ 'sizes.price': 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ 'inventory.stock': 1 });

// Static method to get products by category
productSchema.statics.getByCategory = function (category, limit = 10) {
  return this.find({
    category,
    isActive: true,
    inStock: true
  }).limit(limit);
};

// Static method to get featured products
productSchema.statics.getFeatured = function (limit = 8) {
  return this.find({
    isFeatured: true,
    isActive: true,
    inStock: true
  }).limit(limit);
};

// Static method to get low stock products
productSchema.statics.getLowStock = function () {
  return this.find({
    isActive: true,
    $expr: {
      $lte: ['$inventory.stock', '$inventory.lowStockAlert']
    }
  });
};

// EXPLICIT COLLECTION NAME - Try 'products' first, if doesn't work try 'product'
const Product = mongoose.model('Product', productSchema, 'products');

export default Product;