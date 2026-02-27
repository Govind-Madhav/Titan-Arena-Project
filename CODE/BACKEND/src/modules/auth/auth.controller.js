/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { users, wallets, refreshTokens, playerProfiles, hostProfiles } = require('../../db/schema');
const { eq, or, and, gt } = require('drizzle-orm');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { z } = require('zod');
const emailService = require('../../utils/email.service');
const statsService = require('../../services/stats.service');
const uidService = require('../../services/uid.service');
const otpService = require('../../services/otp.service');
const { syncUser } = require('../../services/userSync.service');
const { validateSubRegion } = require('../../config/regions.config');
const { admin } = require('../../config/firebase.config');

// Validation schemas
const signupSchema = z.object({
    ign: z.string().min(3, 'Gamertag must be at least 3 characters').max(20, 'Gamertag must be at most 20 characters'), // Allow any characters
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    legalName: z.string().min(2, 'Legal Name is required'),
    dateOfBirth: z.string().refine((val) => {
        const date = new Date(val);
        const age = new Date().getFullYear() - date.getFullYear();
        return age >= 13;
    }, 'You must be at least 13 years old'),
    phone: z.string().optional(), // Optional until OTP is implemented
    region: z.number().int().min(1).max(6, 'Region must be between 1-6'), // User must select
    subRegion: z.string().optional(), // Optional sub-region
    country: z.string().min(2, 'Country is required'),
    state: z.string().min(2, 'State is required'),
    city: z.string().optional(),
    username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'), // Strict validation for username
    termsAccepted: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
    role: z.enum(['PLAYER', 'ADMIN', 'SUPERADMIN']).optional().default('PLAYER')
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
});

const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
});

const metadataSchema = z.object({
    ign: z.string().min(3).optional(),
    username: z.string().min(3).optional(),
    legalName: z.string().min(2).optional(),
    dateOfBirth: z.string().optional(),
    region: z.number().int().min(1).max(6).optional(),
    subRegion: z.string().optional(),
    country: z.string().min(2).optional(),
    state: z.string().min(2).optional(),
    city: z.string().optional(),
    phone: z.string().optional()
});


// Generate tokens
const generateAccessToken = (userId, platformUid) => {
    return jwt.sign(
        { userId, platformUid, type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
    );
};

const generateRefreshToken = (userId) => {
    return jwt.sign(
        { userId, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
    );
};

// Check IGN availability (dedicated endpoint)
exports.checkIgnAvailability = async (req, res) => {
    try {
        const { ign } = req.body;

        if (!ign || ign.length < 3) {
            return res.json({ available: null });
        }

        // Check IGN (case-insensitive)
        const normalizedIgn = ign.trim().toLowerCase();
        const { sql } = require('drizzle-orm');
        const existingIgn = await db.select()
            .from(playerProfiles)
            .where(sql`LOWER(${playerProfiles.ign}) = ${normalizedIgn}`)
            .limit(1);

        res.json({ available: existingIgn.length === 0 });
    } catch (error) {
        console.error('Check IGN error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Lookup email by username
exports.lookupEmail = async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ success: false, message: 'Username required' });

        const result = await db.select({ email: users.email })
            .from(users)
            .where(eq(users.username, username))
            .limit(1);

        if (!result[0]) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, email: result[0].email });
    } catch (error) {
        console.error('Email lookup error:', error);
        res.status(500).json({ success: false, message: 'Lookup failed' });
    }
};

