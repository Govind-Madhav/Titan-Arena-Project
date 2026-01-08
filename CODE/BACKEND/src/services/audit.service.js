const { db } = require('../db');
const { auditLogs } = require('../db/schema');

/**
 * Log a critical system action
 * @param {string} userId - ID of the user performing the action
 * @param {string} action - Action identifier (e.g. TOURNAMENT_CREATED)
 * @param {string} targetId - ID of the object being acted upon
 * @param {object} details - Additional JSON data for context
 * @param {string} ipAddress - Client IP address
 */
const logAction = async (userId, action, targetId, details = {}, ipAddress = null) => {
    try {
        await db.insert(auditLogs).values({
            userId,
            action,
            targetId,
            details: typeof details === 'object' ? JSON.stringify(details) : details,
            ipAddress
        });
    } catch (err) {
        // We log the error but don't throw, as audit logging shouldn't break the main flow
        console.error('Audit Log Injection Failed:', err);
    }
};

module.exports = {
    logAction
};
