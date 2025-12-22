/**
 * Audit Service - Logs sensitive actions
 */
const { db } = require('../../db');
const { auditLogs } = require('../../db/schema');
const crypto = require('crypto');

const logAction = async (userId, action, targetId, details = {}, ipAddress = null) => {
    try {
        await db.insert(auditLogs).values({
            id: crypto.randomUUID(),
            userId,
            action,
            targetId,
            details: JSON.stringify(details),
            ipAddress
        });
    } catch (error) {
        console.error('Audit Log Failed:', error);
        // Do not throw, as we don't want to break the main flow if logging fails slightly
    }
};

module.exports = {
    logAction
};
