/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 *
 * Phase 3 — CQRS Write Side
 * Kafka consumer that updates Redis sorted sets on every match/tournament event.
 *
 * Redis keys:
 *   leaderboard:global              → all-time rankings
 *   leaderboard:game:{game}         → per-game rankings
 *   leaderboard:tournament:{id}     → per-tournament rankings
 *
 * Point values:
 *   WIN  = 3 pts  |  LOSS = 1 pt  |  TOURNAMENT_WIN_BONUS = 10 pts
 */

const { createConsumer } = require('../../config/kafka.config');
const { getRedisClient } = require('../../config/redis.config');
const { db } = require('../../db');
const { teamMembers } = require('../../db/schema');
const { eq, or } = require('drizzle-orm');

/**
 * Resolve participant IDs to individual user IDs.
 * For SOLO, participantAId/B are already userIds.
 * For TEAM, look up members for each teamId.
 */
const resolveUserIds = async (ids, tournamentType) => {
    if (tournamentType !== 'TEAM') return ids.filter(Boolean);
    if (!ids.filter(Boolean).length) return [];
    const rows = await db
        .select({ userId: teamMembers.userId, teamId: teamMembers.teamId })
        .from(teamMembers)
        .where(or(...ids.filter(Boolean).map(id => eq(teamMembers.teamId, id))));
    return rows.map(r => r.userId);
};

const TOPICS = ['match.completed', 'tournament.ended', 'match.scheduled'];
const GROUP_ID = 'leaderboard-consumer';

const WIN_POINTS = 3;
const LOSS_POINTS = 1;
const TOURNAMENT_WIN_BONUS = 10;

// TTL for per-tournament leaderboards (7 days after last write)
const TOURNAMENT_TTL_SECONDS = 60 * 60 * 24 * 7;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely get Redis client — returns null if unavailable (graceful degradation).
 */
const getRedis = () => {
    try {
        return getRedisClient();
    } catch {
        return null;
    }
};

/**
 * ZINCRBY wrapper — increments a member's score in a sorted set.
 * Silently no-ops if Redis is unavailable.
 */
const incrementScore = async (redis, key, points, memberId) => {
    if (!redis || !memberId || redis.isMock) return;
    await redis.zIncrBy(key, points, memberId);
};

// ─── Event Handlers ───────────────────────────────────────────────────────────

/**
 * match.completed → award WIN points to winner, LOSS points to loser.
 *
 * Updates:
 *   - leaderboard:global
 *   - leaderboard:game:{game}          (if game present in payload)
 *   - leaderboard:tournament:{id}
 */
const handleMatchCompleted = async (payload) => {
    const { matchId, tournamentId, game, winnerId, loserId, tournamentType } = payload;

    if (!winnerId) {
        console.warn(`⚠️  Leaderboard: match.completed missing winnerId — matchId=${matchId}`);
        return;
    }

    const redis = getRedis();
    if (!redis) {
        console.warn('⚠️  Leaderboard: Redis unavailable — skipping update');
        return;
    }

    // Resolve actual player userIds (passthrough for SOLO, team member lookup for TEAM)
    const [winnerIds, loserIds] = await Promise.all([
        resolveUserIds([winnerId], tournamentType),
        loserId ? resolveUserIds([loserId], tournamentType) : Promise.resolve([]),
    ]);

    const ops = [];

    // Score each winner and loser individually
    for (const uid of winnerIds) {
        ops.push(incrementScore(redis, 'leaderboard:global', WIN_POINTS, uid));
        if (game) ops.push(incrementScore(redis, `leaderboard:game:${game.toLowerCase()}`, WIN_POINTS, uid));
        if (tournamentId) ops.push(incrementScore(redis, `leaderboard:tournament:${tournamentId}`, WIN_POINTS, uid));
    }
    for (const uid of loserIds) {
        ops.push(incrementScore(redis, 'leaderboard:global', LOSS_POINTS, uid));
        if (game) ops.push(incrementScore(redis, `leaderboard:game:${game.toLowerCase()}`, LOSS_POINTS, uid));
        if (tournamentId) ops.push(incrementScore(redis, `leaderboard:tournament:${tournamentId}`, LOSS_POINTS, uid));
    }

    // Refresh per-tournament TTL
    if (tournamentId) {
        ops.push(redis.expire(`leaderboard:tournament:${tournamentId}`, TOURNAMENT_TTL_SECONDS));
    }

    await Promise.allSettled(ops);
    console.log(`📊 Leaderboard: +${WIN_POINTS} for ${winnerIds.length} winner(s), +${LOSS_POINTS} for ${loserIds.length} loser(s) [match ${matchId}]`);
};


/**
 * tournament.ended → award bonus points to tournament champion.
 */
const handleTournamentEnded = async (payload) => {
    const { tournamentId, winnerId, game } = payload;
    if (!winnerId) return;

    const redis = getRedis();
    if (!redis) return;

    const ops = [
        incrementScore(redis, 'leaderboard:global', TOURNAMENT_WIN_BONUS, winnerId),
    ];

    if (game) {
        ops.push(incrementScore(redis, `leaderboard:game:${game.toLowerCase()}`, TOURNAMENT_WIN_BONUS, winnerId));
    }

    await Promise.allSettled(ops);
    console.log(`🏆 Leaderboard: +${TOURNAMENT_WIN_BONUS} tournament win bonus for ${winnerId}`);
};

// ─── Consumer ─────────────────────────────────────────────────────────────────

const startLeaderboardConsumer = async () => {
    const consumer = createConsumer(GROUP_ID);
    if (!consumer) {
        console.warn('⚠️  Leaderboard Consumer: Kafka disabled, skipping.');
        return;
    }

    try {
        await consumer.connect();
        await consumer.subscribe({ topics: TOPICS, fromBeginning: false });

        await consumer.run({
            eachMessage: async ({ topic, message }) => {
                let payload;
                try {
                    payload = JSON.parse(message.value.toString());
                } catch (e) {
                    console.error(`❌ Leaderboard Consumer: Failed to parse [${topic}]:`, e.message);
                    return;
                }

                switch (topic) {
                    case 'match.completed':
                        await handleMatchCompleted(payload);
                        break;
                    case 'tournament.ended':
                        await handleTournamentEnded(payload);
                        break;
                    // match.scheduled → no score change, but could be used for "upcoming match" cache
                }
            }
        });

        console.log('✅ Leaderboard Consumer: Listening on topics:', TOPICS.join(', '));
    } catch (err) {
        console.error('❌ Leaderboard Consumer: Failed to start:', err.message);
    }
};

module.exports = { startLeaderboardConsumer };
