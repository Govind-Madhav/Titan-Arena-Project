/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 */

const { userCounters } = require('../db/schema');
const { eq, sql } = require('drizzle-orm');
const crypto = require('crypto');

class UidService {
    /**
     * Generates a unique Player Code: PLxxxx
     * MUST be run within a transaction.
     * thread-safe via FOR UPDATE
     */
    async generatePlayerCode(tx) {
        return this._generateCode(tx, 'PLAYER_CODE', 'PL');
    }

    /**
     * Generates a unique Host Code: HTxxxx
     * MUST be run within a transaction.
     * thread-safe via FOR UPDATE
     */
    async generateHostCode(tx) {
        return this._generateCode(tx, 'HOST_CODE', 'HT');
    }

    /**
     * Private helper for atomic counter increment
     */
    async _generateCode(tx, key, prefix) {
        if (!tx) throw new Error('Transaction required for ID generation');

        // 1. Lock and Select
        const result = await tx.execute(sql`
            SELECT \`last_number\` FROM \`user_counters\`
            WHERE \`key\` = ${key}
            FOR UPDATE
        `);

        // Handle driver differences (mysql2 returns [rows, fields])
        const rows = Array.isArray(result[0]) ? result[0] : (result.rows || result);
        const counter = rows[0];

        if (!counter) {
            throw new Error(`Critical: Counter ${key} not found. Seeding required.`);
        }

        const currentVal = counter.last_number !== undefined ? counter.last_number : counter.lastNumber;

        if (currentVal === undefined || currentVal === null) {
            throw new Error(`Critical: Counter ${key} has invalid value: ${JSON.stringify(counter)}`);
        }

        const nextVal = Number(currentVal) + 1;

        // 2. Update
        await tx.update(userCounters)
            .set({ lastNumber: nextVal })
            .where(eq(userCounters.key, key));

        // 3. Format: PL0001
        return `${prefix}${nextVal.toString().padStart(4, '0')}`;
    }

    /**
     * Generates a unique Platform UID based on country and year
     * Format: IN-2025-0001
     * MUST be run within a transaction.
     */
    async generatePlatformUid(country, tx) {
        if (!tx) throw new Error('Transaction required for UID generation');

        const regionCode = country.toUpperCase().substring(0, 2);
        const year = new Date().getFullYear();

        // 1. Lock and increment counter
        const result = await tx.execute(sql`
            UPDATE uid_counters 
            SET \`last_value\` = LAST_INSERT_ID(\`last_value\` + 1)
            WHERE region_code = ${regionCode} AND year = ${year}
        `);

        // 2. Get the new value
        const [idResult] = await tx.execute(sql`SELECT LAST_INSERT_ID() as id`);
        const rows = Array.isArray(idResult[0]) ? idResult[0] : (idResult.rows || idResult);
        const newId = rows[0]?.id || 1;

        // 3. Format: IN-2025-0001
        const uid = `${regionCode}-${year}-${String(newId).padStart(4, '0')}`;

        return { uid, regionCode };
    }

    /**
     * Generates a random public username.
     * Note: Uniqueness MUST be enforced at the INSERT level (Database Constraint).
     */
    generateRandomUsernameString() {
        const suffix = crypto.randomBytes(3).toString('hex');
        return `player_${suffix}`;
    }

    /**
     * Get calling code for a country
     */
    getCallingCode(country) {
        const codes = {
            'IN': 91,
            'US': 1,
            'GB': 44,
            'CA': 1,
            'AU': 61,
            'SG': 65,
            'MY': 60,
            'PH': 63,
            'ID': 62,
            'TH': 66
        };
        return codes[country] || 1;
    }
}

module.exports = new UidService();
