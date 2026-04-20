// server.js - CLEAN REORGANIZED VERSION
import dotenv from 'dotenv';
// Load environment variables IMMEDIATELY
dotenv.config();
// CACHE BUSTER: 2026-02-28 03:22 - Trigger Restart
console.log(`🚀 [BACKEND] Starting server`);
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import xss from 'xss-clean';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Import local modules
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import { startCronJobs } from './utils/cronJobs.js';
import maintenanceMode from './middleware/maintenanceMiddleware.js';

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
import marketingRoutes from './routes/marketingRoutes.js';
import blogRoutes from './routes/blogRoutes.js';
import adRoutes from './routes/adRoutes.js';

// Import models
import User from './models/User.js';
import Product from './models/Product.js';
import Order from './models/Order.js';
import Contact from './models/Contact.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Ensure DB is connected for serverless calls BEFORE hitting any routes
app.use(async (req, res, next) => {
  if (process.env.VERCEL) {
    await connectDB();
  }
  next();
});

// 1. Basic Middlewares & Security
app.set('trust proxy', 1);

// Global rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Specific limiter for Auth & Contact (sensitive endpoints)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 requests per hour
  message: 'Too many login attempts, please try again after an hour'
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit contact form submissions
  message: 'Too many messages sent. Please try again later.'
});

// Global logger
app.use((req, res, next) => {
  console.log(`📡 [${req.method}] ${req.path} - Origin: ${req.get('Origin')}`);
  next();
});

// Apply global limiter
app.use('/api/', apiLimiter);

// CORS configuration - Allow multiple origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5004',
  'http://127.0.0.1:5004',
  'https://rerendet-website.vercel.app',
  'https://rerendet-website-two.vercel.app',
  'https://rerendet-coffee.com'
];
if (process.env.CLIENT_URL) allowedOrigins.push(process.env.CLIENT_URL);
if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL);

app.use(cors({
  origin: (origin, callback) => {
    // Check if origin is allowed
    const isAllowed = !origin ||
      allowedOrigins.includes(origin) ||
      allowedOrigins.some(o => origin.startsWith(o)) ||
      allowedOrigins.some(o => origin.replace(/\/$/, '') === o.replace(/\/$/, '')) ||
      (origin.endsWith('.vercel.app') && origin.includes('rerendet')); // Allow all rerendet vercel previews

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log(`❌ CORS Blocked: '${origin}' against allowed:`, allowedOrigins);
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
        "https://oauth2.googleapis.com"
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

// Cookie parser — needed to read the HttpOnly refresh token cookie
app.use(cookieParser());

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    environment: process.env.NODE_ENV,
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    time: new Date()
  });
});

// 1.5 Maintenance Mode (Global Check)
app.use('/api/', maintenanceMode);

// 2. API Routes
app.use('/api/blogs', blogRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payments', paymentRoutes); // Mount simulated payment webhook
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/newsletter', subscriberRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/promotions', adRoutes);

// Custom public routes with rate limiting
app.post('/api/contact', contactLimiter, async (req, res, next) => {
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


// 3. Static Assets (Production)
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.resolve(__dirname, 'client/build');
  console.log(`📂 [STATIC] Production mode. Absolute Path: ${publicPath}`);

  app.use(express.static(publicPath));

  // Only handle GET requests for SPA routing
  // SSR-Lite for SEO: Inject Meta Tags for Product Pages
  app.get('/product/:slug', async (req, res) => {
    try {
      const slug = req.params.slug;
      const product = await Product.findOne({ 'seo.slug': slug });

      const indexPath = path.resolve(publicPath, 'index.html');
      let indexHtml = fs.readFileSync(indexPath, 'utf8');

      if (product) {
        const title = product.seo?.title || `${product.name} | Rerendet Coffee`;
        const description = product.seo?.description || product.description.substring(0, 160);
        const image = product.images?.[0]?.url || 'https://rerendet-coffee.vercel.app/og-image.jpg';
        const url = `https://rerendet-coffee.com/product/${slug}`;
        const price = product.sizes?.[0]?.price || 0;

        // Inject dynamic meta tags
        const metaTags = `
          <title>${title}</title>
          <meta name="description" content="${description}">
          <meta property="og:title" content="${title}">
          <meta property="og:description" content="${description}">
          <meta property="og:image" content="${image}">
          <meta property="og:url" content="${url}">
          <meta property="og:type" content="product">
          <meta property="product:price:amount" content="${price}">
          <meta property="product:price:currency" content="KES">
          <meta name="twitter:card" content="summary_large_image">
          <meta name="twitter:title" content="${title}">
          <meta name="twitter:description" content="${description}">
          <meta name="twitter:image" content="${image}">
        `;

        // Replace existing title or head content
        indexHtml = indexHtml.replace('<title>Rerendet Coffee</title>', metaTags);
        // If the tag isn't exactly that, we can inject before </head>
        if (!indexHtml.includes(metaTags)) {
          indexHtml = indexHtml.replace('</head>', `${metaTags}</head>`);
        }
      }

      res.send(indexHtml);
    } catch (err) {
      console.error('❌ SEO Injection Error:', err);
      res.sendFile(path.resolve(publicPath, 'index.html'));
    }
  });

  app.get('*', (req, res) => {
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

const createIndexes = async () => {
  try {
    console.log('🏗️  Creating database indexes...');
    // We can also define indexes in models, but ensuring they are built here
    await User.createIndexes();
    console.log('✅ User indexes created');
    await Product.createIndexes();
    console.log('✅ Product indexes created');
    await Order.createIndexes();
    console.log('✅ Order indexes created');
  } catch (err) { console.error('❌ Index creation error:', err.message); }
};

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production' || process.env.RENDER || !process.env.VERCEL) {
  connectDB().then(() => {
    createDefaultAdmin();
    createIndexes();
    app.listen(PORT, () => {
      startCronJobs();
      console.log(`🚀 Server running on port ${PORT}`);
    });
  });
}

export default app;