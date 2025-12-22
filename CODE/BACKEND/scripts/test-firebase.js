/**
 * Firebase Connection Test Script
 * Tests basic Firebase connectivity and operations
 */

require('dotenv').config();
const { initializeFirebase, checkFirebaseHealth, closeFirebase, getDatabase } = require('./src/config/firebase.config');

// Test configuration
const TEST_PREFIX = 'infra/test/firebase';

async function testFirebase() {
    console.log('🔥 Testing Firebase Connection...\n');
    let exitCode = 0;

    try {
        // 1. Initialize Firebase
        console.log('1️⃣ Initializing Firebase...');
        const startInit = Date.now();
        initializeFirebase();
        console.log(`✅ Firebase initialized (${Date.now() - startInit}ms)\n`);

        // 2. Check health (write verification)
        console.log('2️⃣ Checking Firebase health (write-verification)...');
        const health = await checkFirebaseHealth();
        console.log('Health Status:', health);
        console.log('');

        // ✅ Better health validation
        if (!health || health.status !== 'connected') {
            throw new Error(`Firebase unhealthy: ${JSON.stringify(health)}`);
        }

        // 3. Test write operation with latency
        console.log('3️⃣ Testing WRITE operation...');
        const db = getDatabase();
        const testRef = db.ref(`${TEST_PREFIX}/connection`);
        const testData = {
            timestamp: new Date().toISOString(),
            message: 'Firebase connection test',
            status: 'success'
        };

        const startWrite = Date.now();
        await testRef.set(testData);
        const writeLatency = Date.now() - startWrite;
        console.log(`✅ Write successful (latency: ${writeLatency}ms)\n`);

        // 4. Test read operation with latency
        console.log('4️⃣ Testing READ operation...');
        const startRead = Date.now();
        const snapshot = await testRef.once('value');
        const data = snapshot.val();
        const readLatency = Date.now() - startRead;
        console.log('Read data:', data);
        console.log(`✅ Read successful (latency: ${readLatency}ms)\n`);

        // Verify data integrity
        if (JSON.stringify(data) !== JSON.stringify(testData)) {
            throw new Error('Data integrity check failed');
        }

        // 5. Test update operation
        console.log('5️⃣ Testing UPDATE operation...');
        await testRef.update({ updated: true, updateTime: new Date().toISOString() });
        const updatedSnapshot = await testRef.once('value');
        const updatedData = updatedSnapshot.val();

        if (!updatedData.updated) {
            throw new Error('Update operation failed');
        }
        console.log('✅ Update successful\n');

        // 6. Test transaction
        console.log('6️⃣ Testing TRANSACTION (atomic counter)...');
        const counterRef = db.ref(`${TEST_PREFIX}/counter`);
        await counterRef.set(0);

        const result = await counterRef.transaction((current) => {
            return (current || 0) + 1;
        });

        console.log('Transaction result:', result.snapshot.val());
        if (result.snapshot.val() !== 1) {
            throw new Error('Transaction failed');
        }
        console.log('✅ Transaction successful\n');

        // 7. Cleanup
        console.log('7️⃣ Cleaning up test data...');
        await db.ref(TEST_PREFIX).remove();
        console.log('✅ Cleanup successful\n');

        // 8. Performance summary
        console.log('📊 Performance Summary:');
        console.log(`   - Write latency: ${writeLatency}ms`);
        console.log(`   - Read latency: ${readLatency}ms`);
        console.log('');

        console.log('🎉 All Firebase tests passed!\n');

    } catch (error) {
        console.error('❌ Firebase test failed:', error.message);
        console.error(error.stack);
        exitCode = 1;
    } finally {
        // ✅ Single exit point
        await closeFirebase();
        console.log('🔌 Connection closed');

        if (exitCode !== 0) {
            process.exit(exitCode);
        }
    }
}

// Run tests
testFirebase();
