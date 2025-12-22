/**
 * Firebase Utilities Usage Examples (Production-Hardened)
 * Demonstrates safe architectural patterns
 * 
 * CRITICAL PRINCIPLES:
 * - MySQL = source of truth (ACID, authoritative)
 * - Firebase = real-time mirror (volatile, UI-only)
 * - Events = side effects (notifications, analytics, sync)
 * 
 * ⚠️ ENVIRONMENT SAFETY:
 * Always namespace Firebase paths by environment to prevent data pollution
 */

const { writeData, updateData, readData, deleteData, pushData, queryData, transaction } = require('../utils/firebase.utils');
const { publishMatchCompleted } = require('../events/event.publisher');

// ✅ FIX: Environment namespace (prevents dev/staging/prod pollution)
const ENV = process.env.NODE_ENV || 'development';
const envPath = (path) => `${ENV}/${path}`;

// ==========================================
// ✅ SAFE USAGE EXAMPLES (Backend)
// ==========================================

/**
 * Example 1: Update live match score
 * Safe because: Real-time UI state, not authoritative data
 * ✅ FIX: Environment namespaced, includes correlation metadata
 */
async function updateMatchScore(matchId, team1Score, team2Score, eventId = null) {
    // ✅ FIX: Include eventId, version, source for correlation
    await writeData(envPath(`matches/${matchId}/live-score`), {
        team1: team1Score,
        team2: team2Score,
        eventId, // For correlation with Redis events
        version: 1, // For schema evolution
        source: 'backend',
        updatedAt: Date.now()
    });

    // MySQL remains source of truth (write there too)
    // await db.query('UPDATE matches SET ...');
}

/**
 * Example 2: Update tournament bracket view
 * Safe because: UI visualization, not business logic
 */
async function updateBracketView(tournamentId, bracketData, eventId = null) {
    await writeData(envPath(`tournaments/${tournamentId}/bracket`), {
        bracket: bracketData,
        eventId,
        version: 1,
        source: 'backend',
        updatedAt: Date.now()
    });
}

/**
 * Example 3: Update lobby participant list
 * Safe because: Temporary session state, ephemeral
 */
async function addToLobby(lobbyId, userId, userInfo) {
    await updateData(envPath(`lobbies/${lobbyId}/participants/${userId}`), {
        ...userInfo,
        joinedAt: Date.now(),
        source: 'backend'
    });
}

/**
 * Example 4: Increment spectator counter (atomic)
 * Safe because: Non-critical counter
 * ✅ FIX: Soft cap to prevent bot spam/reconnect loops
 */
async function incrementSpectators(matchId) {
    const MAX_SPECTATORS = 1000000; // Soft cap (sanity check)

    const result = await transaction(envPath(`matches/${matchId}/spectators`), (current) => {
        const newCount = (current || 0) + 1;

        // ✅ FIX: Soft cap to prevent inflated numbers
        if (newCount > MAX_SPECTATORS) {
            console.warn(`Spectator cap reached for match ${matchId}`);
            return current; // Don't increment
        }

        return newCount;
    });

    console.log('Spectator count:', result.data);
    return result.data;
}

/**
 * Example 5: Query recent match updates
 * Safe because: Read-only, public data
 * ⚠️ NOTE: Firebase queries are expensive and require indexes
 * 
 * Cost awareness:
 * - Queries scan entire dataset without indexes
 * - Use limitToLast/limitToFirst for pagination
 * - Monitor Firebase costs in production
 * 
 * Ensure Firebase index exists:
 * {
 *   "rules": {
 *     "[ENV]": {
 *       "matches": {
 *         ".indexOn": ["updatedAt"]
 *       }
 *     }
 *   }
 * }
 */
async function getRecentMatches(limit = 10, lastKey = null) {
    // ✅ FIX: Pagination strategy for cost control
    const queryOptions = {
        orderBy: 'updatedAt',
        limitToLast: Math.min(limit, 50) // Hard cap to prevent cost abuse
    };

    if (lastKey) {
        queryOptions.endBefore = lastKey; // Pagination
    }

    const matches = await queryData(envPath('matches'), queryOptions);

    return {
        data: matches,
        hasMore: matches.length === queryOptions.limitToLast,
        nextKey: matches.length > 0 ? matches[0].updatedAt : null
    };
}

