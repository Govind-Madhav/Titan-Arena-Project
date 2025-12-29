require('dotenv').config();
const { db } = require('../src/db');
const { sql } = require('drizzle-orm');

async function initializeCounters() {
    console.log('🔢 Initializing UID counters...\n');

    try {
        // Initialize uid_counters for common countries
        const countries = ['IN', 'US', 'GB', 'CA', 'AU', 'SG', 'MY', 'PH', 'ID', 'TH'];
        const currentYear = new Date().getFullYear();

        for (const country of countries) {
            console.log(`   Adding counter for ${country} (${currentYear})...`);
            await db.execute(
                sql.raw(`INSERT IGNORE INTO uid_counters (region_code, year, \`last_value\`) VALUES ('${country}', ${currentYear}, 0)`)
            );
        }

        console.log('\n✅ UID counters initialized successfully!');
        console.log('   You can now create accounts.\n');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error initializing counters:', error);
        process.exit(1);
    }
}

initializeCounters();
