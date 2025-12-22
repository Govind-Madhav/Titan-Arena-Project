/**
 * Event Subscriber
 * Subscribes to Redis Pub/Sub channels and handles events
 * 
 * ✅ VALIDATION: Required at subscriber (worker layer - defensive)
 * ✅ FAULT ISOLATION: Handler failures don't poison system
 * ✅ BACKPRESSURE: Max in-flight events protection
 * ✅ STRUCTURED LOGGING: Machine-parseable JSON logs
 * 
 * IMPORTANT: Handlers MUST implement idempotency
 * Redis Pub/Sub can duplicate/replay events
 */

const { createRedisClient } = require('../config/redis.config');
const { EVENT_TYPES, EVENT_VERSION, validateEvent } = require('./event.schemas');

// ✅ FIX: Backpressure protection
const MAX_CONCURRENT_HANDLERS = 10;
let activeHandlers = 0;

/**
 * Event handler registry
 */
const eventHandlers = new Map();

/**
 * Structured logging helper
 * ✅ FIX: Machine-friendly logs for aggregation/alerting
 */
const log = (level, message, metadata = {}) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        source: 'event-subscriber',
        ...metadata
    };

    if (process.env.NODE_ENV === 'production') {
        console.log(JSON.stringify(logEntry));
    } else {
        // Human-friendly in dev
        const emoji = { info: '📥', warn: '⚠️', error: '❌' }[level] || 'ℹ️';
        console.log(`${emoji} ${message}`, metadata);
    }
};

/**
 * Register event handler
 * @param {string} eventType - Event type to handle
 * @param {function} handler - Async handler function(event)
 */
const registerHandler = (eventType, handler) => {
    if (!eventHandlers.has(eventType)) {
        eventHandlers.set(eventType, []);
    }
    eventHandlers.get(eventType).push(handler);
    log('info', `Registered handler for ${eventType}`);
};

/**
 * Process incoming event
 * ✅ VALIDATION: Required at subscriber (defensive)
 * ✅ VERSION CHECK: Ensures compatibility
 * ✅ BACKPRESSURE: Respects concurrency limits
 */
const processEvent = async (channel, message) => {
    try {
        // Parse event
        const event = JSON.parse(message);

        // ✅ FIX: Validate event version compatibility
        if (event.version !== EVENT_VERSION) {
            log('error', 'Unsupported event version', {
                eventId: event.id,
                eventVersion: event.version,
                supportedVersion: EVENT_VERSION
            });
            return;
        }

        // ✅ Validate event structure (defensive)
        const validatedEvent = validateEvent(event);

        log('info', 'Received event', {
            eventId: validatedEvent.id,
            type: validatedEvent.type,
            timestamp: validatedEvent.timestamp
        });

        // Get handlers for this event type
        const handlers = eventHandlers.get(validatedEvent.type) || [];

        if (handlers.length === 0) {
            log('warn', 'No handlers registered', {
                eventId: validatedEvent.id,
                type: validatedEvent.type
            });
            return;
        }

        // ✅ FIX: Backpressure check
        if (activeHandlers >= MAX_CONCURRENT_HANDLERS) {
            log('warn', 'Backpressure active - skipping event', {
                eventId: validatedEvent.id,
                activeHandlers,
                maxHandlers: MAX_CONCURRENT_HANDLERS
            });
            return;
        }

        // ✅ FIX: Sequential execution instead of Promise.all()
        // Prevents sudden concurrency spikes under load
        for (const handler of handlers) {
            activeHandlers++;
            try {
                await handler(validatedEvent);

                log('info', 'Handler completed successfully', {
                    eventId: validatedEvent.id,
                    type: validatedEvent.type
                });
            } catch (error) {
                // ✅ Fault isolation: one handler failure doesn't kill others
                log('error', 'Handler failed', {
                    eventId: validatedEvent.id,
                    type: validatedEvent.type,
                    error: error.message,
                    stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
                });
                // Don't throw - let other handlers continue
            } finally {
                activeHandlers--;
            }
        }

    } catch (error) {
        log('error', 'Event processing failed', {
            channel,
            error: error.message,
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
        });
    }
};

/**
 * Start event subscriber
 * Creates dedicated Redis client for subscriptions
 * 
 * @returns {Promise<object>} Subscriber instance with stop() method
 */
const startSubscriber = async () => {
    log('info', 'Starting event subscriber...');

    // Create dedicated subscriber client (Redis Pub/Sub requires separate client)
    const subscriber = await createRedisClient();

    // Subscribe to all event channels
    const channels = Object.values(require('./event.schemas').EVENT_CHANNELS);

    for (const channel of channels) {
        // ✅ FIX: Wrap async callback to handle errors properly
        await subscriber.subscribe(channel, async (message) => {
            // Don't await here - Redis callback expects sync
            // Process in background to avoid blocking Redis
            processEvent(channel, message).catch(error => {
                log('error', 'Uncaught error in event processing', {
                    channel,
                    error: error.message
                });
            });
        });

        log('info', `Subscribed to ${channel}`);
    }

    log('info', `Subscriber ready (${channels.length} channels)`);

    // Return control interface
    return {
        stop: async () => {
            log('info', 'Stopping subscriber...');
            await subscriber.unsubscribe();
            await subscriber.quit();
            log('info', 'Subscriber stopped');
        },

        // ✅ Health metrics for monitoring
        getMetrics: () => ({
            activeHandlers,
            maxHandlers: MAX_CONCURRENT_HANDLERS,
            backpressureActive: activeHandlers >= MAX_CONCURRENT_HANDLERS
        })
    };
};

module.exports = {
    registerHandler,
    startSubscriber
};
