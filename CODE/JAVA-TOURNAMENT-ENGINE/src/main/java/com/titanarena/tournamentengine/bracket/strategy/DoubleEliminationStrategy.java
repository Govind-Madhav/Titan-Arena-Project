package com.titanarena.tournamentengine.bracket.strategy;

import com.titanarena.tournamentengine.domain.Match;
import com.titanarena.tournamentengine.domain.MatchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

/**
 * Double Elimination bracket strategy.
 *
 * Structure:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ Winners Bracket (WB) — rounds 1..W │
 * │ Losers Bracket (LB) — rounds starts at LB_R1 (tag: L prefix) │
 * │ Grand Final — 1 match, winner of WB vs winner of LB │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Round label convention:
 * round < 0 → Losers Bracket, abs(round) = LB round number
 * round = 0 → Grand Final
 * round > 0 → Winners Bracket round
 *
 * Participants are seeded into the WB. WB losers drop to the LB.
 * A team must lose twice to be eliminated.
 *
 * DB match.bracketSection column is set to "WINNERS", "LOSERS", or
 * "GRAND_FINAL"
 * so Node.js can render the correct bracket view.
 *
 * @see BracketStrategy
 */
@Component("DOUBLE_ELIMINATION")
@RequiredArgsConstructor
@Slf4j
public class DoubleEliminationStrategy implements BracketStrategy {

    private final MatchRepository matchRepository;

