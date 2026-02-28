/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { users, playerProfiles, mmrRatings } = require('../../db/schema');
const { desc, eq, sql } = require('drizzle-orm');
const statsService = require('../../services/stats.service');

// Get My Stats
exports.getMyStats = async (req, res) => {
    try {
        const stats = await statsService.calculateUserStats(req.user.id);
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Get my stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
};

// Get Leaderboard (Global)
exports.getLeaderboard = async (req, res) => {
    try {
        // Joining users + playerProfiles + mmrRatings
        const leaderboard = await db.select({
            id: users.id,
            username: sql`COALESCE(${playerProfiles.ign}, ${users.username})`, // Prefer IGN
            avatarUrl: playerProfiles.avatarUrl,
            country: playerProfiles.country,
            joinedAt: users.createdAt,
            // True MMR Statistics
            points: sql`COALESCE(${mmrRatings.rating}, 1000)`,
            gamesPlayed: sql`COALESCE(${mmrRatings.gamesPlayed}, 0)`,
            wins: sql`COALESCE(${mmrRatings.wins}, 0)`,
        })
            .from(users)
            .leftJoin(playerProfiles, eq(users.id, playerProfiles.userId))
            .leftJoin(mmrRatings, eq(users.id, mmrRatings.userId))
            .where(
                req.query.country
                    ? eq(playerProfiles.country, req.query.country)
                    : undefined
            )
            .orderBy(desc(sql`COALESCE(${mmrRatings.rating}, 1000)`))
            .limit(50);

        // Calculate genuine win rate
        const enriched = leaderboard.map((u, i) => {
            const matches = Number(u.gamesPlayed);
            const won = Number(u.wins);
            const authenticWinRate = matches > 0 ? ((won / matches) * 100).toFixed(1) : 0;

            return {
                ...u,
                rank: i + 1,
                winRate: authenticWinRate
            };
        });

        res.json({ success: true, data: enriched });
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch leaderboard' });
    }
};
