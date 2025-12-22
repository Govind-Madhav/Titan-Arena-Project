/**
 * Firebase Sync Worker (Production-Hardened)
 * 
 * Dedicated process that:
 * 1. Subscribes to Redis Pub/Sub events
 * 2. Syncs events to Firebase (with atomic idempotency)
 * 3. Exposes SRE-grade health endpoint
 * 4. Self-heals on Redis disconnect
 * 
 * Failure Semantics:
 * - Redis Pub/Sub is non-durable
 * - Lost events are acceptable for UI updates
 * - No backend logic depends on Firebase state
 * 
 * OPERATIONAL IMPROVEMENTS:
 * ✅ Atomic idempotency (claim → write → extend)
 * ✅ Timestamp validation (detect staleness/skew)
 * ✅ Structured error logging (machine-parseable)
 * ✅ Redis reconnection (self-healing)
 * ✅ Payload validation (defensive handlers)
 * ✅ Environment namespacing (prevent pollution)
 */

require('dotenv').config();
const express = require('express');
const { initializeFirebase, checkFirebaseHealth, closeFirebase } = require('../src/config/firebase.config');
const { createRedisClient, checkRedisHealth, closeRedis, getRedisClient } = require('../src/config/redis.config');
const { registerHandler, startSubscriber } = require('../src/events/event.subscriber');
const { writeData, updateData } = require('../src/utils/firebase.utils');
const {
    EVENT_TYPES,
    FIREBASE_PATHS,
    MatchCompletedPayloadSchema,
    TournamentUpdatedPayloadSchema,
    BracketChangedPayloadSchema,
    LobbyUpdatedPayloadSchema
} = require('../src/events/event.schemas');

// ✅ FIX: Environment namespace (prevents dev/staging/prod pollution)
const ENV = process.env.NODE_ENV || 'development';
const envPath = (path) => `${ENV}/${path}`;

// Worker state
let lastEventTimestamp = null;
let processedEventCount = 0;
let failedEventCount = 0;
let staleEventCount = 0;

// ✅ FIX: Structured logging helper
const log = (level, event, metadata = {}) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        event,
        component: 'firebase-sync-worker',
        ...metadata
    };

    if (process.env.NODE_ENV === 'production') {
        console.log(JSON.stringify(logEntry));
    } else {
        const emoji = { info: '✅', warn: '⚠️', error: '❌' }[level] || 'ℹ️';
        console.log(`${emoji} ${event}`, metadata);
    }
};

/**
 * Atomic idempotency check and claim
 * ✅ FIX: SETNX-style atomic claim BEFORE write
 * 
 * Flow:
 * 1. SETNX claim (short TTL)
 * 2. Write to Firebase
 * 3. Extend TTL to 1 hour
 * 
 * If crash between 2-3, short TTL allows retry
 */
const claimEvent = async (eventId) => {
    try {
        const client = getRedisClient();
        const processedKey = `events:processed:${eventId}`;

        // ✅ Atomic claim with short TTL (30s safety window)
        const claimed = await client.set(processedKey, '1', { NX: true, EX: 30 });
        return claimed !== null;
    } catch (error) {
        log('error', 'EVENT_CLAIM_FAILED', { eventId, error: error.message });
        // Fail open: assume claimed to prevent duplicate writes
        return false;
    }
};

/**
 * Extend event claim (after successful Firebase write)
 */
const extendEventClaim = async (eventId) => {
    try {
        const client = getRedisClient();
        const processedKey = `events:processed:${eventId}`;
        await client.expire(processedKey, 3600); // Extend to 1 hour
    } catch (error) {
        log('warn', 'EVENT_CLAIM_EXTEND_FAILED', { eventId, error: error.message });
    }
};

/**
 * Validate event timestamp freshness
 * ✅ FIX: Detect stale events and time skew
 */
const validateEventTimestamp = (event) => {
    const MAX_EVENT_AGE_MS = 60000; // 1 minute
    const now = Date.now();
    const age = now - event.timestamp;

    if (age > MAX_EVENT_AGE_MS) {
        log('warn', 'STALE_EVENT_DETECTED', {
            eventId: event.id,
            type: event.type,
            ageMs: age,
            threshold: MAX_EVENT_AGE_MS
        });
        staleEventCount++;
        return false;
    }

    if (age < 0) {
        log('warn', 'CLOCK_SKEW_DETECTED', {
            eventId: event.id,
            type: event.type,
            skewMs: Math.abs(age)
        });
    }

    return true;
};