    @Override
    @Transactional
    public List<Match> generate(String tournamentId, List<String> participants) {
        if (matchRepository.existsByTournamentId(tournamentId)) {
            log.warn("⚠️  Bracket already exists for tournament {} — skipping", tournamentId);
            return matchRepository.findByTournamentIdOrderByRoundAscMatchNumberAsc(tournamentId);
        }

        int n = participants.size();
        int bracketSize = nextPowerOfTwo(n);
        int wbRounds = log2(bracketSize); // e.g. 8 players → 3 WB rounds

        // Pad to bracket size with BYEs
        List<String> seeded = new ArrayList<>(participants);
        while (seeded.size() < bracketSize)
            seeded.add(null);

        log.info("🏆 [DoubleElim] tournament={} | participants={} | bracketSize={} | wbRounds={}",
                tournamentId, n, bracketSize, wbRounds);

        List<Match> allMatches = new ArrayList<>();

        // ─── Pre-generate all UUIDs ──────────────────────────────────────────
        // WB: round 1..wbRounds
        // LB: lbTotalRounds = 2*(wbRounds-1) rounds
        // Grand Final: 1 match (round = 0)

        int lbTotalRounds = 2 * (wbRounds - 1);

        // wbIds[round][matchIndex] → UUID
        Map<Integer, Map<Integer, String>> wbIds = new HashMap<>();
        for (int r = 1; r <= wbRounds; r++) {
            int count = bracketSize / (int) Math.pow(2, r);
            wbIds.put(r, new HashMap<>());
            for (int i = 0; i < count; i++)
                wbIds.get(r).put(i, UUID.randomUUID().toString());
        }

        // lbIds[lbRound][matchIndex] → UUID (lbRound 1..lbTotalRounds)
        Map<Integer, Map<Integer, String>> lbIds = new HashMap<>();
        for (int lr = 1; lr <= lbTotalRounds; lr++) {
            // LB match count per round:
            // Odd LB rounds receive WB losers (same count as WB that produced them)
            // Even LB rounds halve again
            int count = lbMatchCount(lr, wbRounds);
            lbIds.put(lr, new HashMap<>());
            for (int i = 0; i < count; i++)
                lbIds.get(lr).put(i, UUID.randomUUID().toString());
        }

        String grandFinalId = UUID.randomUUID().toString();

        // ─── Winners Bracket ─────────────────────────────────────────────────
        for (int r = 1; r <= wbRounds; r++) {
            int count = bracketSize / (int) Math.pow(2, r);
            boolean isLastWbRound = (r == wbRounds);

            for (int i = 0; i < count; i++) {
                // Participants (only round 1 is seeded; later rounds are TBD)
                String pA = (r == 1) ? seeded.get(i * 2) : null;
                String pB = (r == 1) ? seeded.get(i * 2 + 1) : null;
                boolean isBye = isByeMatch(pA, pB);
                String winner = isBye ? (pA != null ? pA : pB) : null;

                // Where does the winner go next?
                String winnerNextId = isLastWbRound ? grandFinalId : wbIds.get(r + 1).get(i / 2);
                String winnerNextSlot = (i % 2 == 0) ? "A" : "B";

                // WB loser drops to LB round 1 (odd LB rounds receive WB dropdowns)
                // LB round 1 corresponds to WB round 1 losers
                String loserNextId = lbIds.get(1).get(i);
                String loserNextSlot = "A"; // default; node.js handles actual slot assignment

                allMatches.add(Match.builder()
                        .id(wbIds.get(r).get(i))
                        .tournamentId(tournamentId)
                        .round(r)
                        .matchNumber(i + 1)
                        .participantAId(pA).participantBId(pB)
                        .status(isBye ? "COMPLETED" : "PENDING")
                        .winnerId(winner)
                        .nextMatchId(winnerNextId)
                        .nextMatchSlot(winnerNextSlot)
                        .loserNextMatchId(loserNextId)
                        .loserNextMatchSlot(loserNextSlot)
                        .bracketSection("WINNERS")
                        .scheduledAt(Instant.now().plusSeconds(3600L * (i + 1)))
                        .build());
            }
        }

        // ─── Losers Bracket ──────────────────────────────────────────────────
        for (int lr = 1; lr <= lbTotalRounds; lr++) {
            int count = lbMatchCount(lr, wbRounds);
            boolean isLastLbRound = (lr == lbTotalRounds);

            for (int i = 0; i < count; i++) {
                String nextId = isLastLbRound ? grandFinalId : lbIds.get(lr + 1).get(i / 2);
                String nextSlot = (i % 2 == 0) ? "A" : "B";

                allMatches.add(Match.builder()
                        .id(lbIds.get(lr).get(i))
                        .tournamentId(tournamentId)
                        .round(-(lr)) // negative = LB
                        .matchNumber(i + 1)
                        .status("PENDING")
                        .nextMatchId(nextId)
                        .nextMatchSlot(nextSlot)
                        .bracketSection("LOSERS")
                        .scheduledAt(Instant.now().plusSeconds(3600L * 24L * lr))
                        .build());
            }
        }

        // ─── Grand Final ─────────────────────────────────────────────────────
        allMatches.add(Match.builder()
                .id(grandFinalId)
                .tournamentId(tournamentId)
                .round(0) // 0 = Grand Final
                .matchNumber(1)
                .status("PENDING")
                .bracketSection("GRAND_FINAL")
                .scheduledAt(Instant.now().plusSeconds(3600L * 24L * (lbTotalRounds + 2)))
                .build());

        List<Match> saved = matchRepository.saveAll(allMatches);
        log.info("✅ [DoubleElim] {} matches created (WB+LB+GF) for tournament {}", saved.size(), tournamentId);
        return saved;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Number of LB matches in a given LB round.
     * Odd LB rounds (1, 3, 5...) = WB dropout round, equal to WB match count at
     * that depth.
     * Even LB rounds (2, 4, 6...) = internal LB halving.
     *
     * LB round 1: bracketSize/4 matches (WB round 1 losers)
     * LB round 2: bracketSize/4 matches (survive)
     * LB round 3: bracketSize/8 matches (WB round 2 losers in)
     * LB round 4: bracketSize/8 matches (survive)
     * ...
     */
    private int lbMatchCount(int lbRound, int wbRounds) {
        int depth = (lbRound + 1) / 2; // which WB round's losers feed in
        int wbLosersAtDepth = (int) Math.pow(2, wbRounds - depth - 1);
        if (lbRound % 2 == 1)
            return Math.max(1, wbLosersAtDepth); // odd: receives dropdowns
        else
            return Math.max(1, wbLosersAtDepth); // even: halving round
    }

    private boolean isByeMatch(String a, String b) {
        return (a == null) != (b == null);
    }

    private int nextPowerOfTwo(int n) {
        if (n <= 1)
            return 1;
        int p = 1;
        while (p < n)
            p <<= 1;
        return p;
    }

    private int log2(int n) {
        return (int) (Math.log(n) / Math.log(2));
    }
}