// Signup
exports.signup = async (req, res) => {
    try {
        const data = signupSchema.parse(req.body);

        // Check existing user in database
        const existingUsers = await db.select()
            .from(users)
            .where(or(
                eq(users.email, data.email)
            ))
            .limit(1);

        if (existingUsers[0]) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Check if there's already a pending registration for this email
        const { getRedisClient } = require('../../config/redis.config');
        const redis = getRedisClient();
        const pendingKey = `pending_registration:${data.email}`;
        const existing = await redis.get(pendingKey);

        if (existing) {
            // User is trying to register again - allow them to get a new OTP
            console.log(`📧 Resending OTP for pending registration: ${data.email}`);
            // Delete old OTP and continue with new registration
            await redis.del(`otp:register:${data.email}`);
        }

        // Normalize IGN (trim)
        const ign = data.ign.trim();

        // Validate sub-region belongs to region
        if (data.subRegion && !validateSubRegion(data.region, data.subRegion)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid sub-region for selected region'
            });
        }

        // Hash password before storing
        const passwordHash = await bcrypt.hash(data.password, 12);

        // Store pending registration in Redis (24 hour TTL)
        const pendingData = {
            ign: ign,
            email: data.email,
            passwordHash: passwordHash,
            plainPassword: data.password, // Needed for Firebase Auth createUser (Firebase cannot accept bcrypt hashes)
            username: data.username,
            legalName: data.legalName,
            dateOfBirth: data.dateOfBirth,
            phone: data.phone,
            region: data.region,
            subRegion: data.subRegion || null,
            country: data.country,
            state: data.state,
            city: data.city,
            termsAccepted: data.termsAccepted,
            role: data.role || 'PLAYER',
            timestamp: new Date().toISOString()
        };

        await redis.set(pendingKey, JSON.stringify(pendingData), {
            EX: 86400 // 24 hours
        });


        // Generate & Send OTP
        try {
            const otp = await otpService.generateOtp(data.email);
            console.log(`🔐 OTP for ${data.email}: ${otp}`); // DEV: Show OTP in terminal
            await emailService.sendVerificationEmail(data.email, otp, ign);
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
            // Clean up pending registration if email fails
            await redis.del(pendingKey);
            return res.status(500).json({
                success: false,
                message: 'Failed to send verification email. Please try again.'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Verification code sent to email. Please verify within 24 hours to complete registration.',
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.errors
            });
        }
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const data = loginSchema.parse(req.body);

        const result = await db.select({
            id: users.id,
            email: users.email,
            passwordHash: users.passwordHash,
            username: users.username,
            platformUid: users.platformUid,
            playerCode: users.playerCode,
            isAdmin: users.isAdmin, // New
            role: users.role,
            hostStatus: users.hostStatus,
            isBanned: users.isBanned,
            emailVerified: users.emailVerified,
            deactivatedAt: users.deactivatedAt, // Sync Reactivation
            // Host Profile
            hostProfileStatus: hostProfiles.status,
            hostCode: hostProfiles.hostCode,
            // Profile fields
            bio: playerProfiles.bio,
            avatarUrl: playerProfiles.avatarUrl,
            ign: playerProfiles.ign
        })
            .from(users)
            .leftJoin(playerProfiles, eq(users.id, playerProfiles.userId)) // Join
            .leftJoin(hostProfiles, eq(users.id, hostProfiles.userId)) // Join Host Profile
            .where(eq(users.email, data.email))
            .limit(1);

        const user = result[0];

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        if (!user.emailVerified) {
            return res.status(403).json({
                success: false,
                message: 'Please verify your email address before logging in'
            });
        }

        if (user.isBanned) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been banned'
            });
        }

        const isValid = await bcrypt.compare(data.password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Data integrity check
        if (!user.ign) {
            return res.status(500).json({
                success: false,
                message: 'Profile corrupted. Contact support.'
            });
        }

        // 🔄 Reactivation Logic
        if (user.deactivatedAt) {
            console.log(`♻️ Reactivating account for user: ${user.id}`);
            await db.update(users)
                .set({ deactivatedAt: null })
                .where(eq(users.id, user.id));

            // Unfreeze Wallet
            await db.update(wallets)
                .set({ status: 'ACTIVE' })
                .where(eq(wallets.userId, user.id));
        }

        const accessToken = generateAccessToken(user.id, user.platformUid);

        // Generate Refresh Token
        const refreshToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Session Tracking
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'] || 'Unknown';

        await db.insert(refreshTokens).values({
            token: refreshToken,
            userId: user.id,
            expiresAt,
            ipAddress,
            userAgent
        });

        // Set refresh token as httpOnly cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/'
        });

        // Calculate token expiry times
        const accessTokenExpiry = new Date();
        accessTokenExpiry.setMinutes(accessTokenExpiry.getMinutes() + 15);

        res.json({
            success: true,
            message: user.deactivatedAt ? 'Welcome back! Your account has been reactivated.' : 'Login successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    playerCode: user.playerCode,
                    platformUid: user.platformUid, // ALWAYS use actual platformUid
                    role: user.role,
                    isAdmin: user.isAdmin,
                    isHost: user.hostStatus === 'VERIFIED',
                    hostCode: user.hostCode,
                    hostStatus: user.hostStatus,
                    emailVerified: user.emailVerified,
                    // valid profile fields
                    bio: user.bio,
                    avatarUrl: user.avatarUrl,
                    ign: user.ign
                },
                accessToken,
                expiresAt: accessTokenExpiry.toISOString()
            }
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.errors
            });
        }
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
};