/**
 * Handle MATCH_COMPLETED event
 * ✅ FIX: Defensive payload validation
 */
const handleMatchCompleted = async (event) => {
    // ✅ Atomic idempotency claim
    if (!await claimEvent(event.id)) {
        log('info', 'EVENT_ALREADY_PROCESSED', { eventId: event.id, type: event.type });
        return;
    }

    // ✅ Validate timestamp
    if (!validateEventTimestamp(event)) {
        return; // Skip stale events
    }

    try {
        // ✅ FIX: Defensive payload validation
        const payload = MatchCompletedPayloadSchema.parse(event.payload);
        const { matchId, tournamentId, winnerId, team1Score, team2Score, completedAt } = payload;

        // ✅ Write to environment-namespaced Firebase path
        const path = FIREBASE_PATHS.tournamentMatch(tournamentId, matchId);
        await writeData(envPath(`${path}/result`), {
            winnerId,
            team1Score,
            team2Score,
            status: 'completed',
            completedAt,
            eventId: event.id, // ✅ Correlation ID
            version: event.version,
            source: event.source,
            syncedAt: Date.now()
        });

        // ✅ Extend claim to 1 hour
        await extendEventClaim(event.id);

        processedEventCount++;
        lastEventTimestamp = event.timestamp;

        log('info', 'EVENT_SYNCED', { eventId: event.id, type: event.type, matchId });
    } catch (error) {
        failedEventCount++;
        log('error', 'EVENT_SYNC_FAILED', {
            eventId: event.id,
            type: event.type,
            error: error.message,
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
        });
        throw error;
    }
};

/**
 * Handle TOURNAMENT_UPDATED event
 */
const handleTournamentUpdated = async (event) => {
    if (!await claimEvent(event.id)) {
        log('info', 'EVENT_ALREADY_PROCESSED', { eventId: event.id, type: event.type });
        return;
    }

    if (!validateEventTimestamp(event)) return;

    try {
        const payload = TournamentUpdatedPayloadSchema.parse(event.payload);
        const { tournamentId, ...updates } = payload;

        const path = FIREBASE_PATHS.tournament(tournamentId);
        await updateData(envPath(`${path}/status`), {
            ...updates,
            eventId: event.id,
            version: event.version,
            source: event.source,
            syncedAt: Date.now()
        });

        await extendEventClaim(event.id);
        processedEventCount++;
        lastEventTimestamp = event.timestamp;

        log('info', 'EVENT_SYNCED', { eventId: event.id, type: event.type, tournamentId });
    } catch (error) {
        failedEventCount++;
        log('error', 'EVENT_SYNC_FAILED', {
            eventId: event.id,
            type: event.type,
            error: error.message
        });
        throw error;
    }
};

/**
 * Handle BRACKET_CHANGED event
 */
const handleBracketChanged = async (event) => {
    if (!await claimEvent(event.id)) {
        log('info', 'EVENT_ALREADY_PROCESSED', { eventId: event.id, type: event.type });
        return;
    }

    if (!validateEventTimestamp(event)) return;

    try {
        const payload = BracketChangedPayloadSchema.parse(event.payload);
        const { tournamentId, bracket, round, updatedAt } = payload;

        const path = FIREBASE_PATHS.tournamentBracket(tournamentId);
        await writeData(envPath(path), {
            bracket,
            round,
            updatedAt,
            eventId: event.id,
            version: event.version,
            source: event.source,
            syncedAt: Date.now()
        });

        await extendEventClaim(event.id);
        processedEventCount++;
        lastEventTimestamp = event.timestamp;

        log('info', 'EVENT_SYNCED', { eventId: event.id, type: event.type, tournamentId });
    } catch (error) {
        failedEventCount++;
        log('error', 'EVENT_SYNC_FAILED', {
            eventId: event.id,
            type: event.type,
            error: error.message
        });
        throw error;
    }
};

/**
 * Handle LOBBY_UPDATED event
 */
