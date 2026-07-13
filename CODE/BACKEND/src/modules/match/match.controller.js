/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const { db } = require('../../db');
const { matches, tournaments, registrations, users, teams, teamMembers, disputes, payouts } = require('../../db/schema');
const { eq, and, desc, asc, or, isNotNull } = require('drizzle-orm');
const walletService = require('../wallet/wallet.service');
const { publishEvent } = require('../../config/kafka.config');
const { publishTournamentEnded } = require('../tournament/tournament.events');
const mmrService = require('../../services/mmr.service');
const achievementService = require('../../services/achievement.service');
const { broadcastMatchCompleted, broadcastScoreUpdate, emitToTournament } = require('../../config/socket.config');

const ACTIVE_STREAM_STATUSES = new Set(['ONGOING', 'IN_PROGRESS', 'LIVE']);

const parseStreamMeta = (url) => {
    if (!url || typeof url !== 'string') {
        return { platform: 'OTHER', streamId: null };
    }

    const normalized = url.trim();

    const twitchRegex = /twitch\.tv\/(?:videos\/(\d+)|([^/?#]+))/i;
    const twitchMatch = twitchRegex.exec(normalized);
    if (twitchMatch) {
        return {
            platform: 'TWITCH',
            streamId: twitchMatch[1] || twitchMatch[2] || null
        };
    }

    const youtubePatterns = [
        /youtu\.be\/([^?#&]+)/i,
        /youtube\.com\/watch\?v=([^&]+)/i,
        /youtube\.com\/live\/([^?#&]+)/i,
        /youtube\.com\/embed\/([^?#&]+)/i
    ];

    for (const pattern of youtubePatterns) {
        const youtubeMatch = pattern.exec(normalized);
        if (youtubeMatch) {
            return {
                platform: 'YOUTUBE',
                streamId: youtubeMatch[1] || null
            };
        }
    }

    return { platform: 'OTHER', streamId: null };
};

const mapStreamRow = (row, streamScope = 'MATCH') => {
    const meta = parseStreamMeta(row.streamUrl);
    return {
        ...row,
        streamScope,
        platform: meta.platform,
        streamId: meta.streamId
    };
};

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
            .orderBy(desc(matches.startTime));

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


// Generate bracket — delegates to the Java Tournament Engine
exports.generateBracket = async (req, res) => {
    try {
        const tournamentId = req.params.tournamentId;

        // Fetch tournament
        const tRows = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId));
        if (!tRows.length) {
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        }
        const tournament = tRows[0];

        if (tournament.hostId !== req.user.id && !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        if (tournament.status !== 'ONGOING') {
            return res.status(400).json({ success: false, message: 'Tournament must be ONGOING to generate bracket' });
        }

        // Determine bracket format (stored on tournament, defaulting to SINGLE_ELIMINATION)
        const format = tournament.format || 'SINGLE_ELIMINATION';

        // ─── Delegate to Java Tournament Engine ──────────────────────────────
        // The Java engine reads confirmed participants directly from the same DB,
        // generates the full bracket (including Losers Bracket for DE), and writes
        // all match rows with correct bracketSection / loserNextMatchId columns.
        const JAVA_ENGINE_URL = process.env.JAVA_ENGINE_URL || 'http://localhost:8080';

        const engineRes = await fetch(
            `${JAVA_ENGINE_URL}/api/brackets/${encodeURIComponent(tournamentId)}/generate?format=${encodeURIComponent(format)}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' } }
        );

        if (!engineRes.ok) {
            const errBody = await engineRes.json().catch(() => ({}));
            const errMsg = errBody.message || `Java engine returned HTTP ${engineRes.status}`;
            return res.status(502).json({ success: false, message: `Bracket generation failed: ${errMsg}` });
        }

        const engineData = await engineRes.json();

        // Fetch back all created matches from Node's DB so we can return them
        const allMatches = await db.select()
            .from(matches)
            .where(eq(matches.tournamentId, tournamentId))
            .orderBy(asc(matches.round), asc(matches.matchNumber));

        return res.json({
            success: true,
            message: `${format.replaceAll('_', ' ')} bracket generated (${engineData.data?.matchesCreated ?? allMatches.length} matches)`,
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
// eslint-disable-next-line sonarjs/cognitive-complexity
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
            { position: 1, participantId: firstPlaceId, share: 0.5 },
            { position: 2, participantId: secondPlaceId, share: 0.3 },
            ...thirdPlaceCandidates.map(id => ({ position: 3, participantId: id, share: 0.2 / Math.max(thirdPlaceCandidates.length, 1) })),
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

// ─── Stream Management ─────────────────────────────────────────────────────────

/**
 * PATCH /matches/:id/stream
 * Host or admin sets the streamUrl, vodUrl, spectatorCode for a match.
 */
exports.updateStream = async (req, res) => {
    try {
        const { streamUrl, vodUrl, spectatorCode, isLive } = req.body;
        const matchRows = await db.select().from(matches).where(eq(matches.id, req.params.id));
        if (!matchRows.length) return res.status(404).json({ success: false, message: 'Match not found' });

        const match = matchRows[0];

        // Verify requestor is the host/admin of this tournament
        const tournamentRows = await db.select().from(tournaments).where(eq(tournaments.id, match.tournamentId));
        const tournament = tournamentRows[0];
        const isHost = tournament?.hostId === req.user.id;
        const isAdminUser = req.user.isAdmin || ['ADMIN', 'SUPERADMIN'].includes(req.user.role);

        if (!isHost && !isAdminUser) {
            return res.status(403).json({ success: false, message: 'Only the tournament host or admins can set stream info' });
        }

        const updateData = { updatedAt: new Date() };
        if (streamUrl !== undefined) updateData.streamUrl = streamUrl || null;
        if (vodUrl !== undefined) updateData.vodUrl = vodUrl || null;
        if (spectatorCode !== undefined) updateData.spectatorCode = spectatorCode || null;
        if (typeof isLive === 'boolean') {
            updateData.status = isLive ? 'LIVE' : 'SCHEDULED';
        }

        const [updated] = await db.update(matches).set(updateData).where(eq(matches.id, req.params.id)).returning();

        const updatedMeta = parseStreamMeta(updated.streamUrl);

        // Broadcast stream update over socket (use emitToTournament; broadcastScoreUpdate is for scores only)
        emitToTournament(match.tournamentId, 'stream:update', {
            tournamentId: match.tournamentId,
            matchId: match.id,
            streamUrl: updated.streamUrl,
            streamScope: 'MATCH',
            platform: updatedMeta.platform,
            streamId: updatedMeta.streamId,
            isLive: ACTIVE_STREAM_STATUSES.has(updated.status)
        });

        res.json({ success: true, message: 'Stream info updated', data: updated });
    } catch (error) {
        console.error('Update stream error:', error);
        res.status(500).json({ success: false, message: 'Failed to update stream info' });
    }
};

/**
 * GET /matches/streams/live
 * Public endpoint — returns all ONGOING/IN_PROGRESS matches that have a streamUrl.
 * Used for the "Live Now" spectator hub page.
 */
exports.getLiveStreams = async (req, res) => {
    try {
        const { scope = 'all' } = req.query;

        const includeMatchScope = scope === 'all' || scope === 'match';
        const includeTournamentScope = scope === 'all' || scope === 'tournament';

        const rows = includeMatchScope ? await db.select({
            matchId: matches.id,
            tournamentId: matches.tournamentId,
            round: matches.round,
            matchNumber: matches.matchNumber,
            status: matches.status,
            streamUrl: matches.streamUrl,
            bracketSection: matches.bracketSection,
            startTime: matches.startTime,
            tournamentName: tournaments.name,
            game: tournaments.game,
                gameBanner: tournaments.highlightUrl,
        })
            .from(matches)
            .leftJoin(tournaments, eq(matches.tournamentId, tournaments.id))
            .where(
                and(
                    isNotNull(matches.streamUrl),
                    or(
                        eq(matches.status, 'ONGOING'),
                        eq(matches.status, 'IN_PROGRESS'),
                        eq(matches.status, 'LIVE')
                    )
                )
            )
            .orderBy(desc(matches.startTime))
            .limit(50) : [];

        const mappedMatchStreams = rows.map((row) => mapStreamRow(row, 'MATCH'));

        let tournamentStreams = [];
        if (includeTournamentScope) {
            const tournamentRows = await db.select({
                tournamentId: tournaments.id,
                status: tournaments.status,
                streamUrl: tournaments.streamUrl,
                streamPlatform: tournaments.streamPlatform,
                streamId: tournaments.streamId,
                streamScope: tournaments.streamScope,
                streamIsLive: tournaments.streamIsLive,
                startTime: tournaments.startTime,
                tournamentName: tournaments.name,
                game: tournaments.game,
                gameBanner: tournaments.highlightUrl,
            })
                .from(tournaments)
                .where(and(
                    isNotNull(tournaments.streamUrl),
                    eq(tournaments.streamIsLive, true),
                    eq(tournaments.streamScope, 'TOURNAMENT')
                ))
                .orderBy(desc(tournaments.startTime))
                .limit(20);

            tournamentStreams = tournamentRows
                .map((row) => ({
                    ...row,
                    matchId: `tournament:${row.tournamentId}`,
                    round: null,
                    matchNumber: null,
                    bracketSection: 'TOURNAMENT',
                    streamScope: 'TOURNAMENT',
                    platform: row.streamPlatform || 'OTHER'
                }))
                .filter((row) => row.platform !== 'OTHER');
        }

        const data = [...mappedMatchStreams, ...tournamentStreams];

        res.json({ success: true, data });
    } catch (error) {
        console.error('Get live streams error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch live streams' });
    }
};

/**
 * GET /matches/:id/stream
 * Public endpoint — returns stream/vod info for a single match.
 */
exports.getMatchStream = async (req, res) => {
    try {
        const rows = await db.select({
            matchId: matches.id,
            status: matches.status,
            streamUrl: matches.streamUrl,
            vodUrl: matches.vodUrl,
            spectatorCode: matches.spectatorCode,
            tournamentId: matches.tournamentId,
        }).from(matches).where(eq(matches.id, req.params.id));

        if (!rows.length) return res.status(404).json({ success: false, message: 'Match not found' });

        const stream = rows[0];
        const tournamentRows = await db.select({ hostId: tournaments.hostId })
            .from(tournaments)
            .where(eq(tournaments.id, stream.tournamentId))
            .limit(1);

        const hostId = tournamentRows[0]?.hostId;
        const userId = req.user?.id;
        const isAdminUser = Boolean(req.user?.isAdmin || ['ADMIN', 'SUPERADMIN'].includes(req.user?.role));
        const isHost = Boolean(userId && hostId && userId === hostId);

        let isParticipant = false;
        if (userId) {
            const participantRows = await db.select({ id: registrations.id })
                .from(registrations)
                .where(and(
                    eq(registrations.tournamentId, stream.tournamentId),
                    eq(registrations.userId, userId)
                ))
                .limit(1);
            isParticipant = participantRows.length > 0;
        }

        const canViewSpectatorCode = isAdminUser || isHost || isParticipant;
        const streamMeta = parseStreamMeta(stream.streamUrl);

        res.json({
            success: true,
            data: {
                ...stream,
                spectatorCode: canViewSpectatorCode ? stream.spectatorCode : null,
                streamScope: 'MATCH',
                platform: streamMeta.platform,
                streamId: streamMeta.streamId,
                isLive: ACTIVE_STREAM_STATUSES.has(stream.status)
            }
        });
    } catch (error) {
        console.error('Get match stream error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stream info' });
    }
};