// Refresh token
exports.refresh = async (req, res) => {
    try {
        // Get refresh token from cookie
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token required'
            });
        }

        // Check if token exists in DB (refresh tokens are UUIDs, not JWTs)
        const result = await db.select()
            .from(refreshTokens)
            .where(eq(refreshTokens.token, refreshToken))
            .limit(1);

        const storedToken = result[0];

        if (!storedToken || new Date(storedToken.expiresAt) < new Date()) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token expired or revoked'
            });
        }

        const userResult = await db.select({
            id: users.id,
            platformUid: users.platformUid,
            isBanned: users.isBanned,
            deactivatedAt: users.deactivatedAt, // Check status
            emailVerified: users.emailVerified,
            hostStatus: users.hostStatus // If needed for roles
        }).from(users).where(eq(users.id, storedToken.userId)).limit(1);

        const user = userResult[0];
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        // 🚨 Security Check: Ban/Verification Status
        if (user.isBanned) {
            return res.status(403).json({ success: false, message: 'Account is banned' });
        }
        if (user.deactivatedAt) {
            return res.status(403).json({ success: false, message: 'Account is deactivated. Please login to reactivate.' });
        }
        if (!user.emailVerified) {
            return res.status(403).json({ success: false, message: 'Email not verified' });
        }

        // 🔄 Rotate Refresh Token (Security Best Practice)
        // 1. Delete old token
        await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));

        // 2. Generate new token
        const newRefreshToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Session Tracking
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'] || 'Unknown';

        await db.insert(refreshTokens).values({
            token: newRefreshToken,
            userId: user.id,
            expiresAt,
            ipAddress,
            userAgent
        });

        // 3. Set new cookie
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/'
        });

        // Generate new access token
        const accessToken = generateAccessToken(user.id, user.platformUid);

        // Calculate token expiry (15m)
        const accessTokenExpiry = new Date();
        accessTokenExpiry.setMinutes(accessTokenExpiry.getMinutes() + 15);

        res.json({
            success: true,
            data: {
                accessToken,
                expiresAt: accessTokenExpiry.toISOString()
            }
        });
    } catch (error) {
        console.error('Refresh error:', error);
        res.status(500).json({
            success: false,
            message: 'Token refresh failed'
        });
    }
};

// Logout
exports.logout = async (req, res) => {
    try {
        // Get refresh token from cookie
        const refreshToken = req.cookies.refreshToken;

        if (refreshToken) {
            // Delete from database
            await db.delete(refreshTokens)
                .where(eq(refreshTokens.token, refreshToken));
        }

        // Clear the cookie
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
};

// Logout all devices
exports.logoutAllDevices = async (req, res) => {
    try {
        let userId = req.user?.id;

        if (req.firebaseUser) {
            const syncedUser = await syncUser(req.firebaseUser);
            userId = syncedUser.id;
        }

        if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

        // Delete all refresh tokens for this user
        await db.delete(refreshTokens)
            .where(eq(refreshTokens.userId, userId));

        // Clear the cookie
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });

        res.json({
            success: true,
            message: 'Logged out from all devices successfully'
        });
    } catch (error) {
        console.error('Logout all devices error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to logout from all devices'
        });
    }
};
// 🚀 HYBRID SYNC: Pass identity metadata to MySQL
exports.sync = async (req, res) => {
    try {
        if (!req.firebaseUser) {
            return res.status(401).json({ success: false, message: 'Firebase identity required' });
        }

        const metadata = metadataSchema.parse(req.body);
        const user = await syncUser(req.firebaseUser, metadata);

        // 🔄 Session Exchange: Issue Backend Tokens

        // 1. Generate Access Token (15m)
        const accessToken = generateAccessToken(user.id, user.platformUid);
        const accessTokenExpiry = new Date();
        accessTokenExpiry.setMinutes(accessTokenExpiry.getMinutes() + 15);

        // 2. Generate Refresh Token (7d)
        const refreshToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // 3. Store Refresh Token
        await db.insert(refreshTokens).values({
            token: refreshToken,
            userId: user.id,
            expiresAt
        });

        // 4. Set Cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/'
        });

        res.json({
            success: true,
            message: 'Identity synchronized successfully',
            data: {
                user,
                accessToken,
                expiresAt: accessTokenExpiry.toISOString()
            }
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, message: 'Invalid metadata', errors: error.errors });
        }
        console.error('Sync failure:', error);
        res.status(500).json({ success: false, message: 'Sync failed' });
    }
};

