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

/**
 * AUTH CONTRACT:
 * - Firebase = identity proof only
 * - JWT = session auth only
 * - MySQL = single source of truth
 * - syncUser() MUST be used for all Firebase identities
 * 
 * PRODUCTION HARDENED: Hybrid Auth Middleware
 * Supports both Legacy JWT and Firebase Identity Proof
 */
const authRequired = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // 🚨 SILENT REVIVE: Check for Refresh Token Cookie as Fallback
            const refreshToken = req.cookies?.refreshToken;
            if (refreshToken) {
                const { refreshTokens: rtSchema } = require('../db/schema');
                const rtResult = await db.select()
                    .from(rtSchema)
                    .where(eq(rtSchema.token, refreshToken))
                    .limit(1);

                const storedToken = rtResult[0];
                if (storedToken && new Date(storedToken.expiresAt) > new Date()) {
                    // Valid cookie! Hydrate from DB
                    const userResult = await db.select().from(users).where(eq(users.id, storedToken.userId)).limit(1);
                    if (userResult[0]) {
                        req.user = {
                            ...userResult[0],
                            isHost: userResult[0].hostStatus === 'VERIFIED',
                            isAdmin: userResult[0].isAdmin
                        };
                        return next();
                    }
                }
            }
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const token = authHeader.split(' ')[1];
        let decoded = null;
        let isFirebase = false;

        // 1. Detection Phase: Check if it's a Firebase token (STRONG)
        try {
            const raw = jwt.decode(token, { complete: true });
            // Canonical Firebase detection: check issuer
            if (raw?.payload?.iss === `https://securetoken.google.com/${process.env.FIREBASE_PROJECT_ID}`) {
                isFirebase = true;
            }
        } catch (e) {
            // Not a valid JWT structure at all
            return res.status(401).json({ success: false, message: 'Invalid token format' });
        }

        let userId = null;
        let firebaseUser = null;

        if (isFirebase) {
            // 2a. Firebase Path
            try {
                firebaseUser = await verifyIdToken(token);
                req.firebaseUser = firebaseUser;

                // 🚨 CRITICAL: Enforce Email Verification for Firebase Users
                if (!firebaseUser.email_verified && process.env.NODE_ENV === 'production') {
                    console.log(`🔐 Access Denied: Unverified email for UID ${firebaseUser.uid}`);
                    return res.status(403).json({
                        success: false,
                        message: 'Email verification required',
                        code: 'EMAIL_NOT_VERIFIED',
                        email: firebaseUser.email
                    });
                }

                const syncedUser = await syncUser(firebaseUser);
                userId = syncedUser.id;
            } catch (err) {
                console.error('🔐 Firebase token verification failed:', err.message);
                return res.status(401).json({ success: false, message: 'Invalid or expired identity token' });
            }
        } else {
            // 2b. Legacy Path
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET);
                userId = decoded.id || decoded.userId;
            } catch (err) {
                if (err.name === 'TokenExpiredError') {
                    return res.status(401).json({ success: false, message: 'Session expired', code: 'TOKEN_EXPIRED' });
                }
                console.error('🔐 Legacy token verification failed:', err.message);
                return res.status(401).json({ success: false, message: 'Access denied: Invalid session' });
            }
        }

        // 3. Database hydration (Authoritative data)
        const result = await db.select({
            id: users.id,
            email: users.email,
            username: users.username,
            role: users.role,
            isAdmin: users.isAdmin,
            playerCode: users.playerCode,
            hostStatus: users.hostStatus,
            isBanned: users.isBanned
        })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        const user = result[0];

        if (!user) {
            return res.status(401).json({ success: false, message: 'Identity missing' });
        }

        if (user.isBanned) {
            return res.status(403).json({ success: false, message: 'Access denied: Account suspended' });
        }

        // 4. Final Attachment
        req.user = {
            ...user,
            isHost: user.hostStatus === 'VERIFIED', // Host is operational state, not role
            isAdmin: user.isAdmin
        };

        next();
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

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            let isFirebase = false;

            // Detect Firebase token
            try {
                const raw = jwt.decode(token, { complete: true });
                if (raw?.payload?.iss === `https://securetoken.google.com/${process.env.FIREBASE_PROJECT_ID}`) {
                    isFirebase = true;
                }
            } catch (e) {
                // Invalid token, silently continue
            }

            if (isFirebase) {
                // Firebase path
                try {
                    const firebaseUser = await verifyIdToken(token);
                    req.firebaseUser = firebaseUser;
                    const syncedUser = await syncUser(firebaseUser);
                    req.user = syncedUser;
                } catch (err) {
                    // Silently continue without user
                }
            } else {
                // JWT path
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
                    if (user) {
                        req.user = user;
                    }
                } catch (err) {
                    // Silently continue without user
                }
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
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split('Bearer ')[1];
            const decoded = await verifyIdToken(token);
            if (decoded.aud === process.env.FIREBASE_PROJECT_ID) {
                req.firebaseUser = decoded;
            }
        }
        next();
    } catch (error) {
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
