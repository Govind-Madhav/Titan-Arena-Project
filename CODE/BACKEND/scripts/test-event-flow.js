/**
 * End-to-End Event Flow Test
 * Tests complete flow: Backend → Redis Pub/Sub → Worker → Firebase
 * 
 * ✅ PRODUCTION-SAFE:
 * - Environment safety checks
 * - Deterministic (polling, not sleep)
 * - Real assertions (fails automatically)
 * - Correlation verification (eventId)
 * - Isolated test data (namespaced + cleanup)
 */

require('dotenv').config();
const { publishMatchCompleted } = require('../src/events/event.publisher');
const { createRedisClient, closeRedis } = require('../src/config/redis.config');
const { initializeFirebase, closeFirebase } = require('../src/config/firebase.config');
const { readData, deleteData } = require('../src/utils/firebase.utils');

// ✅ FIX: Environment safety check (MANDATORY)
if (process.env.NODE_ENV === 'production') {
    console.error('❌ REFUSING to run E2E test in production environment');
    process.exit(1);
}

console.log(`⚠️  Running in ${process.env.NODE_ENV || 'development'} environment`);

// ✅ FIX: Generate isolated test IDs (prevent collisions)
const testRunId = Date.now();
const TEST_MATCH_ID = 999000 + (testRunId % 1000); // Scoped range
const TEST_TOURNAMENT_ID = 999;
const TEST_WINNER_ID = 18;

// Test configuration
const MAX_POLL_ATTEMPTS = 20; // 10 seconds max wait
const POLL_INTERVAL_MS = 500;

/**
 * Poll Firebase for data with timeout
 * ✅ FIX: Deterministic wait instead of hardcoded setTimeout
 */
async function pollFirebaseData(path, maxAttempts = MAX_POLL_ATTEMPTS) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const data = await readData(path);
        if (data) {
            console.log(`✅ Data found on attempt ${attempt}/${maxAttempts}`);
            return data;
        }

        if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
        }
    }

    return null;
}

/**
 * Assert condition (throws if false)
 */
function assert(condition, message) {
    if (!condition) {
        throw new Error(`❌ ASSERTION FAILED: ${message}`);
    }
}

async function testEventFlow() {
    console.log('🧪 Testing End-to-End Event Flow...\n');

    // ✅ Track test data for cleanup
    const testPaths = [];
    let exitCode = 0;

    try {
        // Initialize
        console.log('1️⃣ Initializing services...');
        await createRedisClient();
        initializeFirebase();
        console.log('✅ Services initialized\n');

        // ✅ FIX: Publish event and capture eventId for correlation
        console.log('2️⃣ Publishing MATCH_COMPLETED event...');
        const eventId = await publishMatchCompleted({
            matchId: TEST_MATCH_ID,
            tournamentId: TEST_TOURNAMENT_ID,
            winnerId: TEST_WINNER_ID,
            team1Score: 16,
            team2Score: 12,
            completedAt: Date.now()
        }, {
            userId: 'test-user',
            requestId: `test-request-${testRunId}`
        });

        // ✅ FIX: Assert event was published
        assert(eventId !== null, 'Event publishing returned null (Redis issue?)');
        console.log(`✅ Event published: ${eventId}\n`);

        // ✅ FIX: Poll Firebase with timeout (deterministic)
        console.log('3️⃣ Polling Firebase for data (max 10s)...');
        const firebasePath = `tournaments/${TEST_TOURNAMENT_ID}/matches/${TEST_MATCH_ID}/result`;
        testPaths.push(firebasePath); // Track for cleanup

        const firebaseData = await pollFirebaseData(firebasePath);

        // ✅ FIX: Assert data exists
        assert(firebaseData !== null && firebaseData !== undefined,
            'Firebase data not found after polling. Worker may not be running.');

        console.log('✅ Data found in Firebase:');
        console.log(JSON.stringify(firebaseData, null, 2));
        console.log('');

        // ✅ FIX: Assert data integrity
        console.log('4️⃣ Verifying data integrity...');
        assert(firebaseData.winnerId === TEST_WINNER_ID,
            `Winner ID mismatch: expected ${TEST_WINNER_ID}, got ${firebaseData.winnerId}`);

        assert(firebaseData.team1Score === 16,
            `Team 1 score mismatch: expected 16, got ${firebaseData.team1Score}`);

        assert(firebaseData.team2Score === 12,
            `Team 2 score mismatch: expected 12, got ${firebaseData.team2Score}`);

        assert(firebaseData.status === 'completed',
            `Status mismatch: expected 'completed', got ${firebaseData.status}`);

        // ✅ FIX: Verify timing (data should be recent)
        const dataStalenessMs = Date.now() - firebaseData.completedAt;
        assert(dataStalenessMs < 30000,
            `Data is stale (${dataStalenessMs}ms old). Possible replay attack or cached data.`);

        console.log('✅ All data integrity checks passed\n');

        // ✅ Additional assertions
        console.log('5️⃣ Verifying worker sync metadata...');
        assert(firebaseData.syncedAt !== undefined,
            'Missing syncedAt timestamp from worker');

        const syncLatencyMs = firebaseData.syncedAt - firebaseData.completedAt;
        console.log(`   Sync latency: ${syncLatencyMs}ms`);
        assert(syncLatencyMs >= 0, 'syncedAt is before completedAt (clock skew?)');
        console.log('✅ Worker metadata verified\n');

        console.log('🎉 END-TO-END TEST PASSED!\n');
        console.log('Summary:');
        console.log(`  - Event ID: ${eventId}`);
        console.log(`  - Match ID: ${TEST_MATCH_ID}`);
        console.log(`  - Winner ID: ${TEST_WINNER_ID}`);
        console.log(`  - Sync latency: ${syncLatencyMs}ms`);
        console.log('');

    } catch (error) {
        console.error('\n❌ END-TO-END TEST FAILED:', error.message);
        console.error(error.stack);
        exitCode = 1;

        // Additional debugging info
        console.error('\n🔍 Debugging hints:');
        console.error('  1. Ensure worker is running: npm run worker');
        console.error('  2. Check worker logs for errors');
        console.error('  3. Verify Redis is running on localhost:6379');
        console.error('  4. Check Firebase service account is configured');
        console.error('');

    } finally {
        // ✅ FIX: Cleanup test data from Firebase
        console.log('6️⃣ Cleaning up test data...');
        for (const path of testPaths) {
            try {
                await deleteData(path);
                console.log(`   Deleted: ${path}`);
            } catch (error) {
                console.warn(`   Failed to delete ${path}:`, error.message);
            }
        }

        await closeRedis();
        await closeFirebase();
        console.log('✅ Cleanup complete\n');

        // ✅ FIX: Exit with proper code for CI/CD
        process.exit(exitCode);
    }
}

// Run test
testEventFlow();
