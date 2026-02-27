/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { matches, tournaments, registrations, users, teams, teamMembers, disputes, payouts } = require('../../db/schema');
const { eq, and, desc, asc, or } = require('drizzle-orm');
const walletService = require('../wallet/wallet.service');
const { publishEvent } = require('../../config/kafka.config');
const { publishTournamentEnded } = require('../tournament/tournament.events');
const mmrService = require('../../services/mmr.service');
const achievementService = require('../../services/achievement.service');
const { broadcastMatchCompleted, broadcastScoreUpdate } = require('../../config/socket.config');

// Get matches for tournament
exports.getMatches = async (req, res) => {
    try {
        const result = await db.select()
            .from(matches)
            .where(eq(matches.tournamentId, req.params.tournamentId))
            .orderBy(asc(matches.round), asc(matches.matchNumber));

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Get matches error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch matches' });
    }
};

// Get single match
exports.getMatch = async (req, res) => {
    try {
        const rows = await db.select({
            match: matches,
            dispute: disputes
        })
            .from(matches)
            .leftJoin(disputes, eq(matches.id, disputes.matchId))
            .where(eq(matches.id, req.params.id));

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Match not found' });
        }

        // Grouping disputes (one to many)
        const matchData = rows[0].match;
        matchData.disputes = rows.map(r => r.dispute).filter(Boolean);

        res.json({ success: true, data: matchData });
    } catch (error) {
        console.error('Get match error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch match' });
    }
};

// Get current user's matches (across all tournaments — solo AND team)
exports.getMyMatches = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find all teams this user belongs to
        const userTeamRows = await db
            .select({ teamId: teamMembers.teamId })
            .from(teamMembers)
            .where(eq(teamMembers.userId, userId));
        const userTeamIds = userTeamRows.map(r => r.teamId);

        // Build participant filter: solo (userId directly) OR team member
        const participantConditions = [
            eq(matches.participantAId, userId),
            eq(matches.participantBId, userId),
            ...userTeamIds.map(tid => eq(matches.participantAId, tid)),
            ...userTeamIds.map(tid => eq(matches.participantBId, tid)),
        ];

        const rows = await db.select({
            match: matches,
            tournament: { id: tournaments.id, name: tournaments.name, game: tournaments.game, type: tournaments.type },
            dispute: { id: disputes.id, reason: disputes.reason },
        })
            .from(matches)
            .leftJoin(tournaments, eq(matches.tournamentId, tournaments.id))
            .leftJoin(disputes, eq(matches.id, disputes.matchId))
            .where(or(...participantConditions))
            .orderBy(desc(matches.scheduledAt));

        // Enrich: add my-win flag and opponent info
        const enriched = rows.map(r => {
            const m = { ...r.match };
            m.tournamentName = r.tournament?.name || null;
            m.tournamentGame = r.tournament?.game || null;
            m.tournamentType = r.tournament?.type || 'SOLO';

            const isTeam = m.tournamentType === 'TEAM';
            if (isTeam) {
                // myTeamId = whichever of participantA/B is one of the user's teams
                const myTeamId = userTeamIds.includes(m.participantAId) ? m.participantAId : m.participantBId;
                m.myTeamId = myTeamId;
                m.myWin = m.winnerId === myTeamId;
                m.opponentId = m.participantAId === myTeamId ? m.participantBId : m.participantAId;
            } else {
                m.myWin = m.winnerId === userId;
                m.opponentId = m.participantAId === userId ? m.participantBId : m.participantAId;
            }

            // HIDE OPPONENT IF NOT LIVE
            const tStatus = r.tournament?.status;
            if (tStatus !== 'ONGOING' && tStatus !== 'COMPLETED') {
                m.opponentId = null;
                m.opponentName = 'Revealed at Start';
            }

            if (r.dispute?.id) m.disputeReason = r.dispute.reason;
            return m;
        });

        res.json({ success: true, data: enriched });
    } catch (error) {
        console.error('Get my matches error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch your matches' });
    }
};


