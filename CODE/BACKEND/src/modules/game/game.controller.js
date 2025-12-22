/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { games } = require('../../db/schema');
const { eq } = require('drizzle-orm');

// Get all games
exports.getGames = async (req, res) => {
    try {
        const allGames = await db.select().from(games).where(eq(games.isActive, true));

        res.json({
            success: true,
            data: allGames
        });
    } catch (error) {
        console.error('Get games error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch games'
        });
    }
};

// Get game by slug
exports.getGameBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const result = await db.select().from(games).where(eq(games.slug, slug)).limit(1);
        const game = result[0];

        if (!game) {
            return res.status(404).json({
                success: false,
                message: 'Game not found'
            });
        }

        res.json({
            success: true,
            data: game
        });
    } catch (error) {
        console.error('Get game error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch game'
        });
    }
};