// Get current user

exports.getMe = async (req, res) => {
    try {
        let userId = req.user?.id;

        // ⚡ HYBRID AUTH: If coming from Firebase, perform dynamic sync
        if (req.firebaseUser) {
            const syncedUser = await syncUser(req.firebaseUser);
            userId = syncedUser.id;
        }

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        // We want user and their wallet
        // Drizzle doesn't do deep nesting automatically like Prisma's include/select
        // So we join

        const result = await db.select({
            user: {
                id: users.id,
                email: users.email,
                username: users.username,
                platformUid: users.platformUid, // Added Public UID
                role: users.role,
                hostStatus: users.hostStatus,
                isBanned: users.isBanned,
                createdAt: users.createdAt,
                registrationCompleted: users.registrationCompleted // Critical for Frontend
            },
            wallet: {
                balance: wallets.balance,
                locked: wallets.locked
            }
        })
            .from(users)
            .leftJoin(wallets, eq(users.id, wallets.userId))
            .where(eq(users.id, userId))
            .limit(1);

        const data = result[0];

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Structure it like Prisma did
        const responseData = {
            ...data.user,
            wallet: data.wallet
        };

        res.json({
            success: true,
            data: responseData
        });
    } catch (error) {
        console.error('GetMe error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user'
        });
    }
};

// Resend verification email
exports.resendVerification = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Check pending registration
        const { getRedisClient } = require('../../config/redis.config');
        const redis = getRedisClient();
        const pendingKey = `pending_registration:${email}`;

        const pendingDataStr = await redis.get(pendingKey);
        if (!pendingDataStr) {
            return res.status(404).json({
                success: false,
                message: 'No pending registration found. Please sign up again.'
            });
        }

        const data = JSON.parse(pendingDataStr);

        // Generate & Send new OTP
        const otp = await otpService.generateOtp(email);
        console.log(`🔐 RE-SENT OTP for ${email}: ${otp}`); // DEV
        await emailService.sendVerificationEmail(email, otp, data.ign);

        res.json({
            success: true,
            message: 'Verification code resent successfully'
        });

    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to resend verification code'
        });
    }
};

// Verify email
exports.verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        // Verify OTP via Redis (throws error if invalid)
        await otpService.verifyOtp(email, otp);

        // Get pending registration from Redis
        const { getRedisClient } = require('../../config/redis.config');
        const redis = getRedisClient();
        const pendingKey = `pending_registration:${email}`;
        const pendingDataStr = await redis.get(pendingKey);

        if (!pendingDataStr) {
            return res.status(400).json({
                success: false,
                message: 'Registration expired or not found. Please sign up again.'
            });
        }

        const data = JSON.parse(pendingDataStr);

        // Check if user was already created (edge case: duplicate verification)
        const existingUser = await db.select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        if (existingUser[0]) {
            // User already exists, just clean up Redis and return success
            await redis.del(pendingKey);
            return res.status(200).json({
                success: true,
                message: 'Email already verified. Please login to continue.'
            });
        }

        // Create user in database with transaction
        let userId;
        try {
            await db.transaction(async (tx) => {
                // CRITICAL: Generate UID with region
                const { uid: platformUid } = await uidService.generatePlatformUid(data.region, tx);

                // Generate user ID
                userId = crypto.randomUUID();

                // Create User
                await tx.insert(users).values({
                    id: userId,
                    platformUid: platformUid,
                    username: data.username,
                    email: data.email,
                    passwordHash: data.passwordHash,
                    legalName: data.legalName,
                    dateOfBirth: new Date(data.dateOfBirth),
                    phone: data.phone,
                    phoneVerified: false, // Not verified yet
                    countryCode: data.country,
                    state: data.state,
                    city: data.city,
                    regionCode: data.region,
                    subRegionCode: data.subRegion,
                    role: data.role || 'PLAYER',
                    hostStatus: 'NOT_VERIFIED',
                    emailVerified: true,
                    isBanned: false,
                    registrationCompleted: true,
                    termsAccepted: data.termsAccepted,
                    passwordUpdatedAt: new Date(),
                    lastLoginAt: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

                // Create Wallet
                const now = new Date();
                await tx.insert(wallets).values({
                    id: crypto.randomUUID(),
                    userId: userId,
                    balance: 0,
                    locked: 0,
                    createdAt: now,
                    updatedAt: now
                });

                // Create Profile with IGN
                // DB constraint handles race condition
                try {
                    await tx.insert(playerProfiles).values({
                        userId: userId,
                        ign: data.ign,
                        realName: data.legalName,
                        dateOfBirth: new Date(data.dateOfBirth),
                        country: data.country,
                        state: data.state,
                        city: data.city,
                        completionPercentage: 60
                    });
                } catch (err) {
                    // PostgreSQL unique violation (23505)
                    if (err.code === '23505') {
                        throw new Error('Gamertag already taken');
                    }
                    throw err;
                }
            });
        } catch (error) {
            // Handle duplicate entry errors
            if (error.message === 'Gamertag already taken') {
                return res.status(409).json({
                    success: false,
                    message: 'Gamertag already taken. Please sign up again with a different gamertag.'
                });
            }
            if (error.code === '23505' || error.message?.includes('duplicate key')) {
                if (error.sqlMessage?.includes('username') || error.message?.includes('username')) {
                    return res.status(409).json({
                        success: false,
                        message: 'Gamertag already taken. Please sign up again with a different username.'
                    });
                }
                if (error.sqlMessage?.includes('email') || error.message?.includes('email')) {
                    return res.status(409).json({
                        success: false,
                        message: 'Email already registered'
                    });
                }
            }
            throw error;
        }

        // Delete pending registration from Redis
        await redis.del(pendingKey);

        // Create Firebase Auth user so signInWithEmailAndPassword works on login
        try {
            await admin.auth().createUser({
                uid: userId,
                email: data.email,
                password: data.plainPassword, // Plain password stored in Redis during signup
                emailVerified: true,
                displayName: data.ign
            });
            console.log(`🔥 Firebase user created for: ${data.email}`);
        } catch (firebaseError) {
            // Non-critical: user can still log in via custom backend if Firebase fails
            console.error('⚠️ Firebase user creation failed (non-critical):', firebaseError.message);
        }

        res.json({
            success: true,
            message: 'Email verified successfully! Please login to continue.'
        });
    } catch (error) {
        console.error('Verify email error:', error.message);
        res.status(400).json({
            success: false,
            message: error.message || 'Email verification failed'
        });
    }
};