// Generate bracket
exports.generateBracket = async (req, res) => {
    try {
        const tournamentId = req.params.tournamentId;

        // Fetch tournament with registrations
        const tRows = await db.select({
            tournament: tournaments,
            registration: registrations,
            user: { id: users.id, username: users.username },
            team: { id: teams.id, name: teams.name }
        })
            .from(tournaments)
            .leftJoin(registrations, eq(tournaments.id, registrations.tournamentId))
            .leftJoin(users, eq(registrations.userId, users.id))
            .leftJoin(teams, eq(registrations.teamId, teams.id))
            .where(eq(tournaments.id, tournamentId));

        if (!tRows.length) {
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        }

        const tournament = tRows[0].tournament;

        // Filter confirmed registrations manually
        const participants = tRows
            .filter(r => r.registration && r.registration.status === 'CONFIRMED')
            .map(r => ({
                ...r.registration,
                user: r.user,
                team: r.team
            }));

        if (tournament.hostId !== req.user.id && !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        if (tournament.status !== 'ONGOING') {
            return res.status(400).json({ success: false, message: 'Tournament must be ONGOING to generate bracket' });
        }

        if (participants.length < 2) {
            return res.status(400).json({ success: false, message: 'Need at least 2 participants' });
        }

        // Shuffle participants
        const shuffled = [...participants].sort(() => Math.random() - 0.5);

        // Calculate rounds needed (single elimination)
        const totalRounds = Math.ceil(Math.log2(shuffled.length));
        const bracketSize = Math.pow(2, totalRounds);

        // Pad with BYEs if needed
        while (shuffled.length < bracketSize) {
            shuffled.push(null); // BYE
        }

        // Create match objects
        const matchInserts = [];
        let matchNumber = 1;

        for (let i = 0; i < shuffled.length; i += 2) {
            const p1 = shuffled[i];
            const p2 = shuffled[i + 1];

            const matchData = {
                tournamentId,
                round: 1,
                matchNumber,
                status: 'SCHEDULED',
                // Using generic participant fields as per DB schema
                // Logic: participantAId / BId
                participantAId: tournament.type === 'SOLO' ? p1?.userId : p1?.teamId,
                participantBId: tournament.type === 'SOLO' ? p2?.userId : p2?.teamId
            };

            // Auto-win if BYE
            if (!p2) {
                matchData.winnerId = matchData.participantAId;
                matchData.status = 'COMPLETED';
                matchData.isBye = true;
            }

            matchInserts.push(matchData);
            matchNumber++;
        }

        // Subsequent rounds
        for (let round = 2; round <= totalRounds; round++) {
            const matchesInRound = Math.pow(2, totalRounds - round);
            for (let m = 1; m <= matchesInRound; m++) {
                matchInserts.push({
                    tournamentId,
                    round,
                    matchNumber: m,
                    status: 'SCHEDULED'
                });
            }
        }

        await db.transaction(async (tx) => {
            // Delete existing matches
            await tx.delete(matches).where(eq(matches.tournamentId, tournamentId));

            // Bulk insert matches
            await tx.insert(matches).values(matchInserts);
        });

        // Fetch back created matches
        const allMatches = await db.select()
            .from(matches)
            .where(eq(matches.tournamentId, tournamentId))
            .orderBy(asc(matches.round), asc(matches.matchNumber));

        res.json({
            success: true,
            message: `Bracket generated: ${totalRounds} rounds`,
            data: allMatches
        });
    } catch (error) {
        console.error('Generate bracket error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate bracket' });
    }
};

