/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { games } = require('../../db/schema');
const { eq, asc } = require('drizzle-orm');

// Get all active games
exports.getAllGames = async (req, res) => {
    try {
        const result = await db.select()
            .from(games)
            .where(eq(games.isActive, true))
            .orderBy(asc(games.name));

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Get all games error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch games'
        });
    }
};

// Get single game by slug
exports.getGameBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const result = await db.select()
            .from(games)
            .where(eq(games.slug, slug))
            .limit(1);

        if (!result.length) {
            return res.status(404).json({
                success: false,
                message: 'Game not found'
            });
        }

        res.json({
            success: true,
            data: result[0]
        });
    } catch (error) {
        console.error('Get game by slug error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch game'
        });
    }
};
