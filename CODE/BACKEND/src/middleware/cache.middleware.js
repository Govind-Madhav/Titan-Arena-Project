/**
 * Redis Caching Middleware (Production-Hardened)
 * Automatically cache API responses to improve performance
 * 
 * ⚠️  SECURITY WARNING:
 * DO NOT use for: wallets, auth, admin, or any money-related endpoints
 * DO use for: public listings, leaderboards, match results, public profiles
 * 
 * OPERATIONAL FIXES:
 * ✅ Query param normalization (prevents cache fragmentation)
 * ✅ Enforced user scoping for authenticated routes
 * ✅ Structured JSON logging (machine-parseable)
 * ✅ Multiple response method coverage (json, send, end)
 * ✅ Runtime guard rails (blocks wallet/payment routes)
 */

const { getCache, setCache, getRedisClient } = require('../config/redis.config');

/**
 * Normalize query parameters to prevent cache key fragmentation
 * ✅ FIX: /api/tournaments?page=1&sort=asc === /api/tournaments?sort=asc&page=1
 */
const normalizeQuery = (query) => {
    if (!query || Object.keys(query).length === 0) return '';

    // Sort keys alphabetically
    const sortedKeys = Object.keys(query).sort();
    const params = sortedKeys.map(key => `${key}=${query[key]}`).join('&');
    return `?${params}`;
};

/**
 * Structured logging helper
 * ✅ FIX: Machine-friendly for alerts/dashboards/SREs
 */
const log = (level, event, metadata = {}) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        event,
        component: 'cache-middleware',
        ...metadata
    };

    if (process.env.NODE_ENV === 'production') {
        console.log(JSON.stringify(logEntry));
    } else {
        // Human-friendly in dev
        const emoji = { info: '💾', warn: '⚠️', error: '❌', hit: '✅', miss: '❌' }[level] || 'ℹ️';
        console.log(`${emoji} ${event}`, metadata);
    }
};

/**
 * Cache middleware factory
 * @param {number} ttlSeconds - Time to live in seconds (default: 5 minutes)
 * @param {function} keyGenerator - Custom key generator function (optional)
 * @param {object} options - Additional options
 * @param {boolean} options.includeUserId - Whether to include user ID in cache key (default: false)
 * @param {boolean} options.stampedeLock - Enable cache stampede protection (default: true)
 */
const cacheMiddleware = (ttlSeconds = 300, keyGenerator = null, options = {}) => {
    const { includeUserId = false, stampedeLock = true } = options;

    return async (req, res, next) => {
        // Skip caching for non-GET requests
        if (req.method !== 'GET') {
            return next();
        }

        try {
            // ✅ FIX: Generate cache key with normalized query params
            let cacheKey;
            if (keyGenerator) {
                cacheKey = keyGenerator(req);
            } else {
                const namespace = 'cache';
                const userId = includeUserId && req.user?.id ? req.user.id : 'public';

                // ✅ FIX: Normalize query params to prevent fragmentation
                const pathname = req.path || req.url.split('?')[0];
                const normalizedQuery = normalizeQuery(req.query);
                const route = pathname + normalizedQuery;

                cacheKey = `${namespace}:${userId}:${route}`;

                // ✅ FIX: ENFORCE user scoping for authenticated routes
                if (req.user && !includeUserId && !keyGenerator) {
                    throw new Error('Refusing to cache authenticated request without user scoping. Set includeUserId:true or use custom keyGenerator.');
                }

                // ✅ FIX: Guard rails - enforce safety at runtime
                if (includeUserId && !req.user) {
                    throw new Error('User-scoped cache requires authenticated user. Add authMiddleware before cacheMiddleware.');
                }

                // Warn on admin routes without custom keys
                if (route.includes('/admin') && !keyGenerator) {
                    log('warn', 'ADMIN_ROUTE_WITHOUT_CUSTOM_KEY', { route });
                }

                // ✅ FIX: Block wallet/payment routes entirely
                if (route.includes('/wallet') || route.includes('/payment')) {
                    throw new Error('Wallet/payment routes MUST NOT use cacheMiddleware (security risk)');
                }
            }

            // Try to get cached response
            const cachedData = await getCache(cacheKey);

            if (cachedData) {
                log('hit', 'CACHE_HIT', { key: cacheKey });
                res.set('X-Cache', 'HIT');
                res.set('X-Cache-Key', cacheKey);
                return res.json(cachedData);
            }

            log('miss', 'CACHE_MISS', { key: cacheKey });
            res.set('X-Cache', 'MISS');

            // ✅ FIX: Cache stampede protection with better lock handling
            let lockAcquired = false;
            if (stampedeLock) {
                const lockKey = `${cacheKey}:lock`;
                const client = getRedisClient();

                // Try to acquire lock (2 second TTL as safety net)
                lockAcquired = await client.set(lockKey, '1', { NX: true, EX: 2 });

                if (!lockAcquired) {
                    log('info', 'CACHE_LOCK_ACTIVE', { key: lockKey });
                    return next();
                }
            }

            // ✅ FIX: Override multiple response methods (not just res.json)
            const originalJson = res.json.bind(res);
            const originalSend = res.send.bind(res);
            const originalEnd = res.end.bind(res);

            // Shared cache write logic
            const cacheResponse = async (data) => {
                try {
                    await setCache(cacheKey, data, ttlSeconds);
                    log('info', 'CACHE_WRITE', { key: cacheKey, ttl: ttlSeconds });
                } catch (err) {
                    log('error', 'CACHE_WRITE_ERROR', { key: cacheKey, error: err.message });
                } finally {
                    // ✅ FIX: Release lock in finally (even if cache write fails)
                    if (stampedeLock && lockAcquired) {
                        try {
                            const client = getRedisClient();
                            await client.del(`${cacheKey}:lock`);
                        } catch (err) {
                            log('error', 'LOCK_RELEASE_ERROR', { key: cacheKey, error: err.message });
                        }
                    }
                }
            };

            // Override res.json
            res.json = function (data) {
                cacheResponse(data); // Non-blocking
                res.json = originalJson;
                return originalJson.call(this, data);
            };

            // Override res.send (covers more controller patterns)
            res.send = function (data) {
                // Only cache JSON data
                if (typeof data === 'object') {
                    cacheResponse(data);
                }
                res.send = originalSend;
                return originalSend.call(this, data);
            };

            // Override res.end (safety net)
            res.end = function (data) {
                res.end = originalEnd;
                return originalEnd.call(this, data);
            };

            next();
        } catch (error) {
            // If caching fails, continue without caching
            log('error', 'CACHE_MIDDLEWARE_ERROR', { error: error.message });
            next();
        }
    };
};