// Submit match result
exports.submitResult = async (req, res) => {
    try {
        const { scoreA, scoreB, winnerId, mvpUserId } = req.body;

        // Fetch match with tournament
        const rows = await db.select({
            match: matches,
            tournament: tournaments
        })
            .from(matches)
            .innerJoin(tournaments, eq(matches.tournamentId, tournaments.id))
            .where(eq(matches.id, req.params.id));

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Match not found' });
        }
        const { match, tournament } = rows[0];

        if (tournament.hostId !== req.user.id && !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Update current match
        await db.update(matches)
            .set({
                scoreA,
                scoreB,
                winnerId,
                status: 'COMPLETED'
            })
            .where(eq(matches.id, match.id));

        // Advance winner to next round
        const nextRound = match.round + 1;
        const nextMatchNumber = Math.ceil(match.matchNumber / 2);

        // Find next match
        const nextMatchResult = await db.select()
            .from(matches)
            .where(and(
                eq(matches.tournamentId, match.tournamentId),
                eq(matches.round, nextRound),
                eq(matches.matchNumber, nextMatchNumber)
            ))
            .limit(1);

        if (nextMatchResult.length > 0) {
            const nextMatch = nextMatchResult[0];
            const isFirstOfPair = match.matchNumber % 2 === 1;
            const field = isFirstOfPair ? 'participantAId' : 'participantBId';

            await db.update(matches)
                .set({ [field]: winnerId })
                .where(eq(matches.id, nextMatch.id));
        }

        // 🔔 KAFKA: Publish match.completed event for notification + stats consumers
        const loserId = match.participantAId === winnerId ? match.participantBId : match.participantAId;
        await publishEvent('match.completed', {
            eventType: 'MATCH_COMPLETED',
            matchId: match.id,
            tournamentId: match.tournamentId,
            tournamentName: tournament.name,
            tournamentType: tournament.type,
            game: tournament.game,
            winnerId,
            loserId,
            mvpUserId: mvpUserId || null,   // ← forwarded to leaderboard/stats consumers
            scoreA,
            scoreB,
            round: match.round,
            timestamp: new Date().toISOString()
        });

        // ⚡ WebSocket: Broadcast real-time match result
        broadcastScoreUpdate({ matchId: match.id, tournamentId: match.tournamentId, scoreA, scoreB, participantAId: match.participantAId, participantBId: match.participantBId });
        broadcastMatchCompleted({ matchId: match.id, tournamentId: match.tournamentId, winnerId, round: match.round });

        // 🧠 MMR: Update Elo ratings — route to team or solo path (non-blocking)
        if (winnerId && loserId && winnerId !== loserId) {
            const isTeamTournament = tournament.type === 'TEAM';

            if (isTeamTournament) {
                // Team path: winnerId/loserId are teamIds
                // processTeamMatchResult handles: team Elo + per-member Elo + MVP bonus
                mmrService.processTeamMatchResult(
                    winnerId,               // winTeamId
                    loserId,                // loseTeamId
                    match.id,
                    match.tournamentId,
                    mvpUserId || null,
                )
                    .then(({ teamWinner }) => {
                        achievementService.processMatchWin(
                            winnerId, teamWinner, undefined,
                            { matchId: match.id, tournamentId: match.tournamentId, isTeam: true, mvpUserId }
                        ).catch(console.error);
                    })
                    .catch((err) => console.error('Team MMR update failed:', err.message));
            } else {
                // Solo path: winnerId/loserId are userIds
                mmrService.processMatchResult(winnerId, loserId)
                    .then(({ winner }) => {
                        achievementService.processMatchWin(winnerId, winner, undefined, { matchId: match.id, tournamentId: match.tournamentId })
                            .catch(console.error);
                    })
                    .catch((err) => console.error('MMR update failed:', err.message));
            }
        }

        res.json({
            success: true,
            message: 'Result submitted',
            ...(mvpUserId && { mvpUserId })  // echo back MVP so frontend can highlight it
        });
    } catch (error) {
        console.error('Submit result error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit result' });
    }
};


// Upload match proof screenshot/video
exports.uploadProof = async (req, res) => {
    try {
        const { proofUrl } = req.body;
        if (!proofUrl) {
            return res.status(400).json({ success: false, message: 'proofUrl is required' });
        }

        const matchRows = await db.select().from(matches).where(eq(matches.id, req.params.id));
        if (!matchRows.length) return res.status(404).json({ success: false, message: 'Match not found' });
        const match = matchRows[0];

        const tournamentRows = await db.select().from(tournaments).where(eq(tournaments.id, match.tournamentId));
        const tournament = tournamentRows[0];
        if (tournament.hostId !== req.user.id && !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        await db.update(matches)
            .set({ proofUrl, updatedAt: new Date() })
            .where(eq(matches.id, req.params.id));

        res.json({ success: true, message: 'Proof uploaded successfully', data: { matchId: match.id, proofUrl } });
    } catch (error) {
        console.error('Upload proof error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload proof' });
    }
};