const handleLobbyUpdated = async (event) => {
    if (!await claimEvent(event.id)) {
        log('info', 'EVENT_ALREADY_PROCESSED', { eventId: event.id, type: event.type });
        return;
    }

    if (!validateEventTimestamp(event)) return;

    try {
        const payload = LobbyUpdatedPayloadSchema.parse(event.payload);
        const { lobbyId, tournamentId, participants, capacity, status } = payload;

        const path = FIREBASE_PATHS.lobby(lobbyId);
        await writeData(envPath(path), {
            tournamentId,
            participants,
            capacity,
            status,
            eventId: event.id,
            version: event.version,
            source: event.source,
            syncedAt: Date.now()
        });

        await extendEventClaim(event.id);
        processedEventCount++;
        lastEventTimestamp = event.timestamp;

        log('info', 'EVENT_SYNCED', { eventId: event.id, type: event.type, lobbyId });
    } catch (error) {
        failedEventCount++;
        log('error', 'EVENT_SYNC_FAILED', {
            eventId: event.id,
            type: event.type,
            error: error.message
        });
        throw error;
    }
};

/**
 * Start worker
 */
const startWorker = async () => {
    log('info', 'WORKER_STARTING', {
        pid: process.pid,
        env: ENV
    });

    try {
        // Initialize Firebase (hard dependency for this worker)
        try {
            initializeFirebase();
            log('info', 'FIREBASE_INITIALIZED');
        } catch (error) {
            log('error', 'FIREBASE_INIT_FAILED', { error: error.message });
            process.exit(1);
        }

        // Initialize Redis (hard dependency)
        await createRedisClient();
        log('info', 'REDIS_INITIALIZED');

        // Register event handlers
        registerHandler(EVENT_TYPES.MATCH_COMPLETED, handleMatchCompleted);
        registerHandler(EVENT_TYPES.TOURNAMENT_UPDATED, handleTournamentUpdated);
        registerHandler(EVENT_TYPES.BRACKET_CHANGED, handleBracketChanged);
        registerHandler(EVENT_TYPES.LOBBY_UPDATED, handleLobbyUpdated);
        log('info', 'HANDLERS_REGISTERED', { count: 4 });

        // Start subscriber
        const subscriber = await startSubscriber();

        // ✅ FIX: Redis health check with auto-restart
        setInterval(async () => {
            const health = await checkRedisHealth();
            if (health.status !== 'connected') {
                log('error', 'REDIS_DISCONNECTED', { health });
                log('warn', 'WORKER_RESTARTING', { reason: 'Redis disconnect' });
                process.exit(1); // Let process manager restart
            }
        }, 10000); // Check every 10s

        // Start health endpoint
        const app = express();
        const healthPort = process.env.WORKER_HEALTH_PORT || 5001;

        app.get('/health', async (req, res) => {
            const firebaseHealth = await checkFirebaseHealth();
            const redisHealth = await checkRedisHealth();

            const isHealthy = redisHealth.status === 'connected' && firebaseHealth.status === 'connected';

            // ✅ FIX: Expose failure rate for alerting
            const failureRate = processedEventCount > 0
                ? (failedEventCount / (processedEventCount + failedEventCount)) * 100
                : 0;

            res.status(isHealthy ? 200 : 503).json({
                status: isHealthy ? 'OK' : 'DEGRADED',
                worker: 'firebase-sync',
                pid: process.pid,
                env: ENV,
                uptime: process.uptime(),
                services: {
                    redis: redisHealth,
                    firebase: firebaseHealth
                },
                stats: {
                    processedEvents: processedEventCount,
                    failedEvents: failedEventCount,
                    staleEvents: staleEventCount,
                    failureRate: failureRate.toFixed(2) + '%',
                    lastEventTimestamp: lastEventTimestamp ? new Date(lastEventTimestamp).toISOString() : null,
                    timeSinceLastEvent: lastEventTimestamp ? Date.now() - lastEventTimestamp : null
                }
            });
        });

        const server = app.listen(healthPort, () => {
            log('info', 'WORKER_READY', { healthPort });
        });

        // Graceful shutdown
        const shutdown = async (signal) => {
            log('warn', 'WORKER_SHUTTING_DOWN', { signal });

            server.close(async () => {
                await subscriber.stop();
                await closeFirebase();
                await closeRedis();
                log('info', 'WORKER_SHUTDOWN_COMPLETE');
                process.exit(0);
            });

            setTimeout(() => {
                log('error', 'WORKER_FORCED_SHUTDOWN');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        log('error', 'WORKER_START_FAILED', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
};

// Start worker
startWorker();
