/**
 * Match Service - Core Match Logic
 */
const { db } = require('../../db');
const { matches, tournaments } = require('../../db/schema');
const { eq, and } = require('drizzle-orm');
const walletService = require('../wallet/wallet.service');
const auditService = require('../admin/audit.service');

/**
 * Advance winner to next match
 */
const advanceWinner = async (matchId, tx = null) => {
    const client = tx || db;

    // 1. Fetch completed match
    const match = await client.select().from(matches).where(eq(matches.id, matchId)).limit(1).then(r => r[0]);
    if (!match || match.status !== 'COMPLETED' || !match.winnerId) return;

    // 2. Check for next match
    if (!match.nextMatchId) {
        // Final Match!
        await client.update(tournaments)
            .set({
                status: 'COMPLETED',
                winnerId: match.winnerId
            })
            .where(eq(tournaments.id, match.tournamentId));

        // Trigger Payouts (Async or Await? Await for safety)
        try {
            await walletService.distributeTournamentPrizes(match.tournamentId);
        } catch (e) {
            console.error('Payout failed::', e);
            // Don't fail the match flow, just log. Payouts can be retried.
        }
        return;
    }

    // 3. Update Next Match
    const nextMatch = await client.select().from(matches).where(eq(matches.id, match.nextMatchId)).limit(1).then(r => r[0]);
    if (!nextMatch) return;

    const updateData = {};
    if (match.positionInNextMatch === 1) updateData.participantAId = match.winnerId;
    else updateData.participantBId = match.winnerId;

    await client.update(matches)
        .set(updateData)
        .where(eq(matches.id, match.nextMatchId));

    // Check if next match is now ready (both players present)
    // We need to re-fetch to check both slots or use the updateData + existing
    // Let's rely on the update we just made. 
    // Wait, we need to know if the *other* slot is filled.
    const otherSlot = match.positionInNextMatch === 1 ? nextMatch.participantBId : nextMatch.participantAId;

    if (otherSlot) {
        // Both slots filled!
        // Scheduled automatically? Yes, status is SCHEDULED by default unless locked.
        // We can optionally set status explicitly or send notification.
    }
};

module.exports = {
    advanceWinner
};
