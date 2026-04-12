/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { users } = require('../db/schema');
const { eq } = require('drizzle-orm');

const { verifyIdToken } = require('../config/firebase.config');
const { syncUser } = require('../services/userSync.service');

const hasBearerHeader = (authHeader) => authHeader?.startsWith('Bearer ');
const getBearerToken = (authHeader) => authHeader.split(' ')[1];

const isFirebaseBearerToken = (token) => {
    const raw = jwt.decode(token, { complete: true });
    return raw?.payload?.iss === `https://securetoken.google.com/${process.env.FIREBASE_PROJECT_ID}`;
};

const normalizeRole = (role) => (role === 'SUPER_ADMIN' ? 'SUPERADMIN' : role);

const buildSessionUser = (user) => ({
    ...user,
    role: normalizeRole(user.role),
    isHost: user.hostStatus === 'VERIFIED',
    isAdmin: user.isAdmin
});

const hydrateUserById = async (userId) => {
    const result = await db.select({
        id: users.id,
        email: users.email,
        username: users.username,
        role: users.role,
        isAdmin: users.isAdmin,
        playerCode: users.playerCode,
        hostStatus: users.hostStatus,
        isBanned: users.isBanned,
        emailVerified: users.emailVerified,
        phoneVerified: users.phoneVerified,
        registrationCompleted: users.registrationCompleted,
        legalName: users.legalName,
        phone: users.phone,
        billingAddress: users.billingAddress
    })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    return result[0] || null;
};

const hydrateUserFromRefreshCookie = async (refreshToken) => {
    const { refreshTokens: rtSchema } = require('../db/schema');
    const rtResult = await db.select()
        .from(rtSchema)
        .where(eq(rtSchema.token, refreshToken))
        .limit(1);

    const storedToken = rtResult[0];
    if (!storedToken || new Date(storedToken.expiresAt) <= new Date()) {
        return null;
    }

    const userResult = await db.select().from(users).where(eq(users.id, storedToken.userId)).limit(1);
    return userResult[0] ? buildSessionUser(userResult[0]) : null;
};

const resolveUserIdFromToken = async (token, req) => {
    if (isFirebaseBearerToken(token)) {
        const firebaseUser = await verifyIdToken(token);
        req.firebaseUser = firebaseUser;

        if (!firebaseUser.email_verified && process.env.NODE_ENV === 'production') {
            const error = new Error('Email verification required');
            error.status = 403;
            error.payload = {
                success: false,
                message: 'Email verification required',
                code: 'EMAIL_NOT_VERIFIED',
                email: firebaseUser.email
            };
            throw error;
        }

        const syncedUser = await syncUser(firebaseUser);
        return syncedUser.id;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id || decoded.userId;
};

/**
 * AUTH CONTRACT:
 * - Firebase = identity proof only
 * - JWT = session auth only
 * - PostgreSQL = single source of truth
 * - syncUser() MUST be used for all Firebase identities
 * 
 * PRODUCTION HARDENED: Hybrid Auth Middleware
 * Supports both Legacy JWT and Firebase Identity Proof
 */
const authRequired = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!hasBearerHeader(authHeader)) {
            const refreshToken = req.cookies?.refreshToken;
            if (!refreshToken) {
                return res.status(401).json({ success: false, message: 'Authentication required' });
            }

            const revivedUser = await hydrateUserFromRefreshCookie(refreshToken);
            if (!revivedUser) {
                return res.status(401).json({ success: false, message: 'Authentication required' });
            }

            req.user = revivedUser;
            return next();
        }

        const token = getBearerToken(authHeader);
        let userId;
        try {
            userId = await resolveUserIdFromToken(token, req);
        } catch (error) {
            if (error.payload) {
                return res.status(error.status || 403).json(error.payload);
            }
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ success: false, message: 'Session expired', code: 'TOKEN_EXPIRED' });
            }
            return res.status(401).json({ success: false, message: 'Invalid or expired identity token' });
        }

        const user = await hydrateUserById(userId);

        if (!user) {
            return res.status(401).json({ success: false, message: 'Identity missing' });
        }

        if (user.isBanned) {
            return res.status(403).json({ success: false, message: 'Access denied: Account suspended' });
        }

        req.user = buildSessionUser(user);

        return next();
    } catch (error) {
        console.error('🔴 Auth Middleware Critical Error:', error);
        return res.status(500).json({ success: false, message: 'Authentication service error' });
    }
};

