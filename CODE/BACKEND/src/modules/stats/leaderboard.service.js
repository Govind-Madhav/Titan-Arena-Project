/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 *
 * Phase 3 — CQRS Read Side
 * All leaderboard reads go to Redis sorted sets (sub-millisecond).
 * Falls back to PostgreSQL if Redis is unavailable.
 */

const { getRedisClient } = require('../../config/redis.config');
const { db } = require('../../db');
const { sql } = require('drizzle-orm');

const DEFAULT_LIMIT = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getRedis = () => {
    try {
        const r = getRedisClient();
        return r?.isMock ? null : r;
    } catch {
        return null;
    }
};

/**
 * Transform Redis ZREVRANGE_WITHSCORES result into a ranked array.
 * Redis returns [{value, score}, ...] ordered highest→lowest.
 */
const rankify = (entries, startRank = 1) =>
    entries.map((entry, i) => ({
        rank: startRank + i,
        userId: entry.value,
        score: Math.round(entry.score),
    }));

// ─── PostgreSQL Fallback ───────────────────────────────────────────────────────

/**
 * Fallback: derive leaderboard from match wins in PostgreSQL.
 * Slower (~10-50ms) but always correct.
 */
const getLeaderboardFromPostgres = async (limit = DEFAULT_LIMIT) => {
    console.log('⚠️  Leaderboard: Redis unavailable — reading from PostgreSQL');
    const rows = await db.execute(sql`
        SELECT winner_id AS "userId",
               COUNT(*)::int AS wins,
               COUNT(*) * 3 AS score
        FROM "match"
        WHERE winner_id IS NOT NULL
          AND status = 'COMPLETED'
        GROUP BY winner_id
        ORDER BY wins DESC
        LIMIT ${limit}
    `);
    return rows.rows.map((r, i) => ({ rank: i + 1, ...r }));
};

const getTournamentLeaderboardFromPostgres = async (tournamentId, limit = DEFAULT_LIMIT) => {
    const rows = await db.execute(sql`
        SELECT winner_id AS "userId",
               COUNT(*)::int AS wins,
               COUNT(*) * 3 AS score
        FROM "match"
        WHERE tournament_id = ${tournamentId}
          AND winner_id IS NOT NULL
          AND status = 'COMPLETED'
        GROUP BY winner_id
        ORDER BY wins DESC
        LIMIT ${limit}
    `);
    return rows.rows.map((r, i) => ({ rank: i + 1, ...r }));
};

// ─── Read Functions ────────────────────────────────────────────────────────────

/**
 * Global leaderboard — top N players by all-time score.
 */
const getGlobalLeaderboard = async (limit = DEFAULT_LIMIT) => {
    const redis = getRedis();
    if (!redis) return getLeaderboardFromPostgres(limit);

    const entries = await redis.zRangeWithScores('leaderboard:global', 0, limit - 1, { REV: true });
    if (!entries.length) return getLeaderboardFromPostgres(limit);

    return rankify(entries);
};

/**
 * Per-game leaderboard.
 */
const getGameLeaderboard = async (game, limit = DEFAULT_LIMIT) => {
    const redis = getRedis();
    if (!redis) return [];

    const key = `leaderboard:game:${game.toLowerCase()}`;
    const entries = await redis.zRangeWithScores(key, 0, limit - 1, { REV: true });
    return rankify(entries);
};

/**
 * Per-tournament leaderboard.
 */
const getTournamentLeaderboard = async (tournamentId, limit = DEFAULT_LIMIT) => {
    const redis = getRedis();
    if (!redis) return getTournamentLeaderboardFromPostgres(tournamentId, limit);

    const key = `leaderboard:tournament:${tournamentId}`;
    const entries = await redis.zRangeWithScores(key, 0, limit - 1, { REV: true });
    if (!entries.length) return getTournamentLeaderboardFromPostgres(tournamentId, limit);

    return rankify(entries);
};

/**
 * Single player rank + score (global).
 * Returns { rank, score } or null if player not yet on board.
 */
const getPlayerRank = async (userId) => {
    const redis = getRedis();
    if (!redis) return null;

    const [rank, score] = await Promise.all([
        redis.zRevRank('leaderboard:global', userId),
        redis.zScore('leaderboard:global', userId),
    ]);

    if (rank === null) return null;
    return { userId, rank: rank + 1, score: Math.round(score ?? 0) };
};

module.exports = {
    getGlobalLeaderboard,
    getGameLeaderboard,
    getTournamentLeaderboard,
    getPlayerRank,
};
