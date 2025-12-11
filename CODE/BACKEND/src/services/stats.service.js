/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../db');
const { matches, registrations, tournaments, teams, teamMembers, notifications } = require('../db/schema');
const { eq, and, or, sql, count, desc } = require('drizzle-orm');

const calculateUserStats = async (userId) => {
    try {
        // 1. Get all teams the user is part of
        const userTeams = await db.select({ teamId: teamMembers.teamId })
            .from(teamMembers)
            .where(eq(teamMembers.userId, userId));

        const teamIds = userTeams.map(t => t.teamId);

        if (teamIds.length === 0) {
            return {
                tournamentsJoined: 0,
                tournamentsWon: 0,
                matchesWon: 0,
                totalMatches: 0,
                losses: 0,
                winRate: 0,
                points: 0,
                globalRank: 'N/A'
            };
        }

        // 2. Count Tournaments Joined (via Registrations)
        const tournamentsJoinedRes = await db.select({ count: count() })
            .from(registrations)
            .where(
                and(
                    sql`${registrations.teamId} IN ${teamIds}`,
                    eq(registrations.status, 'APPROVED')
                )
            );
        const tournamentsJoined = tournamentsJoinedRes[0]?.count || 0;

        // 3. Count Matches Won and Total Matches
        const matchesParticipatedRes = await db.select({ count: count() })
            .from(matches)
            .where(
                and(
                    eq(matches.status, 'COMPLETED'),
                    or(
                        sql`${matches.teamAId} IN ${teamIds}`,
                        sql`${matches.teamBId} IN ${teamIds}`
                    )
                )
            );
        const totalMatches = matchesParticipatedRes[0]?.count || 0;

        const matchesWonRes = await db.select({ count: count() })
            .from(matches)
            .where(
                and(
                    eq(matches.status, 'COMPLETED'),
                    sql`${matches.winnerId} IN ${teamIds}`
                )
            );
        const matchesWon = matchesWonRes[0]?.count || 0;
        const losses = totalMatches - matchesWon;

        // 4. Calculate Win Rate
        const winRate = totalMatches > 0 ? Math.round((matchesWon / totalMatches) * 100) : 0;

        // 5. Mock Tournament Wins for now
        const tournamentsWon = 0;

        // 6. Calculate Points
        const points = (matchesWon * 100) + (tournamentsWon * 500);

        // 7. Get Global Rank
        const globalRank = await calculateRank(points);

        return {
            tournamentsJoined,
            tournamentsWon,
            matchesWon,
            totalMatches,
            losses,
            winRate,
            points,
            globalRank
        };

    } catch (error) {
        console.error('Error calculating stats:', error);
        throw error;
    }
};

const getRecentMatches = async (userId, limit = 5) => {
    // Get user teams
    const userTeams = await db.select({ teamId: teamMembers.teamId })
        .from(teamMembers)
        .where(eq(teamMembers.userId, userId));

    const teamIds = userTeams.map(t => t.teamId);

    if (teamIds.length === 0) return [];

    // Fetch matches
    const recentMatches = await db.select({
        id: matches.id,
        tournamentName: tournaments.name,
        round: matches.round,
        scoreA: matches.scoreA,
        scoreB: matches.scoreB,
        winnerId: matches.winnerId,
        startTime: matches.startTime,
        teamAName: sql`(SELECT name FROM ${teams} WHERE ${teams.id} = ${matches.teamAId})`,
        teamBName: sql`(SELECT name FROM ${teams} WHERE ${teams.id} = ${matches.teamBId})`,
        teamAId: matches.teamAId,
        teamBId: matches.teamBId,
    })
        .from(matches)
        .innerJoin(tournaments, eq(matches.tournamentId, tournaments.id))
        .where(
            or(
                sql`${matches.teamAId} IN ${teamIds}`,
                sql`${matches.teamBId} IN ${teamIds}`
            )
        )
        .orderBy(desc(matches.startTime))
        .limit(limit);

    // Process to add "result" (WIN/LOSS)
    return recentMatches.map(match => {
        const isTeamA = teamIds.includes(match.teamAId);
        const myTeamId = isTeamA ? match.teamAId : match.teamBId;
        const result = match.winnerId === myTeamId ? 'WIN' : (match.winnerId ? 'LOSS' : 'DRAW');
        return { ...match, result };
    });
}

const getNotifications = async (userId) => {
    return await db.select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(20);
}

const calculateRank = async (points) => {
    if (points > 5000) return '#12';
    if (points > 1000) return '#128';
    return '#--';
}

module.exports = {
    calculateUserStats,
    getRecentMatches,
    getNotifications
};
