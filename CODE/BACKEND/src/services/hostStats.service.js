/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 */

const { db } = require('../db');
const { tournaments, registrations } = require('../db/schema');
const { eq, sql, inArray, and } = require('drizzle-orm');
const { TOURNAMENT_STATUS } = require('../modules/tournament/tournament.constants');

/**
 * Aggregates statistics for a specific host
 * @param {string} hostId - The ID of the host
 * @returns {Promise<object>} - Aggregated stats
 */
const getHostStats = async (hostId) => {
    try {
        // 1. Fetch all tournaments for the host
        const hostTournaments = await db.select({
            id: tournaments.id,
            status: tournaments.status,
            prizePool: tournaments.prizePool
        })
            .from(tournaments)
            .where(eq(tournaments.hostId, hostId));

        if (hostTournaments.length === 0) {
            return {
                activeTournaments: 0,
                totalPlayers: 0,
                prizePool: 0,
                successRate: "0%"
            };
        }

        const tournamentIds = hostTournaments.map(t => t.id);

        // 2. Calculate Active Tournaments
        const activeCount = hostTournaments.filter(t =>
            [TOURNAMENT_STATUS.REGISTRATION, TOURNAMENT_STATUS.ONGOING].includes(t.status)
        ).length;

        // 3. Calculate Total Prize Pool
        const totalPrizePool = hostTournaments.reduce((sum, t) => sum + Number(t.prizePool || 0), 0);

        // 4. Calculate Unique Players (PRO FIX: count(distinct userId))
        const playerStats = await db.select({
            uniquePlayers: sql`count(distinct ${registrations.userId})`
        })
            .from(registrations)
            .where(
                and(
                    inArray(registrations.tournamentId, tournamentIds),
                    sql`${registrations.status} != 'CANCELLED'`
                )
            );

        // 5. Calculate Success Rate (Ratio of COMPLETED vs CANCELLED/TOTAL)
        const completedCount = hostTournaments.filter(t => t.status === TOURNAMENT_STATUS.COMPLETED).length;
        const successRate = hostTournaments.length > 0
            ? `${Math.round((completedCount / hostTournaments.length) * 100)}%`
            : "0%";

        return {
            activeTournaments: activeCount,
            totalPlayers: Number(playerStats[0]?.uniquePlayers || 0),
            prizePool: totalPrizePool,
            successRate
        };
    } catch (error) {
        console.error('Host Stats Service Error:', error);
        throw new Error('Failed to aggregate host statistics');
    }
};

module.exports = {
    getHostStats
};
