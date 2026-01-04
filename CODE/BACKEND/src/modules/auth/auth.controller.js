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

// Validation schemas
const signupSchema = z.object({
    ign: z.string().min(3, 'Gamertag must be at least 3 characters').max(20, 'Gamertag must be at most 20 characters').regex(/^[a-zA-Z0-9_]+$/, 'Gamertag can only contain letters, numbers, and underscores'),
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    legalName: z.string().min(2, 'Legal Name is required'),
    dateOfBirth: z.string().refine((val) => {
        const date = new Date(val);
        const age = new Date().getFullYear() - date.getFullYear();
        return age >= 13;
    }, 'You must be at least 13 years old'),
    phone: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Enter phone number with country code (e.g. +919876543210)'), // E.164 format
    region: z.number().int().min(1).max(6, 'Region must be between 1-6'), // User must select
    subRegion: z.string().optional(), // Optional sub-region
    country: z.string().min(2, 'Country is required'),
    state: z.string().min(2, 'State is required'),
    city: z.string().optional(),
    username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
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
        res.status(500).json({ available: null });
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
            return res.status(400).json({
                success: false,
                message: 'A verification email has already been sent. Please check your inbox or wait 24 hours to register again.'
            });
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

        // 4. Token & Session
        const tokenPayload = {
            id: user.id,
            uid: user.id, // Legacy
            username: user.username,
            platformUid: user.platformUid,
            role: user.isAdmin ? (user.role === 'SUPERADMIN' ? 'SUPERADMIN' : 'ADMIN') : 'PLAYER',
            isAdmin: user.isAdmin,
            isHost: user.hostProfileStatus === 'ACTIVE',
            playerCode: user.playerCode
        };

        const accessToken = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Generate Refresh Token
        const refreshToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await db.insert(refreshTokens).values({
            token: refreshToken,
            userId: user.id,
            expiresAt
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
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    playerCode: user.playerCode,
                    platformUid: user.platformUid, // ALWAYS use actual platformUid
                    role: tokenPayload.role,
                    isAdmin: user.isAdmin,
                    isHost: tokenPayload.isHost,
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

        // Get user data for new access token
        const userResult = await db.select({
            id: users.id,
            platformUid: users.platformUid
        }).from(users).where(eq(users.id, storedToken.userId)).limit(1);

        const user = userResult[0];
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        // Generate new access token
        const accessToken = generateAccessToken(user.id, user.platformUid);

        // Calculate token expiry
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

        res.json({
            success: true,
            message: 'Identity synchronized successfully',
            data: user
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
                    if (err.code === 'ER_DUP_ENTRY' && err.message?.includes('unique_ign')) {
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
            if (error.code === 'ER_DUP_ENTRY' || error.message?.includes('duplicate key')) {
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

        // Check if there's a pending registration in Redis
        const { getRedisClient } = require('../../config/redis.config');
        const redis = getRedisClient();
        const pendingKey = `pending_registration:${email}`;
        const pendingDataStr = await redis.get(pendingKey);

        if (!pendingDataStr) {
            // Check if user already exists and is verified
            const result = await db.select()
                .from(users)
                .where(eq(users.email, email))
                .limit(1);

            if (result[0]?.emailVerified) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already verified. Please login.'
                });
            }

            return res.status(404).json({
                success: false,
                message: 'No pending registration found. Please sign up first.'
            });
        }

        const data = JSON.parse(pendingDataStr);

        // Generate & Send new OTP
        const otp = await otpService.generateOtp(email);
        await emailService.sendVerificationEmail(email, otp, data.username);

        res.json({
            success: true,
            message: 'Verification code sent successfully'
        });
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to resend verification email'
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
        const { bio, avatarUrl } = req.body;

        // Validation (simple)
        if (bio && bio.length > 500) {
            return res.status(400).json({
                success: false,
                message: 'Bio must be less than 500 characters'
            });
        }

        await db.update(users)
            .set({
                bio: bio || undefined,
                avatarUrl: avatarUrl || undefined
            })
            .where(eq(users.id, req.user.id));

        // Return updated user
        const updatedUserRaw = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
        const updatedUser = updatedUserRaw[0];

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                id: updatedUser.id,
                email: updatedUser.email,
                username: updatedUser.username,
                role: updatedUser.role,
                hostStatus: updatedUser.hostStatus,
                emailVerified: updatedUser.emailVerified,
                bio: updatedUser.bio,
                avatarUrl: updatedUser.avatarUrl,
                createdAt: updatedUser.createdAt
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

// Helper: Generate Username Suggestions
const generateSuggestions = (baseTag) => {
    const suggestions = [];
    const randomSuffix = () => Math.floor(Math.random() * 1000);
    suggestions.push(`${baseTag}${randomSuffix()}`);
    suggestions.push(`${baseTag}_${randomSuffix()}`);
    suggestions.push(`${baseTag}XP`);
    return suggestions;
};