/**
 * Optional auth - attach user if token present, but don't fail
 * HYBRID-AWARE: Supports both Firebase and JWT
 */
const authOptional = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!hasBearerHeader(authHeader)) {
            return next();
        }

        const token = getBearerToken(authHeader);
        try {
            if (isFirebaseBearerToken(token)) {
                const firebaseUser = await verifyIdToken(token);
                req.firebaseUser = firebaseUser;
                const syncedUser = await syncUser(firebaseUser);
                req.user = buildSessionUser(syncedUser);
                return next();
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await hydrateUserById(decoded.id || decoded.userId);
            if (user) {
                req.user = buildSessionUser(user);
            }
        } catch (error) {
            console.debug('authOptional token skipped:', error?.message);
        }

        return next();
    } catch (error) {
        console.debug('authOptional fallback:', error?.message);
        next();
    }
};

// 2. Admin Guard
const isAdmin = (req, res, next) => {
    // Check token claim first (Fast)
    if (req.user?.isAdmin) {
        return next();
    }

    // Fallback: Check role (Legacy)
    if (req.user?.role === 'ADMIN' || req.user?.role === 'SUPERADMIN') {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'Access denied: Admin privileges required'
    });
};

// 3. Super Admin Guard
const isSuperAdmin = (req, res, next) => {
    if (req.user?.role === 'SUPERADMIN') {
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
    if (req.user?.isHost) {
        return next();
    }
    // Fallback: Check legacy database status if missing from token (optional)
    if (req.user?.hostStatus === 'VERIFIED') {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'Access denied: Host privileges required'
    });
};

// 5. Universal Role Guard (Fixed Permission Logic)
const authorize = (...allowedRoles) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    let hasPermission = false;

    // Check actual role
    if (allowedRoles.includes(req.user.role)) {
        hasPermission = true;
    }

    // Check Host (operational state, not role)
    if (allowedRoles.includes('HOST')) {
        if (req.user.isHost || req.user.hostStatus === 'VERIFIED') {
            hasPermission = true;
        }
    }

    // Check Admin flag
    if (allowedRoles.includes('ADMIN')) {
        if (req.user.isAdmin) {
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

/**
 * PRODUCTION HARDENED: Verify Firebase ID Token
 * This replaces legacy JWT verification for Identity-Provider-driven flows.
 */
const firebaseAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!hasBearerHeader(authHeader)) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required (ID Token missing)'
            });
        }

        const token = authHeader.split('Bearer ')[1];

        // 1. Signature & Expiry Check (Hardened)
        const decoded = await verifyIdToken(token);

        // 2. Audience Verification (Critical for Project Isolation)
        if (decoded.aud !== process.env.FIREBASE_PROJECT_ID) {
            console.error('❌ Security Alert: Token Audience Mismatch detected.', {
                expected: process.env.FIREBASE_PROJECT_ID,
                received: decoded.aud
            });
            return res.status(401).json({ success: false, message: 'Invalid token source' });
        }

        // Attach Firebase User to request
        req.firebaseUser = decoded;
        next();
    } catch (error) {
        console.error('🔐 Firebase Auth Audit Failure:', error.message);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired identity token',
            code: 'AUTH_TOKEN_INVALID'
        });
    }
};

/**
 * Optional Firebase Auth
 */
const firebaseAuthOptional = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (hasBearerHeader(authHeader)) {
            const token = authHeader.split('Bearer ')[1];
            const decoded = await verifyIdToken(token);
            if (decoded.aud === process.env.FIREBASE_PROJECT_ID) {
                req.firebaseUser = decoded;
            }
        }
        next();
    } catch (error) {
        console.debug('firebaseAuthOptional fallback:', error?.message);
        next();
    }
};

module.exports = {
    authRequired,
    authOptional,
    firebaseAuth,
    firebaseAuthOptional,
    authenticate: authRequired, // Alias legacy
    isAdmin,      // New Guard
    isSuperAdmin, // New Guard
    isHost,       // New Guard
    authorize     // Restored Legacy Guard
};
