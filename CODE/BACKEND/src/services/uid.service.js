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
     * Generates a random public username.
     * Note: Uniqueness MUST be enforced at the INSERT level (Database Constraint).
     */
    generateRandomUsernameString() {
        const suffix = crypto.randomBytes(3).toString('hex');
        return `player_${suffix}`;
    }
}

module.exports = new UidService();
