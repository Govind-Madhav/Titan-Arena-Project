/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Initialize Firebase and Redis
const { initializeFirebase, checkFirebaseHealth, closeFirebase } = require('./config/firebase.config');
const { createRedisClient, checkRedisHealth, closeRedis } = require('./config/redis.config');


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

// ✅ FIX: Environment-based CORS origins (never hardcode in production)
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];
app.use(cors({
  origin: corsOrigins,
  credentials: true // Important for cookies
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

const PORT = process.env.PORT || 5000;

// Initialize services and start server
const startServer = async () => {
  try {
    console.log('🚀 Starting E-sports Tournament API...');
    console.log(`📦 Process ID: ${process.pid}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);

    // ✅ FIX: Guarded Firebase initialization (soft dependency)
    console.log('📱 Initializing Firebase...');
    try {
      initializeFirebase();
      console.log('✅ Firebase initialized successfully');
    } catch (error) {
      console.warn('⚠️  Firebase initialization failed (real-time features disabled):', error.message);
      console.warn('   API will continue without Firebase - only core features available');
    }

    // Initialize Redis (soft dependency)
    console.log('💾 Initializing Redis...');
    try {
      await createRedisClient();
    } catch (error) {
      console.warn('⚠️  Redis initialization failed (cache disabled):', error.message);
    }

    // Start Express server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('\n✅ Server running successfully!');
      console.log(`📊 API URL: http://0.0.0.0:${PORT}`);
      console.log(`🏥 Health check: http://0.0.0.0:${PORT}/api/health`);
      console.log(`🔌 CORS origins: ${corsOrigins.join(', ')}\n`);
    });

    // Graceful shutdown handler
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async () => {
        console.log('🔒 HTTP server closed');

        // Close Firebase
        await closeFirebase();

        // Close Redis
        await closeRedis();

        console.log('✅ Graceful shutdown complete\n');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Start the server
startServer();
