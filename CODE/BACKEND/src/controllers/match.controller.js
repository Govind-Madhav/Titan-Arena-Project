/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

const prisma = require('../config/prisma');
const walletService = require('../wallet/wallet.service');

// Get matches for tournament
exports.getMatches = async (req, res) => {
    try {
        const matches = await prisma.match.findMany({
            where: { tournamentId: req.params.tournamentId },
            orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }]
        });

        res.json({ success: true, data: matches });
    } catch (error) {
        console.error('Get matches error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch matches' });
    }
};

// Get single match
exports.getMatch = async (req, res) => {
    try {
        const match = await prisma.match.findUnique({
            where: { id: req.params.id },
            include: { disputes: true }
        });

        if (!match) {
            return res.status(404).json({ success: false, message: 'Match not found' });
        }

        res.json({ success: true, data: match });
    } catch (error) {
        console.error('Get match error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch match' });
    }
};

// Generate bracket
exports.generateBracket = async (req, res) => {
    try {
        const tournamentId = req.params.tournamentId;

        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: {
                registrations: {
                    where: { status: 'CONFIRMED' },
                    include: {
                        user: { select: { id: true, username: true } },
                        team: { select: { id: true, name: true } }
                    }
                }
            }
        });

        if (!tournament) {
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        }

        if (tournament.hostId !== req.user.id && !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        if (tournament.status !== 'ONGOING') {
            return res.status(400).json({ success: false, message: 'Tournament must be ONGOING to generate bracket' });
        }

        const participants = tournament.registrations;
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

        // Create first round matches
        const matches = [];
        let matchNumber = 1;

        for (let i = 0; i < shuffled.length; i += 2) {
            const p1 = shuffled[i];
            const p2 = shuffled[i + 1];

            const matchData = {
                tournamentId,
                round: 1,
                matchNumber,
                status: 'SCHEDULED'
            };

            if (tournament.type === 'SOLO') {
                matchData.playerAId = p1?.userId || null;
                matchData.playerBId = p2?.userId || null;

                // Auto-win if BYE
                if (!p2) {
                    matchData.winnerUserId = p1?.userId;
                    matchData.status = 'COMPLETED';
                }
            } else {
                matchData.teamAId = p1?.teamId || null;
                matchData.teamBId = p2?.teamId || null;

                if (!p2) {
                    matchData.winnerTeamId = p1?.teamId;
                    matchData.status = 'COMPLETED';
                }
            }

            matches.push(matchData);
            matchNumber++;
        }

        // Delete existing matches
        await prisma.match.deleteMany({ where: { tournamentId } });

        // Create new matches
        await prisma.match.createMany({ data: matches });

        // Create placeholder matches for subsequent rounds
        for (let round = 2; round <= totalRounds; round++) {
            const matchesInRound = Math.pow(2, totalRounds - round);
            const roundMatches = [];

            for (let m = 1; m <= matchesInRound; m++) {
                roundMatches.push({
                    tournamentId,
                    round,
                    matchNumber: m,
                    status: 'SCHEDULED'
                });
            }

            await prisma.match.createMany({ data: roundMatches });
        }

        const allMatches = await prisma.match.findMany({
            where: { tournamentId },
            orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }]
        });

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
        const { scoreA, scoreB, winnerId } = req.body;

        const match = await prisma.match.findUnique({
            where: { id: req.params.id },
            include: { tournament: true }
        });

        if (!match) {
            return res.status(404).json({ success: false, message: 'Match not found' });
        }

        if (match.tournament.hostId !== req.user.id && !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const isSolo = match.tournament.type === 'SOLO';
        const updateData = {
            scoreA,
            scoreB,
            status: 'COMPLETED'
        };

        if (isSolo) {
            updateData.winnerUserId = winnerId;
        } else {
            updateData.winnerTeamId = winnerId;
        }

        await prisma.match.update({
            where: { id: match.id },
            data: updateData
        });

        // Advance winner to next round
        const nextRound = match.round + 1;
        const nextMatchNumber = Math.ceil(match.matchNumber / 2);

        const nextMatch = await prisma.match.findFirst({
            where: {
                tournamentId: match.tournamentId,
                round: nextRound,
                matchNumber: nextMatchNumber
            }
        });

        if (nextMatch) {
            const isFirstOfPair = match.matchNumber % 2 === 1;
            const field = isSolo
                ? (isFirstOfPair ? 'playerAId' : 'playerBId')
                : (isFirstOfPair ? 'teamAId' : 'teamBId');

            await prisma.match.update({
                where: { id: nextMatch.id },
                data: { [field]: winnerId }
            });
        }

        res.json({ success: true, message: 'Result submitted' });
    } catch (error) {
        console.error('Submit result error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit result' });
    }
};