// Complete tournament and distribute prizes
exports.completeTournament = async (req, res) => {
    try {
        const tournamentId = req.params.tournamentId;

        const tournamentResult = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId));
        if (!tournamentResult.length) return res.status(404).json({ success: false, message: 'Tournament not found' });
        const tournament = tournamentResult[0];

        if (tournament.hostId !== req.user.id && !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        if (tournament.status === 'COMPLETED') {
            return res.status(400).json({ success: false, message: 'Tournament already completed' });
        }

        // Find the final match (highest round, must be COMPLETED)
        const tournamentMatches = await db.select().from(matches)
            .where(and(eq(matches.tournamentId, tournamentId), eq(matches.status, 'COMPLETED')))
            .orderBy(desc(matches.round));

        if (!tournamentMatches.length) {
            return res.status(400).json({ success: false, message: 'No completed matches found' });
        }

        const maxRound = Math.max(...tournamentMatches.map(m => m.round));
        const finalMatch = tournamentMatches.find(m => m.round === maxRound);

        if (!finalMatch?.winnerId) {
            return res.status(400).json({ success: false, message: 'Final match has no winner yet' });
        }

        const firstPlaceId = finalMatch.winnerId;
        const secondPlaceId = finalMatch.participantAId === firstPlaceId
            ? finalMatch.participantBId
            : finalMatch.participantAId;

        // Semi-final losers = 3rd place candidates
        const semiFinals = tournamentMatches.filter(m => m.round === maxRound - 1);
        const thirdPlaceCandidates = semiFinals
            .map(m => (m.participantAId === m.winnerId ? m.participantBId : m.participantAId))
            .filter(Boolean);

        const isTeam = tournament.type === 'TEAM';

        /**
         * Resolve participantId → array of userIds to pay.
         * For SOLO: [participantId] (already a userId)
         * For TEAM: all members of that team (split prize evenly)
         */
        const resolvePayeeUserIds = async (participantId) => {
            if (!isTeam) return [participantId];
            const members = await db
                .select({ userId: teamMembers.userId })
                .from(teamMembers)
                .where(eq(teamMembers.teamId, participantId));
            return members.map(m => m.userId);
        };

        // Prize split: 50% / 30% / top-3 20%
        const prizePool = tournament.prizePool;
        const podiumPlans = [
            { position: 1, participantId: firstPlaceId, share: 0.50 },
            { position: 2, participantId: secondPlaceId, share: 0.30 },
            ...thirdPlaceCandidates.map(id => ({ position: 3, participantId: id, share: 0.20 / Math.max(thirdPlaceCandidates.length, 1) })),
        ].filter(p => p.participantId);

        const payoutRows = [];
        const creditResults = [];

        for (const plan of podiumPlans) {
            const totalForPosition = Math.floor(prizePool * plan.share);
            if (totalForPosition <= 0) continue;

            // Resolve to individual user IDs (TEAM → split equally among members)
            const payeeIds = await resolvePayeeUserIds(plan.participantId);
            const perPersonAmount = Math.floor(totalForPosition / Math.max(payeeIds.length, 1));

            for (const userId of payeeIds) {
                try {
                    await walletService.credit(
                        userId,
                        perPersonAmount,
                        'CREDIT',           // type
                        'PRIZE',            // source
                        `${getOrdinal(plan.position)} place prize — ${tournament.name}`, // message
                        null,               // metadata
                        tournamentId        // tournamentId
                    );
                    payoutRows.push({ tournamentId, userId, position: plan.position, amount: perPersonAmount, status: 'PAID', paidAt: new Date() });
                    creditResults.push({ position: plan.position, userId, amount: perPersonAmount, status: 'PAID' });
                } catch (err) {
                    console.error(`Prize credit failed for ${userId}:`, err.message);
                    payoutRows.push({ tournamentId, userId, position: plan.position, amount: perPersonAmount, status: 'FAILED' });
                    creditResults.push({ position: plan.position, userId, amount: perPersonAmount, status: 'FAILED' });
                }
            }

            // 🏅 Achievement trigger — award CHAMPION/PODIUM/UNTOUCHABLE to each payee (non-blocking)
            for (const userId of payeeIds) {
                achievementService.processTournamentResult(userId, tournamentId, plan.position)
                    .catch(err => console.error(`Achievement trigger failed for ${userId}:`, err.message));
            }
        }

        if (payoutRows.length) {
            await db.insert(payouts).values(payoutRows);
        }

        // Mark tournament as COMPLETED, set winner
        await db.update(tournaments)
            .set({ status: 'COMPLETED', winnerId: firstPlaceId, updatedAt: new Date() })
            .where(eq(tournaments.id, tournamentId));

        // 🔔 KAFKA: notify consumers
        await publishTournamentEnded(tournamentId, firstPlaceId, tournament.prizePool);

        res.json({
            success: true,
            message: 'Tournament completed and prizes distributed',
            data: { tournamentId, winner: firstPlaceId, payouts: creditResults },
        });
    } catch (error) {
        console.error('Complete tournament error:', error);
        res.status(500).json({ success: false, message: 'Failed to complete tournament' });
    }
};

function getOrdinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
