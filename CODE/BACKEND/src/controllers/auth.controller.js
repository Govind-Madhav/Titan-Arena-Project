/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../db');
const { users, wallets } = require('../db/schema');
const { eq, sql } = require('drizzle-orm');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const crypto = require('crypto');

// Validation schemas
// Validation schemas
const registerSchema = z.object({
    legalName: z.string().min(2, 'Name must be at least 2 characters'),
    username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    mobile: z.string().optional(),
    role: z.enum(['ADMIN', 'HOST', 'PLAYER']).optional().default('PLAYER'),
    country: z.string().length(2, 'Country code must be 2 characters (ISO)'), // Expecting 'IN', 'US' etc.
    state: z.string().min(1, 'State is required'),
    city: z.string().optional()
});

const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
});

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// Register new user
exports.register = async (req, res) => {
    try {
        const validatedData = registerSchema.parse(req.body);

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

        // Derive Region from Country (Simple mapping for now)
        // In real app, might want a robust mapping. For now default to 'IN' if unknown
        const regionMapping = {
            'IN': 'IN', 'US': 'NA', 'GB': 'EU', 'CA': 'NA', 'AU': 'OC'
        };
        const regionCode = regionMapping[validatedData.country] || 'IN';

        // Create user
        const newUser = {
            platformUid: crypto.randomBytes(10).toString('hex'), // Generate unique Platform ID (20 chars)
            username: validatedData.username,
            email: validatedData.email,
            passwordHash: hashedPassword,
            legalName: validatedData.legalName,
            phone: validatedData.mobile || null,
            countryCode: validatedData.country,
            state: validatedData.state,
            city: validatedData.city || null,
            regionCode: regionCode,
            role: validatedData.role,
            hostStatus: validatedData.role === 'HOST' ? 'PENDING' : 'NOT_VERIFIED',
            dateOfBirth: new Date(), // Using current date as placeholder
            registrationCompleted: true,
            termsAccepted: true
        };

        const [result] = await db.insert(users).values(newUser).$returningId();

        // Fetch created user
        const [user] = await db.select({
            id: users.id,
            username: users.username,
            email: users.email,
            role: users.role,
            legalName: users.legalName,
        }).from(users).where(eq(users.id, result.id));

        // Create wallet for user
        await db.insert(wallets).values({
            userId: result.id,
            balance: 0,
            locked: 0
        });

        // Generate token
        const token = generateToken(user.id);

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                user,
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
        const isPasswordValid = await bcrypt.compare(validatedData.password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate token
        const token = generateToken(user.id);

        // Return user without password
        const { passwordHash, ...userWithoutPassword } = user;

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: userWithoutPassword,
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
