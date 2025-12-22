/**
 * Event System Usage Examples
 * How to use Redis Pub/Sub events in your code
 * 
 * CRITICAL RULES:
 * 1. MySQL commits FIRST, events SECOND
 * 2. Events are best-effort (can be lost)
 * 3. Events MUST NOT drive backend state transitions
 * 4. Events are for UI updates only
 * 
 * NOTE: In high-scale systems, use an "outbox table" to persist events
 * within the same DB transaction, then publish asynchronously.
 * This prevents edge case: MySQL commits → process crashes → event not published
 */

const { publishMatchCompleted, publishTournamentUpdated, publishBracketChanged, publishLobbyUpdated } = require('../src/events/event.publisher');

// ==========================================
// ✅ CORRECT USAGE (After MySQL commits)
// ==========================================

/**
 * Example 1: Match completion
 * MySQL first, then event (fire-and-forget)
 */
async function completeMatch(matchId, winnerId, team1Score, team2Score) {
    // 1. Commit to MySQL (source of truth)
    await mysqlDB.query(`
    UPDATE matches SET winner_id = ?, team1_score = ?, team2_score = ?, status = 'completed'
    WHERE id = ?
  `, [winnerId, team1Score, team2Score, matchId]);

    // 2. Publish event for real-time UI (fire-and-forget)
    // Event publishing is best-effort; failures should be logged, not thrown
    try {
        await publishMatchCompleted({
            matchId,
            tournamentId: 1, // From match data
            winnerId,
            team1Score,
            team2Score,
            completedAt: Date.now()
        }, {
            userId: req.user?.id, // From auth (for tracing)
            requestId: req.id // From express (for correlation)
        });
    } catch (error) {
        // Log but don't fail the request
        console.error('Event publishing failed (non-critical):', error.message);
    }

    // Frontend sees update immediately via Firebase
}

/**
 * Example 2: Tournament update
 */
async function updateTournamentStatus(tournamentId, newStatus) {
    // 1. MySQL first
    await mysqlDB.query('UPDATE tournaments SET status = ? WHERE id = ?', [newStatus, tournamentId]);

    // 2. Event (fire-and-forget)
    try {
        await publishTournamentUpdated({
            tournamentId,
            status: newStatus,
            updatedFields: ['status']
        });
    } catch (error) {
        console.error('Event publishing failed:', error.message);
    }
}

/**
 * Example 3: Bracket progression
 */
async function updateBracket(tournamentId, bracket, round) {
    // 1. MySQL first
    await mysqlDB.query('UPDATE tournaments SET bracket = ?, current_round = ? WHERE id = ?',
        [JSON.stringify(bracket), round, tournamentId]);

    // 2. Event
    try {
        await publishBracketChanged({
            tournamentId,
            bracket,
            round,
            updatedAt: Date.now()
        });
    } catch (error) {
        console.error('Event publishing failed:', error.message);
    }
}

/**
 * Example 4: Lobby participants
 * NOTE: Lobbies might be Redis-only (temporary session state)
 * Not all state needs MySQL - events can be primary for ephemeral data
 */
async function updateLobbyParticipants(lobbyId, participants) {
    // If no MySQL involved, just publish event
    try {
        await publishLobbyUpdated({
            lobbyId,
            tournamentId: 1,
            participants,
            capacity: 10,
            status: 'waiting'
        });
    } catch (error) {
        console.error('Event publishing failed:', error.message);
    }
}

// ==========================================
// ❌ WRONG USAGE
// ==========================================

/**
 * ❌ WRONG: Event before MySQL commit
 * Problem: UI shows result before DB confirms (race condition)
 */
async function completeMatch_WRONG(matchId, winnerId) {
    // ❌ Event first - UI shows result before DB confirms!
    await publishMatchCompleted({
        matchId,
        winnerId,
        team1Score: 0,
        team2Score: 0,
        completedAt: Date.now()
    });

    // Then MySQL (if this fails, UI already showed wrong data)
    await mysqlDB.query('UPDATE matches...');
}

