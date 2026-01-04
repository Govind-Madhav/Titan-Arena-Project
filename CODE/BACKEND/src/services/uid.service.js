/**
 * UID Service - Region-Based UID Generation
 * 
 * Format: rPPPPPPPPP (region + 9-digit counter)
 * Example: 1000000001 (First user in Asia)
 * 
 * CRITICAL: Uses SELECT FOR UPDATE for atomicity
 * 
 * ⚠️ WARNING:
 * This service MUST be the only codepath that generates platform UIDs.
 * Do NOT generate UIDs elsewhere.
 * 
 * 🔒 IMMUTABLE RULES (DO NOT CHANGE):
 * ❌ Do NOT add year/time to UID
 * ❌ Do NOT involve sub-region in UID
 * ❌ Do NOT generate UID outside transactions
 * ❌ Do NOT regenerate UID ever
 * ❌ Do NOT auto-assign region
 */

const { sql } = require('drizzle-orm');

class UidService {
    /**
     * Generate Platform UID
     * @param {number} region - Region code (1-6)
     * @param {object} tx - Database transaction (required)
     * @returns {object} { uid, region, sequence }
     */
    async generatePlatformUid(region, tx) {
        if (!tx) {
            throw new Error('Transaction required for UID generation');
        }

        if (region < 1 || region > 6) {
            throw new Error(`Invalid region: ${region}. Must be 1-6`);
        }

        // Lock row and get current value
        const result = await tx.execute(sql`
            SELECT last_value
            FROM uid_counters
            WHERE region = ${region}
            FOR UPDATE
        `);

        const rows = Array.isArray(result[0]) ? result[0] : result;

        if (!rows || rows.length === 0) {
            throw new Error(`Counter not initialized for region ${region}`);
        }

        const current = rows[0].last_value;
        const next = current + 1;

        // Guard against overflow (future-proof)
        if (next > 999_999_999) {
            throw new Error(`UID counter exhausted for region ${region}. Congratulations on 1 billion users! 🏆`);
        }

        // Update counter
        await tx.execute(sql`
            UPDATE uid_counters
            SET last_value = ${next}
            WHERE region = ${region}
        `);

        // Format: rPPPPPPPPP (1 digit region + 9 digit counter)
        const uid = `${region}${String(next).padStart(9, '0')}`;

        // Return structured data for better debugging
        return {
            uid,
            region,
            sequence: next
        };
    }

    /**
     * Health check - verify all region counters are initialized
     * Call this at app startup
     */
    async healthCheck(db) {
        try {
            const result = await db.execute(sql`
                SELECT region FROM uid_counters ORDER BY region
            `);

            const rows = Array.isArray(result[0]) ? result[0] : result;
            const regions = rows.map(r => r.region);

            const expected = [1, 2, 3, 4, 5, 6];
            const missing = expected.filter(r => !regions.includes(r));

            if (missing.length > 0) {
                throw new Error(`UID counters not initialized for regions: ${missing.join(', ')}`);
            }

            console.log('✅ UID Service: All region counters initialized');
            return true;
        } catch (error) {
            console.error('❌ UID Service health check failed:', error.message);
            throw error;
        }
    }
}

module.exports = new UidService();
