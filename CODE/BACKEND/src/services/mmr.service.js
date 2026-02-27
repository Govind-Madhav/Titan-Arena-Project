/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 *
 * MMR / ELO Rating Service — Phase D1 (extended with Team MMR + MVP)
 *
 * Implements a modified Elo rating system with K-factor decay and tier classification.
 * Supports both SOLO and TEAM tournament modes:
 *   - Solo:  processMatchResult(winnerId, loserId)
 *   - Team:  processTeamMatchResult(winTeamId, loseTeamId, mvpUserId?)
 *
 * TIER TABLE:
 *   < 900        → BRONZE
 *   900–1099     → SILVER
 *   1100–1299    → GOLD
 *   1300–1499    → PLATINUM
 *   1500–1799    → DIAMOND
 *   >= 1800      → CHAMPION
 *
 * K-FACTOR (sensitivity):
 *   < 10 games   → K=40  (placement match phase)
 *   10–30 games  → K=25
 *   > 30 games   → K=16  (seasoned players)
 *
 * MVP BONUS:
 *   The designated MVP player on the winning team gets an additional
 *   +MVP_BONUS_MMR points on top of the standard team-win gain.
 *   This bonus represents individual excellence inside a team win and
 *   feeds the per-tournament MVP leaderboard.
 */

const { db } = require('../db');
const { mmrRatings, teamMmrRatings, teamMembers, matchMvps } = require('../db/schema');
const { eq, inArray, sql } = require('drizzle-orm');

// ─── Constants ────────────────────────────────────────────────────────────────

const MVP_BONUS_MMR = 15; // Extra MMR awarded to the match MVP

const TIERS = [
    { name: 'CHAMPION', min: 1800 },
    { name: 'DIAMOND', min: 1500 },
    { name: 'PLATINUM', min: 1300 },
    { name: 'GOLD', min: 1100 },
    { name: 'SILVER', min: 900 },
    { name: 'BRONZE', min: 0 },
];

function getTier(rating) {
    return (TIERS.find(t => rating >= t.min) || TIERS[TIERS.length - 1]).name;
}

function getKFactor(gamesPlayed) {
    if (gamesPlayed < 10) return 40;
    if (gamesPlayed < 30) return 25;
    return 16;
}

