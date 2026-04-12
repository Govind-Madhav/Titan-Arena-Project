const { db } = require('../db');
const { tournaments } = require('../db/schema');
const { eq, and, count } = require('drizzle-orm');

const TRUST_LEVELS = Object.freeze({
    NEW: 0,
    TRIAL_PASSED: 1,
    VERIFIED: 2
});

const TRUST_PROFILES = Object.freeze({
    0: {
        level: 0,
        label: 'New',
        activationMode: 'manual',
        maxEntryFee: 100,
        maxParticipants: 64,
        manualReviewRequired: true
    },
    1: {
        level: 1,
        label: 'Trial Passed',
        activationMode: 'semi-auto',
        maxEntryFee: 200,
        maxParticipants: 128,
        manualReviewRequired: false
    },
    2: {
        level: 2,
        label: 'Verified',
        activationMode: 'auto',
        maxEntryFee: null,
        maxParticipants: null,
        manualReviewRequired: false
    }
});

const resolveHostTrustLevel = (completedCount) => {
    if (completedCount >= 5) return TRUST_LEVELS.VERIFIED;
    if (completedCount >= 2) return TRUST_LEVELS.TRIAL_PASSED;
    return TRUST_LEVELS.NEW;
};

const getHostTrustProfile = async (user) => {
    if (!user) {
        return {
            ...TRUST_PROFILES[0],
            completedTournaments: 0,
            completedRequiredForNextLevel: 2
        };
    }

    if (user.isAdmin || ['ADMIN', 'SUPERADMIN'].includes(user.role)) {
        return {
            ...TRUST_PROFILES[2],
            completedTournaments: 999,
            completedRequiredForNextLevel: null
        };
    }

    const [result] = await db
        .select({ completedCount: count() })
        .from(tournaments)
        .where(and(
            eq(tournaments.hostId, user.id),
            eq(tournaments.status, 'COMPLETED')
        ));

    const completedTournaments = Number(result?.completedCount || 0);
    const level = resolveHostTrustLevel(completedTournaments);
    let completedRequiredForNextLevel = null;
    if (level === 0) {
        completedRequiredForNextLevel = 2;
    } else if (level === 1) {
        completedRequiredForNextLevel = 5;
    }

    return {
        ...TRUST_PROFILES[level],
        completedTournaments,
        completedRequiredForNextLevel
    };
};

module.exports = {
    TRUST_LEVELS,
    TRUST_PROFILES,
    resolveHostTrustLevel,
    getHostTrustProfile
};
