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
@Component
@RequiredArgsConstructor
@Slf4j
public class DoubleEliminationStrategy implements BracketStrategy {

    private static final String STATUS_COMPLETED = "COMPLETED";
    private static final String STATUS_PENDING = "PENDING";

    private final MatchRepository matchRepository;

    @Override
    @Transactional
    public List<Match> generate(String tournamentId, List<String> participants) {
        Optional<List<Match>> existing = getExistingBracket(tournamentId);
        if (existing.isPresent()) {
            return existing.get();
        }

        int n = participants.size();
        int bracketSize = nextPowerOfTwo(n);
        int wbRounds = log2(bracketSize); // e.g. 8 players → 3 WB rounds
        int lbTotalRounds = 2 * (wbRounds - 1);

        List<String> seeded = createSeededParticipants(participants, bracketSize);

        log.info("🏆 [DoubleElim] tournament={} | participants={} | bracketSize={} | wbRounds={}",
                tournamentId, n, bracketSize, wbRounds);

        Map<Integer, Map<Integer, String>> wbIds = buildWinnersBracketIds(bracketSize, wbRounds);
        Map<Integer, Map<Integer, String>> lbIds = buildLosersBracketIds(wbRounds, lbTotalRounds);
        String grandFinalId = UUID.randomUUID().toString();

        List<Match> allMatches = new ArrayList<>();
        allMatches.addAll(buildWinnersBracketMatches(tournamentId, seeded, bracketSize, wbRounds, wbIds, lbIds, grandFinalId));
        allMatches.addAll(buildLosersBracketMatches(tournamentId, wbRounds, lbTotalRounds, lbIds, grandFinalId));
        allMatches.add(buildGrandFinalMatch(tournamentId, grandFinalId, lbTotalRounds));

        List<Match> saved = matchRepository.saveAll(allMatches);
        log.info("✅ [DoubleElim] {} matches created (WB+LB+GF) for tournament {}", saved.size(), tournamentId);
        return saved;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private Optional<List<Match>> getExistingBracket(String tournamentId) {
        if (matchRepository.existsByTournamentId(tournamentId)) {
            log.warn("⚠️  Bracket already exists for tournament {} — skipping", tournamentId);
            return Optional.of(matchRepository.findByTournamentIdOrderByRoundAscMatchNumberAsc(tournamentId));
        }
        return Optional.empty();
    }

    private List<String> createSeededParticipants(List<String> participants, int bracketSize) {
        List<String> seeded = new ArrayList<>(participants);
        while (seeded.size() < bracketSize) {
            seeded.add(null);
        }
        return seeded;
    }

    private Map<Integer, Map<Integer, String>> buildWinnersBracketIds(int bracketSize, int wbRounds) {
        Map<Integer, Map<Integer, String>> wbIds = new HashMap<>();
        for (int round = 1; round <= wbRounds; round++) {
            int count = bracketSize / (int) Math.pow(2, round);
            Map<Integer, String> roundIds = new HashMap<>();
            for (int i = 0; i < count; i++) {
                roundIds.put(i, UUID.randomUUID().toString());
            }
            wbIds.put(round, roundIds);
        }
        return wbIds;
    }

    private Map<Integer, Map<Integer, String>> buildLosersBracketIds(int wbRounds, int lbTotalRounds) {
        Map<Integer, Map<Integer, String>> lbIds = new HashMap<>();
        for (int lbRound = 1; lbRound <= lbTotalRounds; lbRound++) {
            int count = lbMatchCount(lbRound, wbRounds);
            Map<Integer, String> roundIds = new HashMap<>();
            for (int i = 0; i < count; i++) {
                roundIds.put(i, UUID.randomUUID().toString());
            }
            lbIds.put(lbRound, roundIds);
        }
        return lbIds;
    }

    private List<Match> buildWinnersBracketMatches(
            String tournamentId,
            List<String> seeded,
            int bracketSize,
            int wbRounds,
            Map<Integer, Map<Integer, String>> wbIds,
            Map<Integer, Map<Integer, String>> lbIds,
            String grandFinalId) {
        List<Match> matches = new ArrayList<>();
        for (int round = 1; round <= wbRounds; round++) {
            int count = bracketSize / (int) Math.pow(2, round);
            for (int i = 0; i < count; i++) {
                matches.add(buildWinnersMatch(
                        tournamentId,
                        seeded,
                        wbIds,
                        lbIds,
                        grandFinalId,
                        round,
                        i));
            }
        }
        return matches;
    }

    private Match buildWinnersMatch(
            String tournamentId,
            List<String> seeded,
            Map<Integer, Map<Integer, String>> wbIds,
            Map<Integer, Map<Integer, String>> lbIds,
            String grandFinalId,
            int round,
            int index) {
        String participantA = (round == 1) ? seeded.get(index * 2) : null;
        String participantB = (round == 1) ? seeded.get(index * 2 + 1) : null;
        boolean isBye = isByeMatch(participantA, participantB);
        String winner = isBye ? resolveByeWinner(participantA, participantB) : null;

        boolean isLastWbRound = !wbIds.containsKey(round + 1);
        String winnerNextId = isLastWbRound ? grandFinalId : wbIds.get(round + 1).get(index / 2);
        String winnerNextSlot = (index % 2 == 0) ? "A" : "B";

        String loserNextId = lbIds.get(1).get(index);
        String loserNextSlot = "A";

        return Match.builder()
                .id(wbIds.get(round).get(index))
                .tournamentId(tournamentId)
                .round(round)
                .matchNumber(index + 1)
                .participantAId(participantA).participantBId(participantB)
                .status(isBye ? STATUS_COMPLETED : STATUS_PENDING)
                .winnerId(winner)
                .nextMatchId(winnerNextId)
                .nextMatchSlot(winnerNextSlot)
                .loserNextMatchId(loserNextId)
                .loserNextMatchSlot(loserNextSlot)
                .bracketSection("WINNERS")
                .startTime(Instant.now().plusSeconds(3600L * (index + 1)))
                .build();
    }

    private List<Match> buildLosersBracketMatches(
            String tournamentId,
            int wbRounds,
            int lbTotalRounds,
            Map<Integer, Map<Integer, String>> lbIds,
            String grandFinalId) {
        List<Match> matches = new ArrayList<>();
        for (int lbRound = 1; lbRound <= lbTotalRounds; lbRound++) {
            int count = lbMatchCount(lbRound, wbRounds);
            boolean isLastLbRound = (lbRound == lbTotalRounds);
            for (int i = 0; i < count; i++) {
                matches.add(buildLosersMatch(tournamentId, lbIds, grandFinalId, lbRound, i, isLastLbRound));
            }
        }
        return matches;
    }

    private Match buildLosersMatch(
            String tournamentId,
            Map<Integer, Map<Integer, String>> lbIds,
            String grandFinalId,
            int lbRound,
            int index,
            boolean isLastLbRound) {
        String nextId = isLastLbRound ? grandFinalId : lbIds.get(lbRound + 1).get(index / 2);
        String nextSlot = (index % 2 == 0) ? "A" : "B";

        return Match.builder()
                .id(lbIds.get(lbRound).get(index))
                .tournamentId(tournamentId)
                .round(-(lbRound))
                .matchNumber(index + 1)
                .status(STATUS_PENDING)
                .nextMatchId(nextId)
                .nextMatchSlot(nextSlot)
                .bracketSection("LOSERS")
                .startTime(Instant.now().plusSeconds(3600L * 24L * lbRound))
                .build();
    }

    private Match buildGrandFinalMatch(String tournamentId, String grandFinalId, int lbTotalRounds) {
        return Match.builder()
                .id(grandFinalId)
                .tournamentId(tournamentId)
                .round(0)
                .matchNumber(1)
                .status(STATUS_PENDING)
                .bracketSection("GRAND_FINAL")
                .startTime(Instant.now().plusSeconds(3600L * 24L * (lbTotalRounds + 2)))
                .build();
    }

    private String resolveByeWinner(String participantA, String participantB) {
        return participantA != null ? participantA : participantB;
    }

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
        int wbLosersAtDepth = (int) Math.pow(2, (double) wbRounds - depth - 1);
        return Math.max(1, wbLosersAtDepth);
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
