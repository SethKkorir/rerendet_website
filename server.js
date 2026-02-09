// server.js - CLEAN REORGANIZED VERSION
import dotenv from 'dotenv';
// Load environment variables IMMEDIATELY
dotenv.config();
const VERSION = 'V3.2-CSP-FIX';
console.log(`🚀 [BACKEND] Starting server version: ${VERSION}`);
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import xss from 'xss-clean';
import path from 'path';
import { fileURLToPath } from 'url';

// Import local modules
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import { startCronJobs } from './utils/cronJobs.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import subscriberRoutes from './routes/subscriberRoutes.js';

// Import models
import User from './models/User.js';
import Contact from './models/Contact.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1. Basic Middlewares & Security
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Global logger
app.use((req, res, next) => {
  console.log(`📡 [${req.method}] ${req.path} - Origin: ${req.get('Origin')}`);
  next();
});

// CORS configuration - Allow multiple origins
const allowedOrigins = [
  'http://localhost:3000',
  'https://rerendetwebsite.vercel.app',
  'https://rerendet-coffee.vercel.app',
  'https://rerendet-website-two.vercel.app'
];
if (process.env.CLIENT_URL) allowedOrigins.push(process.env.CLIENT_URL);

app.use(cors({
  origin: (origin, callback) => {
    // Check if origin is allowed
    const isAllowed = !origin ||
      allowedOrigins.indexOf(origin) !== -1 ||
      allowedOrigins.some(o => origin.startsWith(o)) ||
      origin.includes('vercel.app'); // Bonus: Allow all vercel subdomains of the project

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log(`❌ CORS Blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200
}));

// Security headers
app.use(helmet({
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com", "https://apis.google.com"],
      connectSrc: [
        "'self'",
        "https://accounts.google.com",
        "https://oauth2.googleapis.com",
        "https://rerendetwebsite.vercel.app",
        "https://rerendet-coffee.vercel.app",
        "https://rerendet-website-two.vercel.app"
      ],
      frameSrc: ["'self'", "https://accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
    },
  },
  referrerPolicy: { policy: "no-referrer-when-downgrade" }
}));

// Manual overrides for browser compliance
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Sanitization
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Move health check to /api/status to avoid hijacking the root path
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: "Rerendet API is LIVE",
    version: VERSION,
    timestamp: new Date()
  });
});

// 2. API Routes
// Mount specific routes first
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/newsletter', subscriberRoutes);

// Custom public routes
app.post('/api/contact', async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      res.status(400);
      throw new Error('All fields are required');
    }
    const contact = new Contact({ name, email, subject, message });
    await contact.save();
    res.status(201).json({ success: true, message: 'Message sent successfully!' });
  } catch (err) { next(err); }
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    version: VERSION,
    environment: process.env.NODE_ENV,
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    time: new Date()
  });
});

// 3. Static Assets (Production)
if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
  const publicPath = path.resolve(__dirname, 'public');
  console.log(`📂 [STATIC] Serving assets from: ${publicPath}`);

  app.use(express.static(publicPath, {
    maxAge: '1d',
    etag: true
  }));

  // Only handle GET requests for SPA routing, skip /api
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.resolve(publicPath, 'index.html'));
  });
}

// 4. Error Handling (Must be last)
app.use(notFound);
app.use(errorHandler);

// 5. Connection & Server Start
const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ email: 'admin@rerendetcoffee.com' });
    if (!adminExists) {
      await User.create({
        firstName: 'Super', lastName: 'Admin',
        email: 'admin@rerendetcoffee.com', password: 'Admin123!',
        phone: '+254700000000', userType: 'admin', role: 'super-admin',
        isVerified: true, isActive: true,
        adminPermissions: { canManageUsers: true, canManageProducts: true, canManageOrders: true, canManageContent: true }
      });
      console.log('✅ Default admin created');
    }
  } catch (err) { console.error('❌ Admin creation error:', err.message); }
};

// Start listening ONLY if not in Vercel environment
const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  connectDB().then(() => {
    createDefaultAdmin();
    app.listen(PORT, () => {
      startCronJobs();
      console.log(`🚀 Server running on port ${PORT}`);
    });
  });
} else {
  // On Vercel, connection is handled differently 
  // but we still want to ensure DB connects for the request
  // Most Vercel apps connect on first request or as a top-level await if supported
  connectDB();
}

export default app;