/** Expected win probability for player/team A vs B. */
function expectedScore(ratingA, ratingB) {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

// ─── Solo MMR ─────────────────────────────────────────────────────────────────

async function getOrCreate(userId) {
    const existing = await db.select().from(mmrRatings).where(eq(mmrRatings.userId, userId));
    if (existing.length) return existing[0];

    const [fresh] = await db.insert(mmrRatings)
        .values({ userId, rating: 1000, tier: 'BRONZE' })
        .returning();
    return fresh;
}

/**
 * Process a SOLO match result and update both players' ratings.
 * @returns {{ winner, loser, winnerGain, loserLoss }}
 */
async function processMatchResult(winnerId, loserId) {
    if (winnerId === loserId) throw new Error('winnerId and loserId cannot be the same');

    const [winnerMmr, loserMmr] = await Promise.all([getOrCreate(winnerId), getOrCreate(loserId)]);

    const expectedWin = expectedScore(winnerMmr.rating, loserMmr.rating);
    const kWinner = getKFactor(winnerMmr.gamesPlayed);
    const kLoser = getKFactor(loserMmr.gamesPlayed);
    const winnerGain = Math.round(kWinner * (1 - expectedWin));
    const loserLoss = Math.round(kLoser * expectedWin);

    const newWinnerRating = Math.max(0, winnerMmr.rating + winnerGain);
    const newLoserRating = Math.max(0, loserMmr.rating - loserLoss);
    const winnerStreak = winnerMmr.currentStreak >= 0 ? winnerMmr.currentStreak + 1 : 1;
    const loserStreak = loserMmr.currentStreak <= 0 ? loserMmr.currentStreak - 1 : -1;

    const [updatedWinner] = await db
        .update(mmrRatings)
        .set({
            rating: newWinnerRating,
            wins: sql`${mmrRatings.wins} + 1`,
            gamesPlayed: sql`${mmrRatings.gamesPlayed} + 1`,
            peakRating: sql`GREATEST(${mmrRatings.peakRating}, ${newWinnerRating})`,
            currentStreak: winnerStreak,
            tier: getTier(newWinnerRating),
            updatedAt: new Date(),
        })
        .where(eq(mmrRatings.userId, winnerId))
        .returning();

    const [updatedLoser] = await db
        .update(mmrRatings)
        .set({
            rating: newLoserRating,
            losses: sql`${mmrRatings.losses} + 1`,
            gamesPlayed: sql`${mmrRatings.gamesPlayed} + 1`,
            currentStreak: loserStreak,
            tier: getTier(newLoserRating),
            updatedAt: new Date(),
        })
        .where(eq(mmrRatings.userId, loserId))
        .returning();

    return { winner: updatedWinner, loser: updatedLoser, winnerGain, loserLoss };
}

// ─── Team MMR ─────────────────────────────────────────────────────────────────

async function getOrCreateTeam(teamId) {
    const existing = await db.select().from(teamMmrRatings).where(eq(teamMmrRatings.teamId, teamId));
    if (existing.length) return existing[0];

    const [fresh] = await db.insert(teamMmrRatings)
        .values({ teamId, rating: 1000, tier: 'BRONZE' })
        .returning();
    return fresh;
}

/**
 * Process a TEAM match result.
 *   1. Updates team-level Elo (Option A)
 *   2. Updates every member's individual Elo proportionally (Option B)
 *   3. Awards MVP bonus MMR to the designated MVP player and records the MVP row
 *
 * @param {string}  winTeamId   - ID of the winning team
 * @param {string}  loseTeamId  - ID of the losing team
 * @param {string}  matchId     - Match being processed
 * @param {string}  tournamentId
 * @param {string|null} mvpUserId - Optional: userId of the MVP on the winning team
 * @returns {{ teamWinner, teamLoser, memberUpdates, mvp }}
 */
async function processTeamMatchResult(winTeamId, loseTeamId, matchId, tournamentId, mvpUserId = null) {
    // ── 1. Team-level Elo ────────────────────────────────────────────────────
    const [winTeamMmr, loseTeamMmr] = await Promise.all([
        getOrCreateTeam(winTeamId),
        getOrCreateTeam(loseTeamId),
    ]);

    const expectedTeamWin = expectedScore(winTeamMmr.rating, loseTeamMmr.rating);
    const kWin = getKFactor(winTeamMmr.gamesPlayed);
    const kLose = getKFactor(loseTeamMmr.gamesPlayed);
    const teamWinnerGain = Math.round(kWin * (1 - expectedTeamWin));
    const teamLoserLoss = Math.round(kLose * expectedTeamWin);

    const newWinTeamRating = Math.max(0, winTeamMmr.rating + teamWinnerGain);
    const newLoseTeamRating = Math.max(0, loseTeamMmr.rating - teamLoserLoss);

    const [teamWinner] = await db.update(teamMmrRatings).set({
        rating: newWinTeamRating,
        wins: sql`${teamMmrRatings.wins} + 1`,
        gamesPlayed: sql`${teamMmrRatings.gamesPlayed} + 1`,
        peakRating: sql`GREATEST(${teamMmrRatings.peakRating}, ${newWinTeamRating})`,
        currentStreak: sql`CASE WHEN ${teamMmrRatings.currentStreak} >= 0 THEN ${teamMmrRatings.currentStreak} + 1 ELSE 1 END`,
        tier: getTier(newWinTeamRating),
        updatedAt: new Date(),
    }).where(eq(teamMmrRatings.teamId, winTeamId)).returning();

    const [teamLoser] = await db.update(teamMmrRatings).set({
        rating: newLoseTeamRating,
        losses: sql`${teamMmrRatings.losses} + 1`,
        gamesPlayed: sql`${teamMmrRatings.gamesPlayed} + 1`,
        currentStreak: sql`CASE WHEN ${teamMmrRatings.currentStreak} <= 0 THEN ${teamMmrRatings.currentStreak} - 1 ELSE -1 END`,
        tier: getTier(newLoseTeamRating),
        updatedAt: new Date(),
    }).where(eq(teamMmrRatings.teamId, loseTeamId)).returning();

    // ── 2. Individual member Elo (Option B) ──────────────────────────────────
    // Fetch all members of both teams
    const [winMembers, loseMembers] = await Promise.all([
        db.select({ userId: teamMembers.userId }).from(teamMembers).where(eq(teamMembers.teamId, winTeamId)),
        db.select({ userId: teamMembers.userId }).from(teamMembers).where(eq(teamMembers.teamId, loseTeamId)),
    ]);

    const winMemberIds = winMembers.map(m => m.userId);
    const loseMemberIds = loseMembers.map(m => m.userId);

    // Ensure all members have MMR rows
    await Promise.all([
        ...winMemberIds.map(uid => getOrCreate(uid)),
        ...loseMemberIds.map(uid => getOrCreate(uid)),
    ]);

    // Update all winners: same gain as team-level (shared responsibility)
    const memberUpdates = [];

    if (winMemberIds.length) {
        await db.update(mmrRatings).set({
            rating: sql`LEAST(9999, ${mmrRatings.rating} + ${teamWinnerGain})`,
            wins: sql`${mmrRatings.wins} + 1`,
            gamesPlayed: sql`${mmrRatings.gamesPlayed} + 1`,
            peakRating: sql`GREATEST(${mmrRatings.peakRating}, ${mmrRatings.rating} + ${teamWinnerGain})`,
            currentStreak: sql`CASE WHEN ${mmrRatings.currentStreak} >= 0 THEN ${mmrRatings.currentStreak} + 1 ELSE 1 END`,
            tier: sql`CASE
                WHEN ${mmrRatings.rating} + ${teamWinnerGain} >= 1800 THEN 'CHAMPION'
                WHEN ${mmrRatings.rating} + ${teamWinnerGain} >= 1500 THEN 'DIAMOND'
                WHEN ${mmrRatings.rating} + ${teamWinnerGain} >= 1300 THEN 'PLATINUM'
                WHEN ${mmrRatings.rating} + ${teamWinnerGain} >= 1100 THEN 'GOLD'
                WHEN ${mmrRatings.rating} + ${teamWinnerGain} >= 900  THEN 'SILVER'
                ELSE 'BRONZE' END`,
            updatedAt: new Date(),
        }).where(inArray(mmrRatings.userId, winMemberIds));
        memberUpdates.push({ team: 'WIN', members: winMemberIds, delta: `+${teamWinnerGain}` });
    }

    if (loseMemberIds.length) {
        await db.update(mmrRatings).set({
            rating: sql`GREATEST(0, ${mmrRatings.rating} - ${teamLoserLoss})`,
            losses: sql`${mmrRatings.losses} + 1`,
            gamesPlayed: sql`${mmrRatings.gamesPlayed} + 1`,
            currentStreak: sql`CASE WHEN ${mmrRatings.currentStreak} <= 0 THEN ${mmrRatings.currentStreak} - 1 ELSE -1 END`,
            tier: sql`CASE
                WHEN GREATEST(0, ${mmrRatings.rating} - ${teamLoserLoss}) >= 1800 THEN 'CHAMPION'
                WHEN GREATEST(0, ${mmrRatings.rating} - ${teamLoserLoss}) >= 1500 THEN 'DIAMOND'
                WHEN GREATEST(0, ${mmrRatings.rating} - ${teamLoserLoss}) >= 1300 THEN 'PLATINUM'
                WHEN GREATEST(0, ${mmrRatings.rating} - ${teamLoserLoss}) >= 1100 THEN 'GOLD'
                WHEN GREATEST(0, ${mmrRatings.rating} - ${teamLoserLoss}) >= 900  THEN 'SILVER'
                ELSE 'BRONZE' END`,
            updatedAt: new Date(),
        }).where(inArray(mmrRatings.userId, loseMemberIds));
        memberUpdates.push({ team: 'LOSE', members: loseMemberIds, delta: `-${teamLoserLoss}` });
    }

    // ── 3. MVP bonus ─────────────────────────────────────────────────────────
    let mvp = null;

    if (mvpUserId && winMemberIds.includes(mvpUserId)) {
        // Extra MMR bump for the MVP
        await db.update(mmrRatings).set({
            rating: sql`LEAST(9999, ${mmrRatings.rating} + ${MVP_BONUS_MMR})`,
            peakRating: sql`GREATEST(${mmrRatings.peakRating}, ${mmrRatings.rating} + ${MVP_BONUS_MMR})`,
            updatedAt: new Date(),
        }).where(eq(mmrRatings.userId, mvpUserId));

        // Record the MVP for history + leaderboard
        const [mvpRow] = await db.insert(matchMvps).values({
            matchId,
            tournamentId,
            teamId: winTeamId,
            userId: mvpUserId,
            mmrBonus: MVP_BONUS_MMR,
        }).returning();

        mvp = mvpRow;
    }

    return {
        teamWinner,
        teamLoser,
        teamWinnerGain,
        teamLoserLoss,
        memberUpdates,
        mvp,
    };
}

// ─── Read Helpers ─────────────────────────────────────────────────────────────

async function getRating(userId) {
    const [row] = await db.select().from(mmrRatings).where(eq(mmrRatings.userId, userId));
    return row || null;
}

async function getTeamRating(teamId) {
    const [row] = await db.select().from(teamMmrRatings).where(eq(teamMmrRatings.teamId, teamId));
    return row || null;
}

async function getBulkRatings(userIds) {
    if (!userIds.length) return {};
    const rows = await db.select().from(mmrRatings);
    const map = {};
    for (const row of rows) {
        if (userIds.includes(row.userId)) map[row.userId] = row.rating;
    }
    for (const uid of userIds) {
        if (!(uid in map)) map[uid] = 1000;
    }
    return map;
}

async function predictWinProbability(participantAId, participantBId) {
    const [a, b] = await Promise.all([getOrCreate(participantAId), getOrCreate(participantBId)]);
    const probA = expectedScore(a.rating, b.rating);
    return {
        participantA: { userId: a.userId, rating: a.rating, tier: a.tier, winProbability: Math.round(probA * 100) },
        participantB: { userId: b.userId, rating: b.rating, tier: b.tier, winProbability: Math.round((1 - probA) * 100) },
    };
}

module.exports = {
    processMatchResult,
    processTeamMatchResult,
    getRating,
    getTeamRating,
    getBulkRatings,
    predictWinProbability,
    getOrCreate,
    getTier,
};
