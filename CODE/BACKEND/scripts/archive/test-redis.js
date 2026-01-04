/**
 * Redis Connection Test Script
 * Tests basic Redis connectivity and operations
 */

require('dotenv').config();
const { createRedisClient, checkRedisHealth, closeRedis, getRedisClient, setCache, getCache, deleteCache } = require('./src/config/redis.config');

// Test configuration
const TEST_PREFIX = 'infra:test:redis';
const TEST_TTL_SECONDS = 30;

async function testRedis() {
    console.log('💾 Testing Redis Connection...\n');
    let exitCode = 0;

    try {
        // 1. Initialize Redis
        console.log('1️⃣ Initializing Redis client...');
        const startInit = Date.now();
        await createRedisClient();
        console.log(`✅ Redis client created (${Date.now() - startInit}ms)\n`);

        // 2. Get Redis server info
        console.log('2️⃣ Fetching Redis server info...');
        const client = getRedisClient();
        const info = await client.info('server');
        const versionMatch = info.match(/redis_version:([^\r\n]+)/);
        if (versionMatch) {
            console.log(`✅ Redis version: ${versionMatch[1]}\n`);
        }

        // 3. Check health
        console.log('3️⃣ Checking Redis health...');
        const health = await checkRedisHealth();
        console.log('Health Status:', health);
        console.log('');

        // ✅ FIX: Better health validation
        if (!health || health.status !== 'connected') {
            throw new Error(`Redis unhealthy: ${JSON.stringify(health)}`);
        }

        // 4. Test SET operation with latency measurement
        console.log('4️⃣ Testing SET operation...');
        const testKey = `${TEST_PREFIX}:connection`;
        const testValue = {
            timestamp: new Date().toISOString(),
            message: 'Redis connection test',
            status: 'success'
        };
        const startSet = Date.now();
        await setCache(testKey, testValue, TEST_TTL_SECONDS);
        const setLatency = Date.now() - startSet;
        console.log(`✅ SET successful (latency: ${setLatency}ms)\n`);

        // 5. Test GET operation with latency measurement
        console.log('5️⃣ Testing GET operation...');
        const startGet = Date.now();
        const retrievedValue = await getCache(testKey);
        const getLatency = Date.now() - startGet;
        console.log('Retrieved data:', retrievedValue);
        console.log(`✅ GET successful (latency: ${getLatency}ms)\n`);

        // Verify data integrity
        if (JSON.stringify(retrievedValue) !== JSON.stringify(testValue)) {
            throw new Error('Data integrity check failed: retrieved value does not match');
        }

        // 6. Test direct Redis commands
        console.log('6️⃣ Testing direct Redis commands...');
        const directKey = `${TEST_PREFIX}:direct`;
        await client.set(directKey, 'direct value');
        const directValue = await client.get(directKey);
        console.log('Direct command result:', directValue);
        console.log('✅ Direct commands successful\n');

        // 7. Test TTL
        console.log('7️⃣ Testing TTL...');
        const ttl = await client.ttl(testKey);
        console.log(`TTL for ${testKey}: ${ttl} seconds (expected: ~${TEST_TTL_SECONDS}s)`);

        if (ttl <= 0 || ttl > TEST_TTL_SECONDS) {
            throw new Error(`TTL validation failed: ${ttl} (expected 0 < ttl <= ${TEST_TTL_SECONDS})`);
        }
        console.log('✅ TTL check successful\n');

        // 8. Test SET with NX (set if not exists)
        console.log('8️⃣ Testing SET with NX (set if not exists)...');
        const exclusiveKey = `${TEST_PREFIX}:exclusive`;
        const set1 = await client.set(exclusiveKey, 'value1', { NX: true });
        const set2 = await client.set(exclusiveKey, 'value2', { NX: true });
        console.log(`First SET NX: ${set1}, Second SET NX: ${set2}`);

        if (set1 !== 'OK' || set2 !== null) {
            throw new Error('NX flag behavior incorrect');
        }
        console.log('✅ NX flag working correctly\n');

        // 9. Cleanup
        console.log('9️⃣ Cleaning up test data...');
        await deleteCache(testKey);
        await client.del(directKey, exclusiveKey);
        console.log('✅ Cleanup successful\n');

        // 10. Performance summary
        console.log('📊 Performance Summary:');
        console.log(`   - SET latency: ${setLatency}ms`);
        console.log(`   - GET latency: ${getLatency}ms`);
        console.log('');

        console.log('🎉 All Redis tests passed!\n');

    } catch (error) {
        console.error('❌ Redis test failed:', error.message);
        console.error(error.stack);
        exitCode = 1;
    } finally {
        // ✅ FIX: Single exit point, let Node exit naturally after cleanup
        await closeRedis();
        console.log('🔌 Connection closed');

        if (exitCode !== 0) {
            process.exit(exitCode);
        }
    }
}

// Run tests
testRedis();
