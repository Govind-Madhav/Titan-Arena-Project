/**
 * Event Schema Definitions
 * 
 * Event-Driven Architecture Contract
 * ===================================
 * Purpose: Enable real-time UI updates via Redis → Worker → Firebase pipeline
 * MySQL remains source of truth, Firebase is read-only mirror
 * 
 * Principles:
 * 1. Backend commits to MySQL FIRST
 * 2. Events emitted AFTER commit
 * 3. Redis is best-effort transport (non-durable)
 * 4. Firebase is read-only mirror for clients
 * 
 * NON-GOALS (Do NOT use for):
 * - Wallet updates
 * - Financial data sync
 * - Auth state replication
 * - Admin permissions
 */

const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');

// Event version (increment when payloads change)
const EVENT_VERSION = 1;

// Event source types
const EVENT_SOURCES = {
    BACKEND: 'backend',
    ADMIN: 'admin',
    WORKER: 'worker'
};

// Event type constants
const EVENT_TYPES = {
    MATCH_COMPLETED: 'MATCH_COMPLETED',
    TOURNAMENT_UPDATED: 'TOURNAMENT_UPDATED',
    BRACKET_CHANGED: 'BRACKET_CHANGED',
    LOBBY_UPDATED: 'LOBBY_UPDATED'
};

// Channel mapping (deterministic structure)
// NOTE: Redis Pub/Sub is non-durable. Events may be lost if workers are down.
// This is acceptable because Firebase is UI-only mirror.
const EVENT_CHANNELS = {
    MATCH_COMPLETED: 'events:matches',
    TOURNAMENT_UPDATED: 'events:tournaments',
    BRACKET_CHANGED: 'events:brackets',
    LOBBY_UPDATED: 'events:lobbies'
};

/**
 * Firebase Path Structure (Canonical)
 * 
 * realtime/
 *  ├── tournaments/{tournamentId}/
 *  │   ├── status
 *  │   ├── bracket
 *  │   └── matches/{matchId}/
 *  │       ├── score
 *  │       ├── status
 *  │       └── winner
 *  └── lobbies/{lobbyId}/
 *      └── participants
 */
const FIREBASE_PATHS = {
    tournament: (tournamentId) => `tournaments/${tournamentId}`,
    tournamentMatch: (tournamentId, matchId) => `tournaments/${tournamentId}/matches/${matchId}`,
    tournamentBracket: (tournamentId) => `tournaments/${tournamentId}/bracket`,
    lobby: (lobbyId) => `lobbies/${lobbyId}`
};

// ==========================================
// BASE EVENT SCHEMA
// ==========================================

// IMPORTANT: All events MUST be created via builders.
// validateEvent() only validates base shape. Payload conformance to type is assumed.
const BaseEventSchema = z.object({
    id: z.string().uuid(), // Idempotency key
    version: z.literal(EVENT_VERSION),
    type: z.enum(Object.values(EVENT_TYPES)),
    timestamp: z.number().int().positive(),
    source: z.enum(Object.values(EVENT_SOURCES)),
    payload: z.unknown(), // Validated by builders, not here
    metadata: z.object({
        userId: z.string().max(64).optional(), // ✅ FIX: Max length to prevent log/Redis abuse
        requestId: z.string().max(128).optional()
    }).optional()
});

// ==========================================
// EVENT-SPECIFIC PAYLOADS
// ==========================================

const MatchCompletedPayloadSchema = z.object({
    matchId: z.number().int().positive(),
    tournamentId: z.number().int().positive(),
    winnerId: z.number().int().positive(),
    team1Score: z.number().int().nonnegative(),
    team2Score: z.number().int().nonnegative(),
    completedAt: z.number().int().positive()
});

const TournamentUpdatedPayloadSchema = z.object({
    tournamentId: z.number().int().positive(),
    status: z.enum(['upcoming', 'active', 'completed', 'cancelled']).optional(),
    prizePool: z.number().optional(),
    startDate: z.string().optional(),
    updatedFields: z.array(z.string())
});

const BracketChangedPayloadSchema = z.object({
    tournamentId: z.number().int().positive(),
    bracket: z.unknown(), // JSON structure
    round: z.number().int().positive(),
    updatedAt: z.number().int().positive()
});

const LobbyUpdatedPayloadSchema = z.object({
    lobbyId: z.string(),
    tournamentId: z.number().int().positive(),
    participants: z.array(z.object({
        userId: z.number().int().positive(),
        username: z.string(),
        role: z.enum(['player', 'spectator']).optional(),
        joinedAt: z.number().int().positive()
    })),
    capacity: z.number().int().positive(),
    status: z.enum(['waiting', 'ready', 'in_progress', 'closed'])
});

// ==========================================
// EVENT BUILDERS
// ==========================================

/**
 * Create base event structure with auto-generated ID
 * ✅ Source is enforced by publisher. Do NOT override from payload/metadata.
 */
const createBaseEvent = (type, source = EVENT_SOURCES.BACKEND) => ({
    id: uuidv4(),
    version: EVENT_VERSION,
    type,
    timestamp: Date.now(),
    source: EVENT_SOURCES.BACKEND, // ✅ Hard-set to prevent spoofing
    metadata: {}
});

/**
 * Build MATCH_COMPLETED event
 */
const buildMatchCompletedEvent = (payload, metadata = {}) => {
    const event = createBaseEvent(EVENT_TYPES.MATCH_COMPLETED);
    return {
        ...event,
        payload: MatchCompletedPayloadSchema.parse(payload),
        metadata
    };
};

/**
 * Build TOURNAMENT_UPDATED event
 */
const buildTournamentUpdatedEvent = (payload, metadata = {}) => {
    const event = createBaseEvent(EVENT_TYPES.TOURNAMENT_UPDATED);
    return {
        ...event,
        payload: TournamentUpdatedPayloadSchema.parse(payload),
        metadata
    };
};

/**
 * Build BRACKET_CHANGED event
 */
const buildBracketChangedEvent = (payload, metadata = {}) => {
    const event = createBaseEvent(EVENT_TYPES.BRACKET_CHANGED);
    return {
        ...event,
        payload: BracketChangedPayloadSchema.parse(payload),
        metadata
    };
};

/**
 * Build LOBBY_UPDATED event
 */
const buildLobbyUpdatedEvent = (payload, metadata = {}) => {
    const event = createBaseEvent(EVENT_TYPES.LOBBY_UPDATED);
    return {
        ...event,
        payload: LobbyUpdatedPayloadSchema.parse(payload),
        metadata
    };
};

/**
 * Validate any event against base schema
 */
const validateEvent = (event) => {
    return BaseEventSchema.parse(event);
};

// ✅ FIX: Freeze constants to prevent mutation bugs
Object.freeze(EVENT_TYPES);
Object.freeze(EVENT_SOURCES);
Object.freeze(EVENT_CHANNELS);
Object.freeze(FIREBASE_PATHS);

module.exports = {
    EVENT_VERSION,
    EVENT_SOURCES,
    EVENT_TYPES,
    EVENT_CHANNELS,
    FIREBASE_PATHS,

    // Schemas
    BaseEventSchema,
    MatchCompletedPayloadSchema,
    TournamentUpdatedPayloadSchema,
    BracketChangedPayloadSchema,
    LobbyUpdatedPayloadSchema,

    // Builders
    buildMatchCompletedEvent,
    buildTournamentUpdatedEvent,
    buildBracketChangedEvent,
    buildLobbyUpdatedEvent,
    validateEvent
};