// Get user dashboard data (Stats + History)
exports.getDashboard = async (req, res) => {
    try {
        let userId = req.user?.id;

        if (req.firebaseUser) {
            const syncedUser = await syncUser(req.firebaseUser);
            userId = syncedUser.id;
        }

        if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

        const [stats, matches] = await Promise.all([
            statsService.calculateUserStats(userId),
            statsService.getRecentMatches(userId)
        ]);

        res.json({
            success: true,
            data: {
                ...stats,
                recentMatches: matches
            }
        });
    } catch (error) {
        console.error('Get dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data'
        });
    }
};

// Get user notifications
exports.getNotifications = async (req, res) => {
    try {
        const notifications = await statsService.getNotifications(req.user.id);
        res.json({
            success: true,
            data: notifications
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications'
        });
    }
};

// Update user profile
exports.updateProfile = async (req, res) => {
    try {
        const {
            bio, avatarUrl, ign,
            country, state, city,
            phone, phoneVisibility,
            discordId, discordVisibility,
            profileVisibility,
            username // Only if allowed to change
        } = req.body;

        const userId = req.user.id;

        // Validation
        if (bio && bio.length > 500) {
            return res.status(400).json({ success: false, message: 'Bio max 500 chars' });
        }

        // 1. Update Users Table
        const userUpdates = {};
        if (bio !== undefined) userUpdates.bio = bio;
        if (avatarUrl !== undefined) userUpdates.avatarUrl = avatarUrl;
        if (phone !== undefined) userUpdates.phone = phone;
        if (phoneVisibility !== undefined) userUpdates.phoneVisibility = phoneVisibility;
        if (country !== undefined) userUpdates.countryCode = country; // Map to countryCode
        if (state !== undefined) userUpdates.state = state;
        if (city !== undefined) userUpdates.city = city;

        if (Object.keys(userUpdates).length > 0) {
            await db.update(users)
                .set(userUpdates)
                .where(eq(users.id, userId));
        }

        // 2. Update PlayerProfiles Table
        const profileUpdates = {};
        if (ign !== undefined) profileUpdates.ign = ign;
        if (bio !== undefined) profileUpdates.bio = bio; // Sync
        if (avatarUrl !== undefined) profileUpdates.avatarUrl = avatarUrl; // Sync
        if (country !== undefined) profileUpdates.country = country;
        if (state !== undefined) profileUpdates.state = state;
        if (city !== undefined) profileUpdates.city = city;
        if (discordId !== undefined) profileUpdates.discordId = discordId;
        if (discordVisibility !== undefined) profileUpdates.discordVisibility = discordVisibility;
        if (profileVisibility !== undefined) profileUpdates.profileVisibility = profileVisibility;

        if (Object.keys(profileUpdates).length > 0) {
            // Check if profile exists
            const existingProfile = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId)).limit(1);

            if (existingProfile.length > 0) {
                await db.update(playerProfiles)
                    .set(profileUpdates)
                    .where(eq(playerProfiles.userId, userId));
            } else {
                // Create if missing (Recovery)
                await db.insert(playerProfiles).values({
                    userId,
                    ...profileUpdates
                });
            }
        }

        // Return updated user data
        const updatedUserRaw = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        const updatedProfileRaw = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId)).limit(1);

        const updatedUser = updatedUserRaw[0];
        const updatedProfile = updatedProfileRaw[0] || {};

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                ...updatedUser,
                profile: updatedProfile // Return extended profile
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        // Generic response
        const genericResponse = {
            success: true,
            message: 'If an account exists with this email, a verification code has been sent.'
        };

        const result = await db.select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        const user = result[0];

        // Fail silently if user not found (Enumeration Protection)
        if (!user) {
            // Fake delay to mimic processing time? Optional.
            return res.json(genericResponse);
        }

        try {
            // Generate OTP with scope 'reset'
            const otp = await otpService.generateOtp(user.email, 'reset');
            await emailService.sendPasswordResetEmail(user.email, otp, user.username);
        } catch (err) {
            console.error('Forgot Password Dispatch Error:', err);
            // If checking rate limit error, maybe return 429?
            // "Please wait before requesting another code." comes from service.
            if (err.message.includes('wait')) {
                return res.status(429).json({ success: false, message: err.message });
            }
            // Otherwise stick to generic success to avoid leaking faults
        }

        res.json(genericResponse);

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'An unexpected error occurred.'
        });
    }
};

