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
                isAdmin: users.isAdmin, // New
                playerCode: users.playerCode, // New
                hostStatus: users.hostStatus,
                isBanned: users.isBanned
            })
                .from(users)
                .where(eq(users.id, decoded.id)) // JWT now uses 'id', was 'userId' in previous legacy? Check generateToken
                .limit(1);

            const user = result[0];

            if (!user) {
                return res.status(401).json({ success: false, message: 'User not found' });
            }

            // Hydrate User Object with claims
            req.user = {
                ...user,
                // If token has claims, trust them or prefer DB? 
                // DB is authoritative for bans/status. 
                // Token is authoritative for session scope (isHost).
                isHost: decoded.isHost || (user.hostStatus === 'VERIFIED'), // Fallback
                isAdmin: user.isAdmin // DB is source of truth for admin
            };
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

// 2. Admin Guard
const isAdmin = (req, res, next) => {
    // Check token claim first (Fast)
    if (req.user && req.user.isAdmin) {
        return next();
    }

    // Fallback: Check role (Legacy)
    if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN')) {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'Access denied: Admin privileges required'
    });
};

// 3. Super Admin Guard
const isSuperAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'SUPERADMIN')) {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: 'Access denied: Super Admin privileges required'
    });
};

// 4. Host Guard (New)
const isHost = (req, res, next) => {
    // Check token claim
    if (req.user && req.user.isHost) {
        return next();
    }
    // Fallback: Check legacy database status if missing from token (optional)
    if (req.user && req.user.hostStatus === 'VERIFIED') {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'Access denied: Host privileges required'
    });
};

// 5. Universal Role Guard (Legacy Compatibility + New Flags)
const authorize = (...allowedRoles) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Super Admin always works if explicitly requested or if we treat them as god mode (usually handled by isAdmin check being lenient)
    // But here we check specific matches.

    let hasPermission = false;

    // Check Player (Everyone is a player)
    if (allowedRoles.includes('PLAYER')) {
        hasPermission = true;
    }

    // Check Host
    if (allowedRoles.includes('HOST')) {
        if (req.user.isHost || req.user.hostStatus === 'VERIFIED') {
            hasPermission = true;
        }
    }

    // Check Admin
    if (allowedRoles.includes('ADMIN')) {
        if (req.user.isAdmin) {
            hasPermission = true;
        }
    }

    // Check Super Admin
    if (allowedRoles.includes('SUPERADMIN')) {
        if (req.user.role === 'SUPERADMIN') {
            hasPermission = true;
        }
    }

    if (hasPermission) {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
    });
};

module.exports = {
    authRequired,
    authOptional,
    authenticate: authRequired, // Alias
    isAdmin,      // New Guard
    isSuperAdmin, // New Guard
    isHost,       // New Guard
    authorize     // Restored Legacy Guard
};
