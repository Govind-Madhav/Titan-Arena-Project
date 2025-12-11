/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');

const prisma = new PrismaClient();

// Get current user profile
exports.getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                fullName: true,
                email: true,
                mobile: true,
                role: true,
                verified: true,
                imageUrl: true,
                createdAt: true,
                updatedAt: true
            }
        });

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
};

// Update current user profile
exports.updateMe = async (req, res) => {
    try {
        const updateSchema = z.object({
            fullName: z.string().min(2).optional(),
            mobile: z.string().optional(),
            imageUrl: z.string().url().optional()
        });

        const validatedData = updateSchema.parse(req.body);

        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: validatedData,
            select: {
                id: true,
                fullName: true,
                email: true,
                mobile: true,
                role: true,
                verified: true,
                imageUrl: true,
                createdAt: true,
                updatedAt: true
            }
        });

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.errors
            });
        }
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
};

// Get user profile by ID
exports.getProfile = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                imageUrl: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get profile by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
};
