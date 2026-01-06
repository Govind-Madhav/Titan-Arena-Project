/**
 * UID Service - Region-Based UID Generation
 * 
 * Format: rPPPPPPPPP (region + 9-digit counter)
 * Example: 1000000001 (First user in Asia)
 * 
 * Uses Atomic Update for thread safety.
 */

const { sql, eq } = require('drizzle-orm');
const { uidCounters } = require('../db/schema');

class UidService {
    /**
     * Generate Platform UID
     * @param {number} region - Region code (1-6)
     * @param {object} tx - Database transaction (required)
     * @returns {object} { uid, region, sequence }
     */
    async generatePlatformUid(region, tx) {
        if (!tx) throw new Error('Transaction required for UID generation');

        // Ensure region is number
        const regionNum = Number(region);
        if (isNaN(regionNum) || regionNum < 1 || regionNum > 6) {
            throw new Error(`Invalid region for UID generation: ${region}`);
        }

        try {
            // 1. Atomic Increment: Update the counter directly
            // This implicitly locks the row until transaction commit
            await tx.update(uidCounters)
                .set({ lastValue: sql`${uidCounters.lastValue} + 1` })
                .where(eq(uidCounters.region, regionNum));

            // 2. Fetch the new value
            const [row] = await tx.select()
                .from(uidCounters)
                .where(eq(uidCounters.region, regionNum));

            if (!row) {
                throw new Error(`UID Counter not found for region ${regionNum}`);
            }

            const currentValue = Number(row.lastValue);

            // 3. Format UID: Region + 9-digit sequence
            const regionPrefix = regionNum.toString();
            const sequencePadding = currentValue.toString().padStart(9, '0');
            const uid = `${regionPrefix}${sequencePadding}`; // e.g. "1000000001"

            console.log(`✅ Generated UID: ${uid} (Region: ${regionNum}, Seq: ${currentValue})`);

            return { uid, region: regionNum, sequence: currentValue };

        } catch (error) {
            console.error('❌ UID Generation Failed:', error);
            throw error;
        }
    }
}

module.exports = new UidService();
