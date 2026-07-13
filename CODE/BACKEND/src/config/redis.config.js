/**
 * Redis Configuration
 * Used for caching API responses, session management, and rate limiting
 */

const redis = require('redis');

let redisClient = null;
let isConnected = false;
const memoryStore = new Map();

const now = () => Date.now();

const setMemoryEntry = (key, value, ttlSeconds) => {
    const expiresAt = Number.isFinite(ttlSeconds) && ttlSeconds > 0
        ? now() + (ttlSeconds * 1000)
        : null;

    memoryStore.set(key, {
        value,
        expiresAt
    });
};

const getMemoryEntry = (key) => {
    const entry = memoryStore.get(key);
    if (!entry) return null;

    if (entry.expiresAt && entry.expiresAt <= now()) {
        memoryStore.delete(key);
        return null;
    }

    return entry;
};

const createMemoryClient = () => ({
    isMock: true,
    async get(key) {
        const entry = getMemoryEntry(key);
        return entry ? entry.value : null;
    },
    async set(key, value, options = {}) {
        const ttl = Number.isFinite(options.EX) ? Number(options.EX) : null;
        setMemoryEntry(key, value, ttl);
        return 'OK';
    },
    async setEx(key, ttlSeconds, value) {
        setMemoryEntry(key, value, ttlSeconds);
        return 'OK';
    },
    async del(keys) {
        const keyList = Array.isArray(keys) ? keys : [keys];
        let removed = 0;
        for (const key of keyList) {
            if (memoryStore.delete(key)) removed += 1;
        }
        return removed;
    },
    async keys(pattern) {
        const regex = new RegExp(`^${String(pattern).replaceAll('*', '.*')}$`);
        const matches = [];
        for (const key of memoryStore.keys()) {
            if (getMemoryEntry(key) && regex.test(key)) {
                matches.push(key);
            }
        }
        return matches;
    },
    async ttl(key) {
        const entry = getMemoryEntry(key);
        if (!entry) return -2;
        if (!entry.expiresAt) return -1;
        return Math.max(0, Math.ceil((entry.expiresAt - now()) / 1000));
    },
    async ping() {
        return 'PONG';
    },
    async quit() {
        return 'OK';
    },
    async disconnect() {
        return 'OK';
    },
    async subscribe() {
        return undefined;
    },
    async unsubscribe() {
        return undefined;
    }
});

/**
 * Create and configure Redis client
 */
const createRedisClient = async () => {
    try {
        if (redisClient && isConnected) {
            console.log('✅ Redis client already connected');
            return redisClient;
        }

        const client = redis.createClient({
            socket: {
                host: process.env.REDIS_HOST || 'localhost',
                port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
                reconnectStrategy: () => new Error('Redis unavailable')
            },
            // No password for local development
            password: process.env.REDIS_PASSWORD || undefined
        });

        // Event listeners
        client.on('connect', () => {
            console.log('🔗 Redis: Connecting...');
        });

        client.on('ready', () => {
            console.log('✅ Redis: Connected and ready');
            isConnected = true;
        });

        client.on('error', (err) => {
            console.error('❌ Redis error:', err.message);
            isConnected = false;
        });

        client.on('reconnecting', () => {
            console.log('🔄 Redis: Reconnecting...');
            isConnected = false;
        });

        client.on('end', () => {
            console.log('🔌 Redis: Connection closed');
            isConnected = false;
        });

        // Connect to Redis
        await client.connect();

        redisClient = client;
        return client;
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn('⚠️ Redis: Connection failed. Falling back to Memory Mode for development.');
            redisClient = createMemoryClient();
            isConnected = true; // Set to true so getRedisClient doesn't throw
            return redisClient;
        }
        console.error('❌ Failed to connect to Redis:', error.message);
        isConnected = false;
        throw error;
    }
};

/**
 * Get Redis client instance
 */
const getRedisClient = () => {
    if (!redisClient || !isConnected) {
        throw new Error('Redis client not initialized. Call createRedisClient() first.');
    }
    return redisClient;
};

/**
 * Health check for Redis
 */
const checkRedisHealth = async () => {
    try {
        if (!redisClient || !isConnected) {
            return {
                status: 'disconnected',
                message: 'Redis not connected'
            };
        }

        const pingResponse = await redisClient.ping();
        return {
            status: 'connected',
            message: 'Redis is healthy',
            ping: pingResponse,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        };
    }
};

/**
 * Cache helper - Get value
 */
const getCache = async (key) => {
    try {
        const client = getRedisClient();
        const value = await client.get(key);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        console.error(`Redis GET error for key "${key}":`, error.message);
        return null;
    }
};

/**
 * Cache helper - Set value with TTL
 */
const setCache = async (key, value, ttlSeconds = 300) => {
    try {
        const client = getRedisClient();
        await client.setEx(key, ttlSeconds, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`Redis SET error for key "${key}":`, error.message);
        return false;
    }
};

/**
 * Cache helper - Delete key
 */
const deleteCache = async (key) => {
    try {
        const client = getRedisClient();
        await client.del(key);
        return true;
    } catch (error) {
        console.error(`Redis DEL error for key "${key}":`, error.message);
        return false;
    }
};

/**
 * Cache helper - Delete keys by pattern
 */
const deleteCachePattern = async (pattern) => {
    try {
        const client = getRedisClient();
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
            await client.del(keys);
            return keys.length;
        }
        return 0;
    } catch (error) {
        console.error(`Redis DEL pattern error for "${pattern}":`, error.message);
        return 0;
    }
};

/**
 * Graceful shutdown
 */
const closeRedis = async () => {
    try {
        if (redisClient) {
            await redisClient.quit();
            redisClient = null;
            isConnected = false;
            console.log('🔌 Redis connection closed gracefully');
        }
    } catch (error) {
        console.error('❌ Error closing Redis:', error.message);
        if (redisClient) {
            await redisClient.disconnect();
            redisClient = null;
            isConnected = false;
        }
    }
};

module.exports = {
    createRedisClient,
    getRedisClient,
    checkRedisHealth,
    getCache,
    setCache,
    deleteCache,
    deleteCachePattern,
    closeRedis
};
