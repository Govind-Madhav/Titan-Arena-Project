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
 * Single Elimination bracket generator.
 *
 * Algorithm:
 * 1. Pad participant list to next power of 2 (BYEs = null)
 * 2. Pre-generate all match UUIDs (enables forward wiring of nextMatchId)
 * 3. Round 1: seed real participants + auto-win BYE matches
 * 4. Rounds 2..N: TBD participants (filled by Node.js via match.completed
 * events)
 * 5. Bulk insert via saveAll()
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SingleEliminationStrategy implements BracketStrategy {

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

        int bracketSize = nextPowerOfTwo(participants.size());
        int totalRounds = (int) (Math.log(bracketSize) / Math.log(2));
        List<String> seeded = createSeededParticipants(participants, bracketSize);

        log.info("🏆 [SingleElim] tournament={} | participants={} | bracketSize={} | rounds={}",
                tournamentId, participants.size(), bracketSize, totalRounds);

        Map<Integer, Map<Integer, String>> matchIdGrid = buildMatchIdGrid(bracketSize, totalRounds);

        List<Match> allMatches = new ArrayList<>();

        allMatches.addAll(buildRoundOneMatches(tournamentId, bracketSize, totalRounds, seeded, matchIdGrid));
        allMatches.addAll(buildLaterRoundMatches(tournamentId, bracketSize, totalRounds, matchIdGrid));

        List<Match> saved = matchRepository.saveAll(allMatches);
        log.info("✅ [SingleElim] {} matches created for tournament {}", saved.size(), tournamentId);
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

    private Map<Integer, Map<Integer, String>> buildMatchIdGrid(int bracketSize, int totalRounds) {
        Map<Integer, Map<Integer, String>> matchIdGrid = new HashMap<>();
        for (int round = 1; round <= totalRounds; round++) {
            int count = bracketSize / (int) Math.pow(2, round);
            Map<Integer, String> roundIds = new HashMap<>();
            for (int i = 0; i < count; i++) {
                roundIds.put(i, UUID.randomUUID().toString());
            }
            matchIdGrid.put(round, roundIds);
        }
        return matchIdGrid;
    }

    private List<Match> buildRoundOneMatches(
            String tournamentId,
            int bracketSize,
            int totalRounds,
            List<String> seeded,
            Map<Integer, Map<Integer, String>> matchIdGrid) {
        List<Match> roundOne = new ArrayList<>();
        int r1Count = bracketSize / 2;

        for (int i = 0; i < r1Count; i++) {
            String pA = seeded.get(i * 2);
            String pB = seeded.get(i * 2 + 1);
            boolean isBye = isByeMatch(pA, pB);
            String winner = isBye ? resolveByeWinner(pA, pB) : null;
            String nextId = totalRounds > 1 ? matchIdGrid.get(2).get(i / 2) : null;
            String nextSlot = (i % 2 == 0) ? "A" : "B";

            roundOne.add(Match.builder()
                    .id(matchIdGrid.get(1).get(i))
                    .tournamentId(tournamentId)
                    .round(1).matchNumber(i + 1)
                    .participantAId(pA).participantBId(pB)
                    .status(isBye ? STATUS_COMPLETED : STATUS_PENDING)
                    .winnerId(winner)
                    .nextMatchId(nextId).nextMatchSlot(nextSlot)
                    .startTime(Instant.now().plusSeconds(3600L * (i + 1)))
                    .build());
        }
        return roundOne;
    }

    private List<Match> buildLaterRoundMatches(
            String tournamentId,
            int bracketSize,
            int totalRounds,
            Map<Integer, Map<Integer, String>> matchIdGrid) {
        List<Match> laterRounds = new ArrayList<>();
        for (int round = 2; round <= totalRounds; round++) {
            int count = bracketSize / (int) Math.pow(2, round);
            for (int i = 0; i < count; i++) {
                String nextId = (round < totalRounds) ? matchIdGrid.get(round + 1).get(i / 2) : null;
                String nextSlot = (i % 2 == 0) ? "A" : "B";

                laterRounds.add(Match.builder()
                        .id(matchIdGrid.get(round).get(i))
                        .tournamentId(tournamentId)
                        .round(round).matchNumber(i + 1)
                        .status(STATUS_PENDING)
                        .nextMatchId(nextId).nextMatchSlot(nextSlot)
                        .startTime(Instant.now().plusSeconds(3600L * 24 * round))
                        .build());
            }
        }
        return laterRounds;
    }

    private String resolveByeWinner(String pA, String pB) {
        return pA != null ? pA : pB;
    }

    private int nextPowerOfTwo(int n) {
        if (n <= 1)
            return 1;
        int p = 1;
        while (p < n)
            p <<= 1;
        return p;
    }

    /** True when one participant is null (BYE) and the other is present */
    private boolean isByeMatch(String a, String b) {
        return (a == null) != (b == null);
    }
}
