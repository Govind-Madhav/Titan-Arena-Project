/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 *
 * Achievement & Badge Service — Phase D3
 * Manages achievement definitions and auto-unlocking on game events.
 *
 * BUILT-IN ACHIEVEMENTS:
 *   FIRST_BLOOD       — Win your first ever match
 *   HAT_TRICK         — Win 3 matches in a row (consecutive)
 *   CHAMPION          — Win a tournament
 *   PODIUM            — Finish top-3 in a tournament
 *   VETERAN           — Play 50 matches
 *   UNTOUCHABLE       — Win a tournament without losing a match
 *   GIANT_SLAYER      — Beat a player with 200+ higher rating
 *   ON_FIRE           — Win 5 matches in a row
 */

const { db } = require('../db');
const { achievements, userAchievements, users } = require('../db/schema');
const { eq, and } = require('drizzle-orm');
const emailService = require('./email.service');

// ─── Seed Achievement Definitions ──────────────────────────────────────────────
// These are upserted on first use. Run seedAchievements() on server boot.
const ACHIEVEMENT_DEFS = [
    { id: 'FIRST_BLOOD', name: 'First Blood', description: 'Win your very first match.', tier: 'BRONZE', points: 10 },
    { id: 'HAT_TRICK', name: 'Hat Trick', description: 'Win 3 matches in a row.', tier: 'SILVER', points: 25 },
    { id: 'ON_FIRE', name: 'On Fire', description: 'Win 5 matches in a row.', tier: 'GOLD', points: 50 },
    { id: 'CHAMPION', name: 'Champion', description: 'Win a tournament.', tier: 'GOLD', points: 100 },
    { id: 'PODIUM', name: 'Podium Finish', description: 'Finish in the top 3 of a tournament.', tier: 'SILVER', points: 40 },
    { id: 'VETERAN', name: 'Veteran', description: 'Play 50 matches.', tier: 'SILVER', points: 30 },
    { id: 'UNTOUCHABLE', name: 'Untouchable', description: 'Win a tournament without a single loss.', tier: 'LEGENDARY', points: 200 },
    { id: 'GIANT_SLAYER', name: 'Giant Slayer', description: 'Beat an opponent rated 200+ higher.', tier: 'GOLD', points: 75 },
];

/**
 * Upsert all achievement definitions into the DB.
 * Safe to run at server start — idempotent via ON CONFLICT (id) DO NOTHING.
 */
async function seedAchievements() {
    try {
        for (const def of ACHIEVEMENT_DEFS) {
            await db.insert(achievements).values(def).onConflictDoNothing();
        }
        console.log('✅ Achievements seeded');
    } catch (err) {
        console.error('❌ Achievement seed failed:', err.message);
    }
}

/**
 * Checks whether a user already has a specific achievement.
 */
async function hasAchievement(userId, achievementId) {
    const rows = await db.select().from(userAchievements)
        .where(and(eq(userAchievements.userId, userId), eq(userAchievements.achievementId, achievementId)));
    return rows.length > 0;
}

/**
 * Awards an achievement to a user (if they don't already have it).
 * Sends an email notification asynchronously.
 * @param {string} userId
 * @param {string} achievementId
 * @param {object} meta — optional context (tournamentId, matchId, etc.)
 */
async function awardAchievement(userId, achievementId, meta = null) {
    if (await hasAchievement(userId, achievementId)) return null; // already earned

    const [row] = await db.insert(userAchievements)
        .values({ userId, achievementId, meta })
        .returning()
        .catch(() => [null]);

    if (!row) return null;

    // Fetch achievement definition + user email for notification
    const [def] = await db.select().from(achievements).where(eq(achievements.id, achievementId));
    const [user] = await db.select({ email: users.email, username: users.username }).from(users).where(eq(users.id, userId));

    if (def && user) {
        emailService.sendAchievementUnlocked({
            to: user.email,
            username: user.username,
            achievementName: def.name,
            description: def.description,
        }).catch(() => { });
    }

    console.log(`🏅 Achievement [${achievementId}] awarded to ${userId}`);
    return row;
}

/**
 * Process a match win event and unlock eligible achievements.
 * Called from the leaderboard consumer or match controller.
 *
 * @param {string} userId - The winner's user ID
 * @param {object} mmr - The winner's updated MMR object { wins, currentStreak, rating }
 * @param {number} opponentRating - The loser's MMR rating
 * @param {object} meta - { matchId, tournamentId }
 */
async function processMatchWin(userId, mmr, opponentRating, meta = {}) {
    const unlocked = [];

    // FIRST_BLOOD: First match win
    if (mmr.wins === 1) {
        const r = await awardAchievement(userId, 'FIRST_BLOOD', meta);
        if (r) unlocked.push('FIRST_BLOOD');
    }

    // HAT_TRICK: 3 wins in a row
    if (mmr.currentStreak >= 3) {
        const r = await awardAchievement(userId, 'HAT_TRICK', meta);
        if (r) unlocked.push('HAT_TRICK');
    }

    // ON_FIRE: 5 wins in a row
    if (mmr.currentStreak >= 5) {
        const r = await awardAchievement(userId, 'ON_FIRE', meta);
        if (r) unlocked.push('ON_FIRE');
    }

    // GIANT_SLAYER: Beat an opponent with 200+ higher MMR
    if (opponentRating && opponentRating - (mmr.rating - /* gain */ 0) >= 200) {
        const r = await awardAchievement(userId, 'GIANT_SLAYER', meta);
        if (r) unlocked.push('GIANT_SLAYER');
    }

    // VETERAN: 50 games played
    if (mmr.gamesPlayed >= 50) {
        const r = await awardAchievement(userId, 'VETERAN', meta);
        if (r) unlocked.push('VETERAN');
    }

    return unlocked;
}

/**
 * Process a tournament win event.
 * Called from completeTournament (match.controller.js).
 *
 * @param {string} userId
 * @param {string} tournamentId
 * @param {number} position - 1, 2, or 3
 * @param {boolean} undefeated - Won every match (no losses)
 */
async function processTournamentResult(userId, tournamentId, position, undefeated = false) {
    const meta = { tournamentId };
    const unlocked = [];

    if (position === 1) {
        const r = await awardAchievement(userId, 'CHAMPION', meta);
        if (r) unlocked.push('CHAMPION');
    }

    if (position <= 3) {
        const r = await awardAchievement(userId, 'PODIUM', meta);
        if (r) unlocked.push('PODIUM');
    }

    if (position === 1 && undefeated) {
        const r = await awardAchievement(userId, 'UNTOUCHABLE', meta);
        if (r) unlocked.push('UNTOUCHABLE');
    }

    return unlocked;
}

/**
 * Get all achievements for a user.
 * @param {string} userId
 */
async function getUserAchievements(userId) {
    const rows = await db.select({
        unlockedAt: userAchievements.unlockedAt,
        achievementId: achievements.id,
        name: achievements.name,
        description: achievements.description,
        tier: achievements.tier,
        points: achievements.points,
        iconUrl: achievements.iconUrl,
    })
        .from(userAchievements)
        .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
        .where(eq(userAchievements.userId, userId));
    return rows;
}

module.exports = { seedAchievements, awardAchievement, processMatchWin, processTournamentResult, getUserAchievements };
