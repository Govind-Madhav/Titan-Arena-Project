/**
 * Event Publisher
 * Publishes events to Redis Pub/Sub channels
 * 
 * Validation happens HERE (backend layer)
 */

const { getRedisClient } = require('../config/redis.config');
const {
    EVENT_CHANNELS,
    validateEvent,
    buildMatchCompletedEvent,
    buildTournamentUpdatedEvent,
    buildBracketChangedEvent,
    buildLobbyUpdatedEvent
} = require('./event.schemas');

/**
 * Publish event to Redis channel
 * ✅ VALIDATION: Required at publisher
 * 
 * @param {string} eventType - Event type constant
 * @param {object} payload - Event payload
 * @param {object} metadata - Optional metadata (userId, requestId)
 * @returns {Promise<string>} Event ID (for tracking/logging)
 */
const publishEvent = async (eventType, payload, metadata = {}) => {
    try {
        // Build event using appropriate builder
        let event;
        switch (eventType) {
            case 'MATCH_COMPLETED':
                event = buildMatchCompletedEvent(payload, metadata);
                break;
            case 'TOURNAMENT_UPDATED':
                event = buildTournamentUpdatedEvent(payload, metadata);
                break;
            case 'BRACKET_CHANGED':
                event = buildBracketChangedEvent(payload, metadata);
                break;
            case 'LOBBY_UPDATED':
                event = buildLobbyUpdatedEvent(payload, metadata);
                break;
            default:
                throw new Error(`Unknown event type: ${eventType}`);
        }

        // ✅ Validate event structure
        const validatedEvent = validateEvent(event);

        // Get channel for event type
        const channel = EVENT_CHANNELS[eventType];
        if (!channel) {
            throw new Error(`No channel mapped for event type: ${eventType}`);
        }

        // Publish to Redis
        const client = getRedisClient();
        const subscribers = await client.publish(channel, JSON.stringify(validatedEvent));

        console.log(`📤 Published event ${validatedEvent.id} to ${channel} (${subscribers} subscribers)`);

        return validatedEvent.id;
    } catch (error) {
        console.error(`❌ Failed to publish event ${eventType}:`, error.message);
        throw error;
    }
};

/**
 * Publish match completion event
 * Convenience wrapper
 */
const publishMatchCompleted = async (matchData, metadata = {}) => {
    return publishEvent('MATCH_COMPLETED', matchData, metadata);
};

/**
 * Publish tournament update event
 * Convenience wrapper
 */
const publishTournamentUpdated = async (tournamentData, metadata = {}) => {
    return publishEvent('TOURNAMENT_UPDATED', tournamentData, metadata);
};

/**
 * Publish bracket change event
 * Convenience wrapper
 */
const publishBracketChanged = async (bracketData, metadata = {}) => {
    return publishEvent('BRACKET_CHANGED', bracketData, metadata);
};

/**
 * Publish lobby update event
 * Convenience wrapper
 */
const publishLobbyUpdated = async (lobbyData, metadata = {}) => {
    return publishEvent('LOBBY_UPDATED', lobbyData, metadata);
};

module.exports = {
    publishEvent,
    publishMatchCompleted,
    publishTournamentUpdated,
    publishBracketChanged,
    publishLobbyUpdated
};