// Check availability (Real-time validation)
exports.checkAvailability = async (req, res) => {
    try {
        const { username, email } = req.body;

        const result = {
            usernameAvailable: true,
            emailAvailable: true
        };

        if (username) {
            const user = await db.select({ id: users.id })
                .from(users)
                .where(eq(users.username, username))
                .limit(1);
            if (user.length > 0) result.usernameAvailable = false;
        }

        if (email) {
            const user = await db.select({ id: users.id })
                .from(users)
                .where(eq(users.email, email))
                .limit(1);
            if (user.length > 0) result.emailAvailable = false;
        }

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Check availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check availability'
        });
    }
};

// Reset Password
exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
        }

        // Verify OTP (Scope: Reset)
        try {
            await otpService.verifyOtp(email, otp, 'reset');
        } catch (err) {
            return res.status(400).json({ success: false, message: err.message });
        }

        // Check user
        const result = await db.select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        const user = result[0];
        if (!user) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update Password
        await db.update(users)
            .set({ passwordHash: hashedPassword })
            .where(eq(users.id, user.id));

        // Invalidate all sessions (Delete refresh tokens)
        await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.id));

        // Clear cookie if present
        res.clearCookie('refreshToken');

        res.json({
            success: true,
            message: 'Password reset successfully. Please login with your new password.'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password'
        });
    }
};

// Trigger custom branded verification email
exports.triggerVerificationEmail = async (req, res) => {
    try {
        const { email, username } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email required' });
        }

        const { admin } = require('../../config/firebase.config');

        // 🚨 Generate the secure verification link via Firebase Admin SDK
        // This link is hosted by Firebase (e-sports-tournament-ba4c6.firebaseapp.com/__/auth/action)
        // By using the Admin SDK, we get the link but WE choose how to deliver it.
        const verificationLink = await admin.auth().generateEmailVerificationLink(email);

        // 📧 Deliver via our custom branded SMTP
        await emailService.sendCustomVerificationEmail(email, verificationLink, username || 'Titan Warrior');

        res.json({
            success: true,
            message: 'Custom verification link dispatched'
        });
    } catch (error) {
        console.error('Trigger verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to dispatch verification link'
        });
    }
};

