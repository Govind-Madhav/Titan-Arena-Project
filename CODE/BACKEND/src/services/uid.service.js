/**
 * UID Service - Region-Based UID Generation
 * 
 * Format: rPPPPPPPPP (region + 9-digit counter)
 * Example: 1000000001 (First user in Asia)
 * 
 * Uses Atomic Update for thread safety.
 */

const { sql, eq } = require('drizzle-orm');
const { uidCounters, userCounters } = require('../db/schema');

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
        if (Number.isNaN(regionNum) || regionNum < 1 || regionNum > 6) {
            throw new Error(`Invalid region for UID generation: ${region}`);
        }

        try {
            // Ensure counter row exists for this region before incrementing.
            await tx.insert(uidCounters)
                .values({ region: regionNum, lastValue: 0 })
                .onConflictDoNothing();

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

    async generateRoleUid(role, tx) {
        if (!tx) throw new Error('Transaction required for UID generation');

        const normalizedRole = String(role || '').toUpperCase();
        if (!['HOST', 'ADMIN', 'SUPERADMIN'].includes(normalizedRole)) {
            throw new Error(`Invalid role for UID generation: ${role}`);
        }

        try {
            await tx.insert(userCounters)
                .values({ key: normalizedRole, lastNumber: 0 })
                .onConflictDoNothing();

            await tx.update(userCounters)
                .set({ lastNumber: sql`${userCounters.lastNumber} + 1` })
                .where(eq(userCounters.key, normalizedRole));

            const [row] = await tx.select()
                .from(userCounters)
                .where(eq(userCounters.key, normalizedRole));

            if (!row) {
                throw new Error(`Role UID Counter not found for role ${normalizedRole}`);
            }

            const currentValue = Number(row.lastNumber);
            const uid = `${normalizedRole}${currentValue.toString().padStart(9, '0')}`;

            console.log(`✅ Generated Role UID: ${uid} (Role: ${normalizedRole}, Seq: ${currentValue})`);
            return { uid, role: normalizedRole, sequence: currentValue };
        } catch (error) {
            console.error('❌ Role UID Generation Failed:', error);
            throw error;
        }
    }
}

module.exports = new UidService();