/**
 * ❌ WRONG: Using events for critical business logic
 * Rule: Events MUST NOT drive backend state transitions
 */
async function updateWallet_WRONG(userId, amount) {
    // ❌ NO! Wallet updates must ONLY be in MySQL
    // Events are best-effort, can be lost
    await publishEvent('WALLET_UPDATED', { userId, amount });
}

/**
 * ❌ WRONG: Blocking response on event publish
 */
async function completeMatch_BLOCKING(matchId, winnerId) {
    await mysqlDB.query('UPDATE matches...');

    // ❌ If event publish fails, entire request fails
    // Event publishing should not block response
    await publishMatchCompleted({
        matchId,
        winnerId,
        team1Score: 0,
        team2Score: 0,
        completedAt: Date.now()
    });
}

// ==========================================
// ✅ PRODUCTION-GRADE PATTERN
// ==========================================

/**
 * ✅ Full match completion flow (staff-level)
 * 
 * Demonstrates:
 * - MySQL transaction (ACID)
 * - Event after commit
 * - Fire-and-forget semantics
 * - Metadata for tracing
 */
async function completeMatchFull(req, res) {
    const { matchId, winnerId, team1Score, team2Score } = req.body;

    try {
        // 1. MySQL transaction (ACID, source of truth)
        await mysqlDB.transaction(async (trx) => {
            // Update match
            await trx.query('UPDATE matches SET winner_id = ?, status = ? WHERE id = ?',
                [winnerId, 'completed', matchId]);

            // Update player stats
            await trx.query('UPDATE player_stats SET wins = wins + 1 WHERE user_id = ?', [winnerId]);

            // Update tournament standings
            // ... more business logic
        });

        // 2. Publish event (after successful commit, fire-and-forget)
        // Event publishing is best-effort; failures should be logged, not thrown
        publishMatchCompleted({
            matchId,
            tournamentId: 1,
            winnerId,
            team1Score,
            team2Score,
            completedAt: Date.now()
        }, {
            userId: req.user.id,  // For audit trail
            requestId: req.id     // For request correlation
        }).catch(error => {
            // Log but don't fail the request
            console.error('Event publishing failed (non-critical):', error.message);
        });

        // 3. Respond immediately (don't wait for event)
        res.json({ success: true });

    } catch (error) {
        // If MySQL fails, no event is published (correct!)
        res.status(500).json({ error: error.message });
    }
}

/**
 * ✅ Alternative: Outbox pattern for guaranteed delivery
 * 
 * For systems requiring 100% event delivery:
 * 1. Write event to outbox table in same transaction as business data
 * 2. Background worker polls outbox and publishes to Redis
 * 3. Mark as published after successful Redis publish
 * 
 * Trade-off: Adds complexity but eliminates "committed but not published" risk
 */
async function completeMatchWithOutbox(req, res) {
    const { matchId, winnerId, team1Score, team2Score } = req.body;

    try {
        // Single transaction for both business data and outbox
        await mysqlDB.transaction(async (trx) => {
            // Update match
            await trx.query('UPDATE matches SET winner_id = ?, status = ? WHERE id = ?',
                [winnerId, 'completed', matchId]);

            // Insert into outbox table
            await trx.query(`
        INSERT INTO event_outbox (event_type, payload, created_at)
        VALUES (?, ?, NOW())
      `, ['MATCH_COMPLETED', JSON.stringify({
                matchId,
                tournamentId: 1,
                winnerId,
                team1Score,
                team2Score,
                completedAt: Date.now()
            })]);
        });

        // Background worker will publish from outbox asynchronously
        res.json({ success: true });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    completeMatch,
    updateTournamentStatus,
    updateBracket,
    completeMatchFull,
    completeMatchWithOutbox
};
