// models/Settings.js - NEW FILE
import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  // Store Information
  store: {
    name: { type: String, default: 'Rerendet Coffee' },
    email: { type: String, default: 'info@rerendetcoffee.com' },
    phone: { type: String, default: '+254700000000' },
    address: { type: String, default: 'Nairobi, Kenya' },
    description: { type: String, default: 'Premium coffee blends roasted to perfection' },
    logo: { type: String, default: '' },
    favicon: { type: String, default: '' }
  },

  // About Us Page Content (Dynamic)
  about: {
    yearsInBusiness: { type: Number, default: 0 },
    organicPercentage: { type: Number, default: 0 },
    awardsWon: { type: Number, default: 0 },
    story: { type: String, default: '' },
    subStory: { type: String, default: '' },
    imageUrl: { type: String, default: '' }
  },

  // Business Hours
  businessHours: {
    monday: { open: String, close: String, closed: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
    friday: { open: String, close: String, closed: { type: Boolean, default: false } },
    saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
    sunday: { open: String, close: String, closed: { type: Boolean, default: true } }
  },

  // Payment Settings
  payment: {
    currency: { type: String, default: 'KES' },
    currencySymbol: { type: String, default: 'KSh' },
    taxRate: { type: Number, default: 0.16 }, // 16% VAT
    freeShippingThreshold: { type: Number, default: 5000 },
    shippingPrice: { type: Number, default: 500 },
    paymentMethods: {
      mpesa: { type: Boolean, default: true },
      card: { type: Boolean, default: true },
      cashOnDelivery: { type: Boolean, default: true }
    }
  },

  // Email Settings
  email: {
    enabled: { type: Boolean, default: true },
    host: { type: String, default: '' },
    port: { type: Number, default: 587 },
    secure: { type: Boolean, default: false },
    auth: {
      user: { type: String, default: '' },
      pass: { type: String, default: '' }
    },
    from: { type: String, default: 'Rerendet Coffee <noreply@rerendetcoffee.com>' },
    notifications: {
      newOrder: { type: Boolean, default: true },
      orderStatus: { type: Boolean, default: true },
      lowStock: { type: Boolean, default: true },
      newUser: { type: Boolean, default: true }
    }
  },

  // Security Settings
  security: {
    require2FA: { type: Boolean, default: false },
    sessionTimeout: { type: Number, default: 24 }, // hours
    maxLoginAttempts: { type: Number, default: 5 },
    passwordMinLength: { type: Number, default: 8 },
    passwordRequireSpecial: { type: Boolean, default: true }
  },

  // Notification Settings
  notifications: {
    admin: {
      newOrder: { type: Boolean, default: true },
      lowStock: { type: Boolean, default: true },
      newUser: { type: Boolean, default: true },
      contactForm: { type: Boolean, default: true }
    },
    customer: {
      orderConfirmation: { type: Boolean, default: true },
      orderStatus: { type: Boolean, default: true },
      shipping: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true }
    }
  },

  // SEO Settings
  seo: {
    metaTitle: { type: String, default: 'Rerendet Coffee - Premium Coffee Blends' },
    metaDescription: { type: String, default: 'Discover our premium coffee blends roasted to perfection. Fresh beans delivered to your doorstep.' },
    keywords: { type: String, default: 'coffee, beans, brew, kenya, arabica' },
    googleAnalyticsId: { type: String, default: '' },
    googleTagManagerId: { type: String, default: '' },
    canonicalUrl: { type: String, default: '' },
    enableStructuredData: { type: Boolean, default: true },
    social: {
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
      twitter: { type: String, default: '' }
    }
  },

  // Policies
  policies: {
    privacyPolicy: { type: String, default: '' },
    termsConditions: { type: String, default: '' },
    refundPolicy: { type: String, default: '' },
    shippingPolicy: { type: String, default: '' }
  },

  // Maintenance Settings
  maintenance: {
    enabled: { type: Boolean, default: false },
    message: { type: String, default: 'We are currently performing maintenance. Please check back soon.' }
  }

}, {
  timestamps: true
});

// Create single document with default settings
settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = new this();
    await settings.save();
  }
  return settings;
};

export default mongoose.model('Settings', settingsSchema);