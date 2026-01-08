/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize Firebase and Redis
const { initializeFirebase, checkFirebaseHealth, closeFirebase } = require('./config/firebase.config');
const { createRedisClient, checkRedisHealth, closeRedis } = require('./config/redis.config');
const { db } = require('./db');
const { sql } = require('drizzle-orm');


// Import routes
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/user/user.routes');
const tournamentRoutes = require('./modules/tournament/tournament.routes');
const walletRoutes = require('./modules/wallet/wallet.routes');
const adminRoutes = require('./modules/admin/admin.routes');

const app = express();

// Middleware
const security = require('./middleware/security.middleware');

// Enable if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
app.set('trust proxy', 1);

app.use(security.helmet);
app.use(security.globalLimiter);

// ✅ FIX: Robust CORS for Vercel (allows all subdomains/previews)
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Explicitly allow Localhost and Production Frontend
    const allowedDefaults = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'https://titan-arena-ui.vercel.app'
    ];

    // Check if origin is in defaults OR ends with .vercel.app
    if (allowedDefaults.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    // Optional: Allow specific custom domains if needed
    if (process.env.CORS_ORIGINS && process.env.CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    console.warn('Blocked CORS for:', origin);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400 // 24 hours
}));

app.use(require('cookie-parser')());

// ✅ FIX: Explicit JSON size limit to prevent memory abuse
app.use(express.json({ limit: '100kb' })); // Reduced to 100kb as per recommendation

// ✅ FIX: Preventing HTTP Parameter Pollution (HPP)
app.use(security.hpp);

// Note: Blind XSS sanitization middleware removed per strict security review.
// Input validation (Zod) and Output encoding (React/Engine) is the correct defense.

// Health check
app.get('/api/health', async (req, res) => {
  const firebaseHealth = await checkFirebaseHealth();
  const redisHealth = await checkRedisHealth();

  // ✅ FIX: Redis = hard dependency, Firebase = soft dependency
  const isHealthy = redisHealth.status === 'connected';
  const isDegraded = firebaseHealth.status !== 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isDegraded ? 'DEGRADED' : 'OK',
    message: isDegraded
      ? 'API operational but real-time features may be unavailable'
      : 'E-sports Tournament API',
    timestamp: new Date().toISOString(),
    services: {
      api: 'running',
      redis: redisHealth,
      firebase: firebaseHealth
    }
  });
});

// Middleware to ensure services are initialized (for Serverless/Vercel)
let servicesInitialized = false;
let initPromise = null;

const initializeServices = async () => {
  if (servicesInitialized) return;

  try {
    // Initialize independently to allow partial failures (soft dependencies)
    try {
      initializeFirebase();
    } catch (e) { console.warn('Firebase Init Warning:', e.message); }

    try {
      const redisHealth = await checkRedisHealth();
      if (redisHealth.status !== 'connected') {
        await createRedisClient();
      }
    } catch (e) { console.warn('Redis Init Warning:', e.message); }

    // Check Database Connection
    try {
      await db.execute(sql`SELECT 1`);
      console.log('✅ Database: Connected and ready');
    } catch (e) {
      console.error('❌ Database Init Warning:', e.message);
      // We don't throw here to allow partial startup if DB is momentarily down, 
      // but typically DB is critical.
    }

    servicesInitialized = true;
    console.log('✅ Services initialized');
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
  }
};

// Global middleware to await services in serverless environment
app.use(async (req, res, next) => {
  if (!servicesInitialized) {
    if (!initPromise) initPromise = initializeServices();
    await initPromise;
  }
  next();
});

// Routes
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/admin', require('./modules/admin/admin.routes'));
app.use('/api/tournaments', require('./modules/tournament/tournament.routes'));
app.use('/api/games', require('./modules/game/game.routes'));
app.use('/api/teams', require('./modules/team/team.routes'));
app.use('/api/wallet', require('./modules/wallet/wallet.routes')); // Wallet Routes
app.use('/api/payment', require('./modules/payment/payment.routes'));
app.use('/api/host', require('./modules/host/host.routes')); // Host Module
app.use('/api/social', require('./modules/social/social.routes')); // New Social Module
app.use('/api/stats', require('./modules/stats/stats.routes')); // Stats & Leaderboard
app.use('/api/notifications', require('./modules/notification/notification.routes')); // Notifications
app.use('/api/users', require('./modules/user/user.routes')); // User Profile Routes
app.use('/api/upload', require('./routes/upload.routes')); // File Upload Routes

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Error handling middleware
app.use((err, req, res, next) => {
  // ✅ FIX: Production-safe error logging (no stack traces in prod)
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error stack:', err.stack);
  } else {
    console.error('Error:', err.message);
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server if run directly (Local/Docker)
if (require.main === module) {
  const startServer = async () => {
    const PORT = process.env.PORT || 5001;
    try {
      console.log('🚀 Starting E-sports Tournament API...');

      // Explicit initialization for local server
      await initializeServices();

      const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n✅ Server running successfully!`);
        console.log(`📊 API URL: http://0.0.0.0:${PORT}`);
        console.log(`ENVIRONMENT: ${process.env.NODE_ENV || 'development'}\n`);
      });

      // Graceful shutdown
      const gracefulShutdown = (signal) => {
        console.log(`\n${signal} received. Starting graceful shutdown...`);
        server.close(async () => {
          console.log('🔒 HTTP server closed');
          await closeFirebase();
          await closeRedis();
          console.log('✅ Graceful shutdown complete\n');
          process.exit(0);
        });
        setTimeout(() => {
          console.error('❌ Forced shutdown after timeout');
          process.exit(1);
        }, 10000);
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
      console.error('❌ Failed to start server:', error.message);
      process.exit(1);
    }
  };

  startServer();
}