// Trigger branded password reset email with CUSTOM LINK
exports.triggerPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        // 1. Verify user exists
        const userResult = await db.select({ id: users.id, username: users.username })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        if (!userResult[0]) {
            console.log("Password reset requested for non-existent email: " + email);
            return res.json({ success: true, message: 'Password reset link sent' });
        }

        const username = userResult[0].username;

        // 2. Generate Standard Firebase Link
        const firebaseLink = await admin.auth().generatePasswordResetLink(email);

        // 3. Extract oobCode
        const urlObj = new URL(firebaseLink);
        const oobCode = urlObj.searchParams.get('oobCode');

        if (!oobCode) {
            throw new Error('Failed to extract oobCode from Firebase link');
        }

        // 4. Construct CUSTOM Frontend Link
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const customLink = `${frontendUrl}/auth?mode=resetPassword&oobCode=${oobCode}`;

        // 5. Send via Custom Email Service
        await emailService.sendPasswordResetEmail(email, customLink, username);

        res.json({ success: true, message: 'Password reset link sent' });

    } catch (error) {
        console.error('Trigger Password Reset Error:', error);
        res.status(500).json({ success: false, message: 'Failed to send reset link' });
    }
};

// Helper: Generate Username Suggestions

const generateSuggestions = (baseTag) => {
    const suggestions = [];
    const randomSuffix = () => Math.floor(Math.random() * 1000);
    suggestions.push(`${baseTag}${randomSuffix()}`);
    suggestions.push(`${baseTag}_${randomSuffix()}`);
    suggestions.push(`${baseTag}XP`);
    return suggestions;
};

// Deactivate Account (Soft Freeze)
exports.deactivateAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        const { password } = req.body;

        if (!password) return res.status(400).json({ success: false, message: 'Password required' });

        // Verify password
        const userRaw = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1);
        if (!userRaw[0] || !await bcrypt.compare(password, userRaw[0].passwordHash)) {
            return res.status(401).json({ success: false, message: 'Incorrect password' });
        }

        // Freeze Logic
        await db.transaction(async (tx) => {
            // 1. Set Deactivated At
            await tx.update(users)
                .set({ deactivatedAt: new Date() })
                .where(eq(users.id, userId));

            // 2. Freeze Wallet
            await tx.update(wallets)
                .set({ status: 'FROZEN' })
                .where(eq(wallets.userId, userId));

            // 3. Revoke all sessions
            await tx.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
        });

        // 4. Logout user
        res.clearCookie('refreshToken', { path: '/' });

        res.json({ success: true, message: 'Account deactivated. Login to reactivate.' });

    } catch (error) {
        console.error('Deactivate error:', error);
        res.status(500).json({ success: false, message: 'Failed to deactivate' });
    }
};

// Delete Account (Hard Anonymization)
exports.deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        const { password, confirmation } = req.body;

        if (confirmation !== 'DELETE PERMANENTLY') {
            return res.status(400).json({ success: false, message: 'Invalid confirmation text' });
        }

        // Verify password
        const userRaw = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1);
        if (!userRaw[0] || !await bcrypt.compare(password, userRaw[0].passwordHash)) {
            return res.status(401).json({ success: false, message: 'Incorrect password' });
        }

        // Financial Check
        const wallet = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
        if (wallet[0]) {
            const balance = parseFloat(wallet[0].balance) || 0;
            const locked = parseFloat(wallet[0].locked) || 0;

            if (balance > 0 || locked > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete account with existing funds. Please withdraw first.'
                });
            }
        }

        // Anonymization Logic
        await db.transaction(async (tx) => {
            const deletedId = `deleted_${crypto.randomUUID()}`;

            // 1. Anonymize User
            await tx.update(users).set({
                email: `${deletedId}@deleted.titanesports.in`,
                username: deletedId,
                legalName: 'Deleted User',
                phone: null,
                phoneVerified: false,
                bio: null,
                avatarUrl: null,
                isBanned: true, // Prevent login
                deactivatedAt: new Date()
            }).where(eq(users.id, userId));

            // 2. Anonymize Profile
            await tx.update(playerProfiles).set({
                ign: `Deleted User`,
                bio: null,
                avatarUrl: null
            }).where(eq(playerProfiles.userId, userId));

            // 3. Revoke all sessions
            await tx.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
        });

        res.clearCookie('refreshToken', { path: '/' });
        res.json({ success: true, message: 'Account permanently deleted.' });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, message: 'Delete failed' });
    }
};

