const prisma = require('../../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { z } = require('zod');
const emailService = require('../../utils/email.service');

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
        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: data.email },
                    { username: data.username }
                ]
            }
        });

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
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: data.email,
                    password: hashedPassword,
                    username: data.username,
                    role: data.role,
                    emailVerified: false,
                    verificationToken,
                    verificationExpiry
                }
            });

            // Create wallet for user
            await tx.wallet.create({
                data: {
                    userId: user.id,
                    balance: 0,
                    locked: 0
                }
            });

            return user;
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

        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: result.id,
                expiresAt
            }
        });

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
                refreshToken
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
        res.status(500).json({
            success: false,
            message: 'Registration failed'
        });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const data = loginSchema.parse(req.body);

        const user = await prisma.user.findUnique({
            where: { email: data.email }
        });

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

        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt
            }
        });

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                    hostStatus: user.hostStatus
                },
                accessToken,
                refreshToken
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
        const { refreshToken } = req.body;

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
        const storedToken = await prisma.refreshToken.findUnique({
            where: { token: refreshToken }
        });

        if (!storedToken || storedToken.expiresAt < new Date()) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token expired or revoked'
            });
        }

        // Generate new access token
        const accessToken = generateAccessToken(decoded.userId);

        res.json({
            success: true,
            data: { accessToken }
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
        const { refreshToken } = req.body;

        if (refreshToken) {
            await prisma.refreshToken.deleteMany({
                where: { token: refreshToken }
            });
        }

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

// Get current user
exports.getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                hostStatus: true,
                isBanned: true,
                createdAt: true,
                wallet: {
                    select: {
                        balance: true,
                        locked: true
                    }
                }
            }
        });

        res.json({
            success: true,
            data: user
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

        const user = await prisma.user.findFirst({
            where: {
                verificationToken: token,
                verificationExpiry: {
                    gt: new Date()
                }
            }
        });

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
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                verificationToken: null,
                verificationExpiry: null
            }
        });

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

        const user = await prisma.user.findUnique({
            where: { email }
        });

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

        await prisma.user.update({
            where: { id: user.id },
            data: {
                verificationToken,
                verificationExpiry
            }
        });

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