// Upload proof
exports.uploadProof = async (req, res) => {
    try {
        const { proofUrl } = req.body;

        await prisma.match.update({
            where: { id: req.params.id },
            data: { proofUrl }
        });

        res.json({ success: true, message: 'Proof uploaded' });
    } catch (error) {
        console.error('Upload proof error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload proof' });
    }
};

// Complete tournament and distribute prizes
exports.completeTournament = async (req, res) => {
    try {
        const tournamentId = req.params.tournamentId;

        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: {
                payouts: { orderBy: { position: 'asc' } },
                matches: { where: { status: 'COMPLETED' }, orderBy: { round: 'desc' } },
                registrations: { include: { team: { include: { members: true } } } }
            }
        });

        if (!tournament) {
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        }

        if (tournament.hostId !== req.user.id && !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Get final rankings from matches (winner of final = 1st, loser = 2nd, etc.)
        const finalMatch = tournament.matches.find(m => m.round === Math.max(...tournament.matches.map(x => x.round)));
        if (!finalMatch || finalMatch.status !== 'COMPLETED') {
            return res.status(400).json({ success: false, message: 'Final match not completed yet' });
        }

        const isSolo = tournament.type === 'SOLO';
        const winners = [];

        // 1st place
        const firstPlaceId = isSolo ? finalMatch.winnerUserId : finalMatch.winnerTeamId;
        const secondPlaceId = isSolo
            ? (finalMatch.playerAId === firstPlaceId ? finalMatch.playerBId : finalMatch.playerAId)
            : (finalMatch.teamAId === firstPlaceId ? finalMatch.teamBId : finalMatch.teamAId);

        winners.push({ position: 1, id: firstPlaceId });
        winners.push({ position: 2, id: secondPlaceId });

        // Distribute prizes
        await prisma.$transaction(async (tx) => {
            const captainBonusPercent = parseInt(process.env.CAPTAIN_BONUS_PERCENT || '10') / 100;

            for (const payout of tournament.payouts) {
                const winner = winners.find(w => w.position === payout.position);
                if (!winner || !winner.id) continue;

                if (isSolo) {
                    // Credit directly to user
                    await walletService.credit(
                        winner.id,
                        payout.amount,
                        'PRIZE',
                        `${getOrdinal(payout.position)} place prize for ${tournament.name}`,
                        { tournamentId, position: payout.position },
                        tx
                    );
                } else {
                    // Team: split with captain bonus
                    const team = tournament.registrations.find(r => r.teamId === winner.id)?.team;
                    if (!team) continue;

                    const teamSize = team.members.length;
                    const captainBonus = Math.floor(payout.amount * captainBonusPercent);
                    const remaining = payout.amount - captainBonus;
                    const perMember = Math.floor(remaining / teamSize);

                    for (const member of team.members) {
                        const isCaptain = member.role === 'CAPTAIN';
                        const amount = isCaptain ? perMember + captainBonus : perMember;

                        await walletService.credit(
                            member.userId,
                            amount,
                            'PRIZE',
                            `${getOrdinal(payout.position)} place prize for ${tournament.name}`,
                            { tournamentId, position: payout.position, teamId: team.id },
                            tx
                        );
                    }
                }
            }

            // Host profit
            const hostProfit = tournament.collected - tournament.prizePool;
            if (hostProfit > 0) {
                await walletService.credit(
                    tournament.hostId,
                    hostProfit,
                    'HOST_PROFIT',
                    `Profit from ${tournament.name}`,
                    { tournamentId },
                    tx
                );

                await tx.tournament.update({
                    where: { id: tournamentId },
                    data: { hostProfit }
                });
            }

            // Mark complete
            await tx.tournament.update({
                where: { id: tournamentId },
                data: { status: 'COMPLETED' }
            });
        });

        res.json({ success: true, message: 'Tournament completed and prizes distributed' });
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