/**
 * Cache invalidation middleware
 * Invalidate cache when data is modified
 * 
 * @param {string} pattern - Namespaced pattern (e.g., 'cache:public:/api/tournaments/*')
 * ⚠️  WARNING: Pattern-based invalidation is a temporary crutch
 * Event-driven versioned keys are safer long-term
 */
const invalidateCache = (pattern) => {
    return async (req, res, next) => {
        // Validate pattern is namespaced
        if (pattern === '*' || pattern === 'cache:*') {
            log('warn', 'UNSAFE_INVALIDATION_BLOCKED', { pattern });
            return next();
        }

        // ✅ FIX: Override multiple response methods
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        const invalidatePattern = async () => {
            const statusCode = res.statusCode || 200;
            if (statusCode >= 200 && statusCode < 300) {
                try {
                    const { deleteCachePattern } = require('../config/redis.config');
                    const deletedCount = await deleteCachePattern(pattern);
                    log('info', 'CACHE_INVALIDATED', { pattern, count: deletedCount });
                } catch (error) {
                    log('error', 'CACHE_INVALIDATION_ERROR', { pattern, error: error.message });
                }
            }
        };

        // Override res.json
        res.json = async function (data) {
            await invalidatePattern();
            res.json = originalJson;
            return originalJson.call(this, data);
        };

        // Override res.send
        res.send = async function (data) {
            await invalidatePattern();
            res.send = originalSend;
            return originalSend.call(this, data);
        };

        next();
    };
};

/**
 * Helper: Generate namespaced cache key
 * Use this for consistent key structure across the app
 * 
 * @param {string} resource - Resource type (e.g., 'tournament', 'user', 'leaderboard')
 * @param {string|number} id - Resource ID
 * @param {string} suffix - Optional suffix (e.g., 'details', 'stats')
 */
const generateCacheKey = (resource, id, suffix = '') => {
    const parts = ['cache', resource, id];
    if (suffix) parts.push(suffix);
    return parts.join(':');
};

/**
 * Helper: Generate invalidation pattern
 * Use this to safely invalidate resource-specific caches
 * 
 * @param {string} resource - Resource type
 * @param {string|number} id - Resource ID (or '*' for all resources of this type)
 */
const generateInvalidationPattern = (resource, id = '*') => {
    return `cache:*:*/${resource}/${id}*`;
};

module.exports = {
    cacheMiddleware,
    invalidateCache,
    generateCacheKey,
    generateInvalidationPattern
};
