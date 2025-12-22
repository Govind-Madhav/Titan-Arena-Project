const { db } = require('../../db');
const { matches, tournaments, users } = require('../../db/schema');
const { eq, and } = require('drizzle-orm');
const auditService = require('../admin/audit.service');
const matchService = require('./match.service');

// Get match by ID
exports.getMatchById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.select({
            id: matches.id,
            round: matches.round,
            participantA: {
                id: matches.participantAId,
                username: matches.participantAId // Temp: just returning ID, ideally join or fetch name
            },
            participantB: {
                id: matches.participantBId,
            },
            scoreA: matches.scoreA,
            scoreB: matches.scoreB,
            status: matches.status,
            startTime: matches.startTime
        })
            .from(matches)
            .where(eq(matches.id, id))
            .limit(1);

        // Better: Fetch raw match and join manually if needed
        const match = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
        if (!match[0]) return res.status(404).json({ success: false, message: 'Match not found' });

        res.json({ success: true, data: match[0] });
    } catch (error) {
        console.error('Get match error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch match' });
    }
};

// Submit Score
exports.submitScore = async (req, res) => {
    try {
        const { id } = req.params;
        const { scoreA, scoreB } = req.body;
        const userId = req.user.id;

        // Transaction for concurrency
        await db.transaction(async (tx) => {
            // 1. Lock & Fetch
            // Drizzle doesn't support 'FOR UPDATE' easily in all drivers/modes yet. 
            // We'll proceed with standard transaction. 
            const match = await tx.select().from(matches).where(eq(matches.id, id)).limit(1).then(r => r[0]);

            if (!match) throw new Error('Match not found');

            // 2. Validate Status
            if (match.status === 'COMPLETED') throw new Error('Match already completed');
            if (match.locked) throw new Error('Match is locked');

            // 3. Validate Permission (Participant or Host/Admin)
            // Need tournament host check too? Expensive.
            const isParticipant = (match.participantAId === userId || match.participantBId === userId);
            const isAdmin = (req.user.role === 'ADMIN');

            if (!isParticipant && !isAdmin) throw new Error('Unauthorized to submit score');

            // 4. Update Score & Determine Winner
            let winnerId = null;
            let status = 'COMPLETED'; // Auto-complete for now

            if (scoreA > scoreB) winnerId = match.participantAId;
            else if (scoreB > scoreA) winnerId = match.participantBId;
            else throw new Error('Draws not allowed in knockout');

            if (!winnerId) throw new Error('Winner could not be determined');

            // 5. Save
            await tx.update(matches)
                .set({
                    scoreA,
                    scoreB,
                    winnerId,
                    status,
                    endTime: new Date()
                })
                .where(eq(matches.id, id));

            // 6. Advance
            await matchService.advanceWinner(id, tx);

            // 7. Audit
            await auditService.logAction(userId, 'MATCH_SCORE', id, { scoreA, scoreB, winnerId });
        });

        res.json({ success: true, message: 'Score submitted and processed' });
    } catch (error) {
        console.error('Submit score error:', error);
        res.status(400).json({ success: false, message: error.message || 'Failed to submit score' });
    }
};

// Dispute Match
exports.disputeMatch = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        await db.update(matches)
            .set({ status: 'DISPUTED', locked: true })
            .where(eq(matches.id, id));

        await auditService.logAction(req.user.id, 'MATCH_DISPUTE', id, { reason });

        res.json({ success: true, message: 'Match marked as disputed' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to dispute match' });
    }
};

// Get Status
exports.getMatches = async (req, res) => {
    try {
        // Stub for getMatches by tournament
        res.status(501).json({ message: 'Not Implemented' });
    } catch (error) {
        res.status(500).json({ message: 'Error' });
    }
}
exports.getMatch = exports.getMatchById;
exports.generateBracket = (req, res) => res.status(501).json({ message: 'Use tournament/start instead' });
exports.submitResult = exports.submitScore;
exports.uploadProof = (req, res) => res.status(501).json({ message: 'Not Implemented' });
exports.completeTournament = (req, res) => res.status(501).json({ message: 'Use tournament/finalize instead' });
