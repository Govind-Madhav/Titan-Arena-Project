/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 */

const { db } = require('../db');
const { uidCounters, users } = require('../db/schema');
const { eq, and, sql } = require('drizzle-orm');
const crypto = require('crypto');

// Macro-regions map
const REGION_MAP = {
    'Asia': '01',
    'Middle East': '02',
    'Europe': '03',
    'North America': '04',
    'South America': '05',
    'Africa': '06',
    'Oceania': '07'
};

// Fallback or country-to-region logic
// Ideally we have a library or map for country -> continent.
// For now, we will handle a simplified map or default.
// Adding a simple helper for demo purposes.
const getRegionCodeForCountry = (country) => {
    // This should be robust. For V1, we might rely on Frontend passing it or a known list.
    // Let's assume input 'country' maps to one of the keys above or we default to '01' (Asia) if unknown for now.
    // In production, use a proper geo-library.
    // Checking if the prompt gave a list of countries... No.
    // Prompt said: "Region is auto-derived from country".

    // Simple mock map for few major countries to demonstrate
    const countryRegionMap = {
        'India': '01', 'China': '01', 'Japan': '01', 'Korea': '01',
        'UAE': '02', 'Saudi Arabia': '02',
        'UK': '03', 'Germany': '03', 'France': '03',
        'USA': '04', 'Canada': '04',
        'Brazil': '05', 'Argentina': '05',
        'South Africa': '06', 'Nigeria': '06',
        'Australia': '07', 'New Zealand': '07'
    };

    return countryRegionMap[country] || '01'; // Defaulting to Asia for safety/fallback
};

class UidService {
    /**
     * Generates a unique Platform UID: CC-RR-YY-SSSS
     * Must be run within a transaction.
     */
    async generatePlatformUid(country, tx) {
        if (!tx) throw new Error('Transaction required for UID generation');

        const regionCode = getRegionCodeForCountry(country);
        const year = new Date().getFullYear() % 100; // Last 2 digits

        // Country Code (CC): "91" for India, etc. 
        // We need a map for this too. "Country calling code" was suggested.
        // Let's use a simple map for now or assume input 'country' includes it?
        // Prompt says "Country (PUBLIC)".
        // Let's assume we maintain a map or the frontend sends a code.
        // For robustness, let's look up CC.
        const countryCallingCode = this.getCallingCode(country);

        // Atomic Increment
        // We use stored procedure logic or just SELECT FOR UPDATE logic.
        // Drizzle specific locking:
        // await tx.execute(sql`SELECT * FROM uid_counters WHERE region_code = ${regionCode} AND year = ${year} FOR UPDATE`);

        // Ensure row exists
        // Upsert is tricky with locking in one go in pure SQL, but we can try insert ignore then select for update.
        // Or just Select.

        // Step 1: Lock & Get
        // MySQL `FOR UPDATE` locks the rows properly.

        // Ensure row exists safely using INSERT IGNORE
        await tx.execute(sql`
            INSERT IGNORE INTO \`uid_counters\` (\`region_code\`, \`year\`, \`last_value\`)
            VALUES (${regionCode}, ${year}, 0)
        `);

        // Now select for update to lock and increment
        // Drizzle raw sql for locking select:
        const [rows] = await tx.execute(sql`
            SELECT \`last_value\` FROM \`uid_counters\` 
            WHERE \`region_code\` = ${regionCode} AND \`year\` = ${year} 
            FOR UPDATE
        `);

        let currentVal = rows[0].last_value;
        const nextVal = currentVal + 1;

        await tx.update(uidCounters)
            .set({ lastValue: nextVal })
            .where(and(eq(uidCounters.regionCode, regionCode), eq(uidCounters.year, year)));

        // Format: CC-RR-YY-SSSS
        const cc = countryCallingCode.toString().padStart(2, '0');
        const rr = regionCode;
        const yy = year.toString().padStart(2, '0');
        const ssss = nextVal.toString().padStart(4, '0');

        return {
            uid: `${cc}-${rr}-${yy}-${ssss}`,
            regionCode
        };
    }

    async generatePublicUsername() {
        // Format: player_<short_random>
        // Collision check loop
        let username;
        let isUnique = false;

        while (!isUnique) {
            const randomSuffix = Math.random().toString(36).substring(2, 6).toLowerCase();
            username = `player_${randomSuffix}`; // e.g. player_k92f

            // Check existence
            const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);
            if (existing.length === 0) {
                isUnique = true;
            }
        }
        return username;
    }

    getCallingCode(country) {
        // Mock map. In real app, standard library.
        const map = {
            'India': 91, 'USA': 1, 'UK': 44, 'Japan': 81, 'China': 86,
            'Germany': 49, 'France': 33, 'Brazil': 55, 'South Africa': 27,
            'Australia': 61, 'UAE': 971
        };
        return map[country] || 0;
    }
}

module.exports = new UidService();
