/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { users } = require('../db/schema');
const { eq } = require('drizzle-orm');

/**
 * Verify JWT access token and attach user to request
 */
const authRequired = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const result = await db.select({
                id: users.id,
                email: users.email,
                username: users.username,
                role: users.role,
                hostStatus: users.hostStatus,
                isBanned: users.isBanned
            })
                .from(users)
                .where(eq(users.id, decoded.userId))
                .limit(1);

            const user = result[0];

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found'
                });
            }

            req.user = user;
            next();
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token expired',
                    code: 'TOKEN_EXPIRED'
                });
            }
            throw jwtError;
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

/**
 * Optional auth - attach user if token present, but don't fail
 */
const authOptional = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const result = await db.select({
                id: users.id,
                email: users.email,
                username: users.username,
                role: users.role,
                hostStatus: users.hostStatus,
                isBanned: users.isBanned
            })
                .from(users)
                .where(eq(users.id, decoded.userId))
                .limit(1);

            const user = result[0];

            if (user) {
                req.user = user;
            }
        }
        next();
    } catch (error) {
        // Silently continue without user
        next();
    }
};

module.exports = {
    authRequired,
    authOptional,
    authenticate: authRequired, // Alias for routes
    authorize: (...roles) => (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (roles.length > 0 && !roles.includes(req.user.role)) {
            // Allow ADMIN and SUPERADMIN to access everything
            if (req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN') {
                return next();
            }

            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }

        next();
    }
};