// Get Session List
exports.getActiveSessions = async (req, res) => {
    try {
        const userId = req.user.id;
        const sessions = await db.select({
            id: refreshTokens.id,
            userAgent: refreshTokens.userAgent,
            ipAddress: refreshTokens.ipAddress,
            createdAt: refreshTokens.createdAt,
            expiresAt: refreshTokens.expiresAt
        }).from(refreshTokens).where(eq(refreshTokens.userId, userId));

        res.json({ success: true, sessions });
    } catch (error) {
        console.error('Get Sessions error:', error);
        res.status(500).json({ success: false, message: 'Failed to get sessions' });
    }
};

// Revoke Specific Session
exports.revokeSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.params;

        // Security: Ensure owned by user
        await db.delete(refreshTokens)
            .where(and(
                eq(refreshTokens.id, sessionId),
                eq(refreshTokens.userId, userId)
            ));

        res.json({ success: true, message: 'Session revoked' });
    } catch (error) {
        console.error('Revoke Session error:', error);
        res.status(500).json({ success: false, message: 'Failed to revoke session' });
    }
};

// Change Username (Limited 1 time)
exports.changeUsername = async (req, res) => {
    try {
        const userId = req.user.id;
        const { newUsername } = req.body;

        if (!newUsername || newUsername.length < 3) {
            return res.status(400).json({ success: false, message: 'Invalid username' });
        }

        const user = await db.select({ changeCount: users.usernameChangeCount }).from(users).where(eq(users.id, userId)).limit(1);

        if (user[0].changeCount >= 1) {
            return res.status(403).json({ success: false, message: 'You have already changed your username once.' });
        }

        // Check availability
        const exists = await db.select().from(users).where(eq(users.username, newUsername)).limit(1);
        if (exists[0]) {
            return res.status(400).json({ success: false, message: 'Username taken' });
        }

        const { sql } = require('drizzle-orm');
        await db.update(users)
            .set({
                username: newUsername,
                usernameChangeCount: sql`${users.usernameChangeCount} + 1`
            })
            .where(eq(users.id, userId));

        res.json({ success: true, message: 'Username updated' });

    } catch (error) {
        console.error('Change username error:', error);
        res.status(500).json({ success: false, message: 'Failed to update username' });
    }
};

// Change Email - Step 1: Init (Send OTP)
exports.initChangeEmail = async (req, res) => {
    try {
        const { newEmail } = req.body;
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            return res.status(400).json({ success: false, message: 'Invalid email format' });
        }

        // Check if taken
        const exists = await db.select().from(users).where(eq(users.email, newEmail)).limit(1);
        if (exists[0]) {
            return res.status(400).json({ success: false, message: 'Email already used by another account' });
        }

        // Generate OTP
        const otp = await otpService.generateOtp(newEmail);
        console.log(`📧 Change Email OTP for ${newEmail}: ${otp}`);

        // In real prod, use a specific template. reusing verification email for now.
        await emailService.sendVerificationEmail(newEmail, otp, 'User');

        res.json({ success: true, message: 'Verification code sent to new email' });
    } catch (error) {
        console.error('Init Change Email error:', error);
        res.status(500).json({ success: false, message: 'Failed to send code' });
    }
};

// Change Email - Step 2: Verify & Update
exports.verifyChangeEmail = async (req, res) => {
    try {
        const userId = req.user.id;
        const { newEmail, otp, password } = req.body;

        // Verify password first (Critical Security)
        const userRaw = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1);
        if (!await bcrypt.compare(password, userRaw[0].passwordHash)) {
            return res.status(401).json({ success: false, message: 'Incorrect password' });
        }

        // Verify OTP
        const isValid = await otpService.verifyOtp(newEmail, otp);
        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Invalid or expired code' });
        }

        // Update Email & Revoke other sessions
        const { ne } = require('drizzle-orm');
        const currentToken = req.cookies.refreshToken;

        await db.transaction(async (tx) => {
            // Update Email
            await tx.update(users)
                .set({ email: newEmail, emailVerified: true })
                .where(eq(users.id, userId));

            // Revoke ALL OTHER sessions
            if (currentToken) {
                await tx.delete(refreshTokens)
                    .where(and(
                        eq(refreshTokens.userId, userId),
                        ne(refreshTokens.token, currentToken) // Keep current session alive
                    ));
            } else {
                // If no cookie (weird), revoke all just in case
                await tx.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
            }
        });

        res.json({ success: true, message: 'Email updated successfully. Other sessions revoked.' });

    } catch (error) {
        console.error('Verify Change Email error:', error);
        res.status(500).json({ success: false, message: 'Failed to update email' });
    }
};

