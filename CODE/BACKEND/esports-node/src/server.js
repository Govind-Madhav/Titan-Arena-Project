require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./config/prisma');

// Import routes
const authRoutes = require('./modules/auth/auth.routes');
const walletRoutes = require('./modules/wallet/wallet.routes');
const hostRoutes = require('./modules/kyc/kyc.routes');
const teamRoutes = require('./modules/team/team.routes');
const tournamentRoutes = require('./modules/tournament/tournament.routes');
const matchRoutes = require('./modules/match/match.routes');
const disputeRoutes = require('./modules/dispute/dispute.routes');
const notificationRoutes = require('./modules/notification/notification.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const gameRoutes = require('./modules/game/game.routes');

const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({
            status: 'OK',
            message: 'E-sports Tournament API is running',
            database: 'connected'
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            message: 'Database connection failed',
            database: 'disconnected'
        });
    }
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/host', hostRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/games', gameRoutes);

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    console.error(err.stack);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.path} not found`
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 E-sports Tournament API running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
