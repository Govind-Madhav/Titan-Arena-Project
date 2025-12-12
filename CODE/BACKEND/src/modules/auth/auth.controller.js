/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { users, wallets, refreshTokens } = require('../../db/schema');
const { eq, or, and, gt } = require('drizzle-orm');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { z } = require('zod');
const emailService = require('../../utils/email.service');
const statsService = require('../../services/stats.service');

// Validation schemas
const signupSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    username: z.string().min(3, 'Username must be at least 3 characters').max(20),
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

        // Check existing user
        const existingUsers = await db.select()
            .from(users)
            .where(or(
                eq(users.email, data.email),
                eq(users.username, data.username)
            ))
            .limit(1);

        const existing = existingUsers[0];

        if (existing) {
            return res.status(400).json({
                success: false,
                message: existing.email === data.email
                    ? 'Email already registered'
                    : 'Username already taken'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(data.password, 12);

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpiry = new Date();
        verificationExpiry.setHours(verificationExpiry.getHours() + 24); // 24 hours

        // Create user with wallet in transaction
        const result = await db.transaction(async (tx) => {
            // Helper to generate IDs manually since we can't rely on RETURNING in all MySQL versions 
            // easily with Drizzle without explicit definitions, though schema has defaultFn.
            // But let's let Drizzle handle the defaultFn UUID execution.
            // Drizzle insert returns an array of result header info in MySQL, not the created object unless using $returningId but generic mysql doesn't support RETURNING.
            // We defined defaultFn in schema, so we should be fine, but we need the ID.
            // Best practice for MySQL with Drizzle: generate ID in code if we need it immediately.

            const userId = crypto.randomUUID();
            const now = new Date();

            await tx.insert(users).values({
                id: userId,
                email: data.email,
                password: hashedPassword,
                username: data.username,
                role: data.role,
                hostStatus: 'NOT_VERIFIED',
                emailVerified: false,
                verificationToken,
                verificationExpiry,
                createdAt: now,
                updatedAt: now
            });

            // We need to fetch the user back or just construct the object
            // Construction is safe here.

            await tx.insert(wallets).values({
                userId: userId,
                balance: 0,
                locked: 0
            });

            return {
                id: userId,
                email: data.email,
                username: data.username,
                role: data.role,
                emailVerified: false,
                hostStatus: 'NOT_VERIFIED'
            };
        });

        // Send verification email
        try {
            await emailService.sendVerificationEmail(result.email, verificationToken, result.username);
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
            // Continue registration even if email fails
        }

        // Generate tokens
        const accessToken = generateAccessToken(result.id);
        const refreshToken = generateRefreshToken(result.id);

        // Store refresh token
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await db.insert(refreshTokens).values({
            token: refreshToken,
            userId: result.id,
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

        res.status(201).json({
            success: true,
            message: 'Registration successful. Please check your email to verify your account.',
            data: {
                user: {
                    id: result.id,
                    email: result.email,
                    username: result.username,
                    role: result.role,
                    emailVerified: result.emailVerified,
                    hostStatus: result.hostStatus
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
        console.error('Signup error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
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
            password: users.password,
            username: users.username,
            role: users.role,
            hostStatus: users.hostStatus,
            isBanned: users.isBanned,
            emailVerified: users.emailVerified
        })
            .from(users)
            .where(eq(users.email, data.email))
            .limit(1);

        const user = result[0];

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        if (user.isBanned) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been banned'
            });
        }

        const isValid = await bcrypt.compare(data.password, user.password);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        // Store refresh token
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

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
                    role: user.role,
                    hostStatus: user.hostStatus,
                    emailVerified: user.emailVerified
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
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Verification token is required'
            });
        }

        const result = await db.select()
            .from(users)
            .where(and(
                eq(users.verificationToken, token),
                gt(users.verificationExpiry, new Date())
            ))
            .limit(1);

        const user = result[0];

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification token'
            });
        }

        if (user.emailVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email already verified'
            });
        }

        // Update user as verified
        await db.update(users)
            .set({
                emailVerified: true,
                verificationToken: null,
                verificationExpiry: null
            })
            .where(eq(users.id, user.id));

        res.json({
            success: true,
            message: 'Email verified successfully! You can now access all features.'
        });
    } catch (error) {
        console.error('Verify email error:', error);
        res.status(500).json({
            success: false,
            message: 'Email verification failed'
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

        const result = await db.select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        const user = result[0];

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.emailVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email already verified'
            });
        }

        // Generate new verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpiry = new Date();
        verificationExpiry.setHours(verificationExpiry.getHours() + 24);

        await db.update(users)
            .set({
                verificationToken,
                verificationExpiry
            })
            .where(eq(users.id, user.id));

        // Send verification email
        await emailService.sendVerificationEmail(user.email, verificationToken, user.username);

        res.json({
            success: true,
            message: 'Verification email sent successfully'
        });
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resend verification email'
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