// ==========================================
// ❌ UNSAFE USAGE EXAMPLES (DON'T DO THIS)
// ==========================================

/**
 * ❌ WRONG: Storing wallet balance in Firebase
 * Problem: Firebase is not ACID-compliant, money must be in MySQL
 */
async function updateWalletBalance_WRONG(userId, balance) {
    // ❌ NO! Wallets MUST be in MySQL only
    await writeData(envPath(`wallets/${userId}/balance`), balance);
}

/**
 * ❌ WRONG: Using listener in API route
 * Problem: Creates long-lived connection, memory leak, hung connections
 */
app.get('/api/match/:id/live', (req, res) => {
    // ❌ NO! Don't use listeners in HTTP handlers
    const unsubscribe = listenToChanges(envPath(`matches/${req.params.id}`), (data) => {
        res.json(data); // This only works once, then connection hangs!
    });
    // unsubscribe is never called → memory leak
});

/**
 * ❌ WRONG: Using Firebase for permissions
 * Problem: Firebase rules are:
 * - Not auditable (no changelog)
 * - Hard to version (no Git history)
 * - Hard to reason about (complex JSON logic)
 * - Compliance nightmare (GDPR, SOC2, HIPAA)
 * 
 * Industry truth: Firebase auth logic is dangerous in compliance-heavy systems
 */
async function checkUserPermission_WRONG(userId, resource) {
    // ❌ NO! Permissions must be in MySQL with audit trails
    const perms = await readData(envPath(`permissions/${userId}`));
    return perms?.includes(resource);
}

/**
 * ❌ WRONG: No environment namespace
 * Problem: Staging/dev data pollutes production Firebase
 */
async function updateMatch_WRONG(matchId, data) {
    // ❌ NO! Missing environment namespace
    await writeData(`matches/${matchId}`, data);
    // Now dev writes to prod Firebase 💥
}

// ==========================================
// ✅ CORRECT ARCHITECTURE PATTERN
// ==========================================

/**
 * ✅ CORRECT: Event-driven hybrid approach
 * 
 * Flow:
 * 1. MySQL commit (ACID, source of truth)
 * 2. Publish event (Redis Pub/Sub)
 * 3. Worker syncs Firebase (with retry, reconciliation)
 * 
 * Benefits:
 * - Failure isolation (Firebase down ≠ API down)
 * - Retry logic (worker handles transient failures)
 * - Consistency (event log provides reconciliation)
 * 
 * ✅ FIX: Uses event system instead of direct Firebase write
 */
async function completeMatch(matchId, team1Score, team2Score, winnerId) {
    // 1. Update MySQL (source of truth)
    await mysqlDB.query(`
    UPDATE matches 
    SET team1_score = ?, team2_score = ?, winner_id = ?, status = 'completed'
    WHERE id = ?
  `, [team1Score, team2Score, winnerId, matchId]);

    // 2. Publish event to Redis Pub/Sub
    // ✅ Worker will sync Firebase with retry + correlation
    const eventId = await publishMatchCompleted({
        matchId,
        tournamentId: 1,
        winnerId,
        team1Score,
        team2Score,
        completedAt: Date.now()
    }, {
        userId: req.user?.id,
        requestId: req.id
    });

    // ✅ No direct Firebase write - worker handles it with:
    // - Idempotency (eventId tracking)
    // - Retry logic (transient failure recovery)
    // - Correlation (eventId in Firebase payload)
    // - Environment namespacing (via worker)
}

/**
 * ❌ WRONG (but common): Direct Firebase write in API
 * Problem: Bypasses event system, no failure isolation
 */
async function completeMatch_WRONG(matchId, winnerId) {
    // 1. MySQL
    await mysqlDB.query('UPDATE matches...');

    // 2. Direct Firebase write (bypasses event system)
    await writeData(envPath(`matches/${matchId}/result`), {
        winnerId,
        completedAt: Date.now()
    });

    // ❌ If Firebase fails:
    // - No retry
    // - No reconciliation
    // - No compensation logic
    // - UI never updates

    // 3. Publish event (too late, inconsistent)
    // await publishMatchCompleted({ matchId, winnerId, ... });
    // Event published AFTER Firebase write = no reconciliation if Firebase failed
}

module.exports = {
    updateMatchScore,
    updateBracketView,
    addToLobby,
    incrementSpectators,
    getRecentMatches,
    completeMatch
};
