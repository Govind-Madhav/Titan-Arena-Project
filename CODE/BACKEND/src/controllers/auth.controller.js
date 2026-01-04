/**
 * Auth Controller - Updated for Region-Based UID + Gamertag System
 */

const { db } = require('../db');
const { users, playerProfiles } = require('../db/schema');
const { eq, sql } = require('drizzle-orm');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const crypto = require('crypto');
const { getRegionForCountry, validateSubRegion } = require('../config/regions.config');
const uidService = require('../services/uid.service');

// Validation schemas
const registerSchema = z.object({
    ign: z.string().min(3, 'Gamertag must be at least 3 characters').max(20, 'Gamertag must be at most 20 characters').regex(/^[a-zA-Z0-9_]+$/, 'Gamertag can only contain letters, numbers, and underscores'),
    username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    legalName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phone: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Enter phone number with country code (e.g. +919876543210)'), // E.164 format
    region: z.number().int().min(1).max(6, 'Region must be between 1-6'), // User must select
    subRegion: z.string().optional(), // Optional sub-region
    country: z.string().length(2, 'Country code must be 2 characters (ISO)'),
    state: z.string().min(1, 'State is required'),
    city: z.string().optional()
});

const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
});

// Generate JWT token
const generateToken = (userId, platformUid) => {
    return jwt.sign(
        { userId, platformUid },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// Helper: Check if error is duplicate key
const isDuplicateKeyError = (error) => {
    return error.code === 'ER_DUP_ENTRY' || error.code === '23505';
};

// Check IGN availability
exports.checkIgnAvailability = async (req, res) => {
    try {
        const { ign } = req.body;

        if (!ign || ign.length < 3) {
            return res.json({ available: null });
        }

        // Normalize IGN (trim, lowercase for comparison)
        const normalizedIgn = ign.trim().toLowerCase();

        const existing = await db.select()
            .from(playerProfiles)
            .where(sql`LOWER(${playerProfiles.ign}) = ${normalizedIgn}`)
            .limit(1);

        res.json({ available: existing.length === 0 });
    } catch (error) {
        console.error('Check IGN error:', error);
        res.status(500).json({ available: null });
    }
};

// Register new user
exports.register = async (req, res) => {
    try {
        const validatedData = registerSchema.parse(req.body);

        // Normalize IGN (trim, store as-is for display)
        const ign = validatedData.ign.trim();

        // Validate sub-region belongs to region
        if (validatedData.subRegion && !validateSubRegion(validatedData.region, validatedData.subRegion)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid sub-region for selected region'
            });
        }

        // Sub-region from user choice only (NO auto-assignment)
        const subRegion = validatedData.subRegion || null;

        // Check if email or username already exists
        const existingUser = await db.select().from(users).where(
            sql`${users.email} = ${validatedData.email} OR ${users.username} = ${validatedData.username}`
        );

        if (existingUser.length > 0) {
            const isEmailTaken = existingUser.some(u => u.email === validatedData.email);
            return res.status(400).json({
                success: false,
                message: isEmailTaken ? 'User with this email already exists' : 'Username is already taken'
            });
        }

        const hashedPassword = await bcrypt.hash(validatedData.password, 12);

        try {
            // Use transaction for user creation
            const result = await db.transaction(async (tx) => {
                const userId = crypto.randomUUID();

                // CRITICAL: Generate UID with region
                const { uid: platformUid } = await uidService.generatePlatformUid(validatedData.region, tx);

                // Create user
                await tx.insert(users).values({
                    id: userId,
                    platformUid,
                    username: validatedData.username,
                    email: validatedData.email,
                    passwordHash: hashedPassword,
                    legalName: validatedData.legalName,
                    phone: validatedData.phone,
                    phoneVerified: false, // Not verified yet
                    countryCode: validatedData.country,
                    state: validatedData.state,
                    city: validatedData.city || null,
                    regionCode: validatedData.region,
                    subRegionCode: subRegion,
                    role: 'PLAYER',
                    dateOfBirth: null, // Must be collected separately, never fake
                    registrationCompleted: true,
                    termsAccepted: true
                });

                // Create player profile with IGN
                // Let DB constraint handle race condition
                await tx.insert(playerProfiles).values({
                    userId,
                    ign: ign, // Normalized IGN
                    realName: validatedData.legalName,
                    country: validatedData.country,
                    state: validatedData.state,
                    city: validatedData.city || '',
                    completionPercentage: 60
                });

                return { userId, platformUid };
            });

            // Fetch created user
            const [user] = await db.select({
                id: users.id,
                platformUid: users.platformUid,
                username: users.username,
                email: users.email,
                role: users.role,
                legalName: users.legalName,
            }).from(users).where(eq(users.id, result.userId));

            // Fetch IGN
            const [profile] = await db.select({
                ign: playerProfiles.ign
            }).from(playerProfiles).where(eq(playerProfiles.userId, result.userId));

            // Generate token with platformUid
            const token = generateToken(user.id, user.platformUid);

            res.status(201).json({
                success: true,
                message: 'Registration successful',
                data: {
                    user: {
                        ...user,
                        ign: profile.ign
                    },
                    accessToken: token,
                    refreshToken: token
                }
            });

        } catch (error) {
            // Handle IGN race condition
            if (isDuplicateKeyError(error) && error.message.includes('unique_ign')) {
                return res.status(409).json({
                    success: false,
                    message: 'Gamertag already taken'
                });
            }
            throw error;
        }

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.errors
            });
        }
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed'
        });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const validatedData = loginSchema.parse(req.body);

        // Find user
        const [user] = await db.select().from(users).where(eq(users.email, validatedData.email));

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(validatedData.password, user.passwordHash);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Get IGN
        const [profile] = await db.select({
            ign: playerProfiles.ign
        }).from(playerProfiles).where(eq(playerProfiles.userId, user.id));

        // Data integrity check
        if (!profile?.ign) {
            return res.status(500).json({
                success: false,
                message: 'Profile corrupted. Contact support.'
            });
        }

        // Generate token with platformUid
        const token = generateToken(user.id, user.platformUid);

        // Return user without password
        const { passwordHash, ...userWithoutPassword } = user;

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    ...userWithoutPassword,
                    ign: profile.ign
                },
                accessToken: token,
                refreshToken: token
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
