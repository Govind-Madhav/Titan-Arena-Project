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
// Signup
exports.signup = async (req, res) => {
    try {
        const data = signupSchema.parse(req.body);

        // Check existing user
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

        // Hash password
        const hashedPassword = await bcrypt.hash(data.password, 12);

        // Create user with wallet in transaction
        const result = await db.transaction(async (tx) => {
            // Generate Platform UID (Atomic)
            const { uid, regionCode } = await uidService.generatePlatformUid(data.country, tx);

            // Generate Public Username
            const username = await uidService.generatePublicUsername();

            const userId = crypto.randomUUID();
            const now = new Date();

            await tx.insert(users).values({
                id: userId,
                platformUid: uid,
                username: username,
                email: data.email,
                passwordHash: hashedPassword,

                legalName: data.legalName,
                dateOfBirth: new Date(data.dateOfBirth),
                phone: data.phone,
                countryCode: data.country, // Assuming frontend still sends "country" but value is code, or we map it. For now, map field.
                state: data.state,
                city: data.city,
                regionCode: regionCode,

                role: data.role,
                hostStatus: 'NOT_VERIFIED',
                emailVerified: false,
                isBanned: false,

                registrationCompleted: false,
                termsAccepted: data.termsAccepted,

                createdAt: now,
                updatedAt: now
            });

            await tx.insert(wallets).values({
                userId: userId,
                balance: 0,
                locked: 0
            });

            return {
                id: userId,
                email: data.email,
                username: username
            };
        });

        // Generate & Send OTP
        try {
            const otp = await otpService.generateOtp(result.email);
            await emailService.sendVerificationEmail(result.email, otp, result.username);
            // Note: Updated emailService to accept OTP instead of token if needed, 
            // or we just reuse the message but send OTP as the 'token' arg if text allows.
            // Assuming emailService.sendVerificationEmail(email, code, name).
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
            // We might want to rollback or just let them resend?
            // "User created but email failed" -> They can use "Resend OTP".
            // So we return success with warning or just success.
        }

        res.status(201).json({
            success: true,
            message: 'Verification code sent to email. Please verify to complete registration.',
            // No token issued
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
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        // Verify OTP via Redis
        // Throws error if invalid or max attempts reached
        await otpService.verifyOtp(email, otp);

        const result = await db.select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        const user = result[0];

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.emailVerified) {
            // Already verified, just log them in? 
            // Or simple message. Let's issue token if they verify again? 
            // Usually if already verified, we shouldn't ask for OTP again unless it's a login flow.
            // But strict flow says: Verify -> Token.
            // If they are verified, maybe they are logging in?
            // Let's allow token issuance if they passed OTP check successfully.
        }

        // Update user as verified
        if (!user.emailVerified) {
            await db.update(users)
                .set({
                    emailVerified: true,
                    registrationCompleted: true
                    // Legacy fields removed from schema
                })
                .where(eq(users.id, user.id));
        }

        // Generate tokens (Login success)
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

        // Fetch updated user stats for response if needed, or just basic info
        const updatedUser = {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            emailVerified: true,
            hostStatus: user.hostStatus
        };

        res.json({
            success: true,
            message: 'Email verified successfully! Login complete.',
            data: {
                user: updatedUser,
                accessToken,
                expiresAt: accessTokenExpiry.toISOString()
            }
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

        // Generate & Send OTP
        const otp = await otpService.generateOtp(user.email);
        await emailService.sendVerificationEmail(user.email, otp, user.username);

        res.json({
            success: true,
            message: 'Verification email sent successfully'
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
