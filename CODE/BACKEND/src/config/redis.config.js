/**
 * Redis Configuration
 * Used for caching API responses, session management, and rate limiting
 */

const redis = require('redis');

let redisClient = null;
let isConnected = false;

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
                port: parseInt(process.env.REDIS_PORT || '6379'),
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        console.error('❌ Redis: Max reconnection attempts reached');
                        return new Error('Max reconnection attempts reached');
                    }
                    const delay = Math.min(retries * 100, 3000);
                    console.log(`🔄 Redis: Reconnecting in ${delay}ms...`);
                    return delay;
                }
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
            redisClient = { isMock: true };
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
