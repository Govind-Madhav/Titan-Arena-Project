/**
 * Initialize UID Counters for all regions
 * 
 * ⚠️ DO NOT RUN IN PRODUCTION AFTER USERS EXIST
 * This script initializes UID counters and must only be used:
 * - On fresh installations
 * - During controlled migrations with full backups
 * 
 * Running this after users exist can break UID continuity.
 */

require('dotenv').config();
const { db } = require('../src/db');
const { sql } = require('drizzle-orm');
const { REGIONS } = require('../src/config/regions.config');

async function initUidCounters() {
    console.log('🔧 Initializing UID counters...\n');

    // Safety warning
    console.warn('⚠️  WARNING: This script must ONLY be run on a fresh system.');
    console.warn('⚠️  Running this after users exist can break UID continuity.\n');

    try {
        // Insert counters for all 6 regions (idempotent)
        await db.execute(sql`
            INSERT INTO uid_counters (region, \`last_value\`) VALUES
            (1, 0),  -- Asia
            (2, 0),  -- Europe
            (3, 0),  -- Africa
            (4, 0),  -- North America
            (5, 0),  -- South America
            (6, 0)   -- Oceania
            ON DUPLICATE KEY UPDATE region = region
        `);

        console.log('✅ UID counters initialized for all regions\n');

        // Verify
        const result = await db.execute(sql`SELECT region, \`last_value\` FROM uid_counters ORDER BY region`);
        const rows = Array.isArray(result[0]) ? result[0] : result;

        console.log('📊 Current counter values:');
        rows.forEach(row => {
            const regionName = Object.values(REGIONS).find(r => r.code === row.region)?.name || 'Unknown';
            console.log(`   Region ${row.region} (${regionName}): ${row.last_value}`);
        });

        console.log('\n✅ Initialization complete!');

    } catch (error) {
        console.error('❌ Error initializing counters:', error.message);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

initUidCounters();
