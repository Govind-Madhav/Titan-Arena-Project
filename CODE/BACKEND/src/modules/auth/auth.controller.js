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

// Validation schemas
const signupSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    legalName: z.string().min(2, 'Legal Name is required'),
    dateOfBirth: z.string().refine((val) => {
        const date = new Date(val);
        const age = new Date().getFullYear() - date.getFullYear();
        return age >= 13; // Min age check (e.g. 13+)
    }, 'You must be at least 13 years old'),
    phone: z.string().min(10, 'Valid phone number required'),
    country: z.string().min(2, 'Country is required'),
    state: z.string().min(2, 'State is required'),
    city: z.string().optional(),
    username: z.string().min(3, 'Username must be at least 3 characters'), // Mandatory Gamertag/Username
    termsAccepted: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
    role: z.enum(['PLAYER', 'ADMIN', 'SUPERADMIN']).optional().default('PLAYER')
});

const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
});

// Generate tokens
const generateAccessToken = (userId) => {
    return jwt.sign(
        { userId, type: 'access' },
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

        // Hash password before storing
        const passwordHash = await bcrypt.hash(data.password, 12);

        // Store pending registration in Redis (24 hour TTL)
        const pendingData = {
            email: data.email,
            passwordHash: passwordHash,
            username: data.username,
            legalName: data.legalName,
            dateOfBirth: data.dateOfBirth,
            phone: data.phone,
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
            await emailService.sendVerificationEmail(data.email, otp, data.username);
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

        // 4. Token & Session
        const tokenPayload = {
            id: user.id,
            uid: user.id, // Legacy
            username: user.username,
            role: user.isAdmin ? (user.role === 'SUPERADMIN' ? 'SUPERADMIN' : 'ADMIN') : 'PLAYER', // Logic map
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
                    platformUid: user.playerCode, // Legacy Mapping
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

        // Verify refresh token
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token'
            });
        }

        // Check if token exists in DB
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

        // Generate new access token
        const accessToken = generateAccessToken(decoded.userId);

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
        const userId = req.user.id;

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

// Get current user
exports.getMe = async (req, res) => {
    try {
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
                createdAt: users.createdAt
            },
            wallet: {
                balance: wallets.balance,
                locked: wallets.locked
            }
        })
            .from(users)
            .leftJoin(wallets, eq(users.id, wallets.userId))
            .where(eq(users.id, req.user.id))
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
                // Generate UID (Atomic)
                const { uid: platformUid, regionCode } = await uidService.generatePlatformUid(data.country, tx);

                // Generate user ID
                userId = crypto.randomUUID();

                // Create User
                await tx.insert(users).values({
                    id: userId,
                    platformUid: platformUid,
                    username: data.username,
                    email: data.email,
                    passwordHash: data.passwordHash, // Already hashed
                    legalName: data.legalName,
                    dateOfBirth: new Date(data.dateOfBirth),
                    phone: data.phone,
                    countryCode: uidService.getCallingCode(data.country).toString(),
                    state: data.state,
                    city: data.city,
                    regionCode: regionCode,
                    role: data.role || 'PLAYER',
                    hostStatus: 'NOT_VERIFIED',
                    emailVerified: true, // Verified immediately
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

                // Create Profile
                await tx.insert(playerProfiles).values({
                    userId: userId,
                    ign: data.username,
                    realName: data.legalName,
                    dateOfBirth: new Date(data.dateOfBirth),
                    country: data.country,
                    state: data.state,
                    city: data.city,
                    completionPercentage: 10
                });
            });
        } catch (error) {
            // Handle duplicate entry errors
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
        const [stats, matches] = await Promise.all([
            statsService.calculateUserStats(req.user.id),
            statsService.getRecentMatches(req.user.id)
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

// Helper: Generate Username Suggestions
const generateSuggestions = (baseTag) => {
    const suggestions = [];
    const randomSuffix = () => Math.floor(Math.random() * 1000);
    suggestions.push(`${baseTag}${randomSuffix()}`);
    suggestions.push(`${baseTag}_${randomSuffix()}`);
    suggestions.push(`${baseTag}XP`);
    return suggestions;
};
