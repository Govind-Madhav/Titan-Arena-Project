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
@Component("SINGLE_ELIMINATION")
@RequiredArgsConstructor
@Slf4j
public class SingleEliminationStrategy implements BracketStrategy {

    private final MatchRepository matchRepository;

    @Override
    @Transactional
    public List<Match> generate(String tournamentId, List<String> participants) {
        if (matchRepository.existsByTournamentId(tournamentId)) {
            log.warn("⚠️  Bracket already exists for tournament {} — skipping", tournamentId);
            return matchRepository.findByTournamentIdOrderByRoundAscMatchNumberAsc(tournamentId);
        }

        int bracketSize = nextPowerOfTwo(participants.size());
        int totalRounds = (int) (Math.log(bracketSize) / Math.log(2));

        List<String> seeded = new ArrayList<>(participants);
        while (seeded.size() < bracketSize)
            seeded.add(null); // add BYEs

        log.info("🏆 [SingleElim] tournament={} | participants={} | bracketSize={} | rounds={}",
                tournamentId, participants.size(), bracketSize, totalRounds);

        // Pre-generate all match IDs: round → matchIndex → UUID
        Map<Integer, Map<Integer, String>> matchIdGrid = new HashMap<>();
        for (int round = 1; round <= totalRounds; round++) {
            int count = bracketSize / (int) Math.pow(2, round);
            matchIdGrid.put(round, new HashMap<>());
            for (int i = 0; i < count; i++) {
                matchIdGrid.get(round).put(i, UUID.randomUUID().toString());
            }
        }

        List<Match> allMatches = new ArrayList<>();

        // Round 1: seed actual participants
        int r1Count = bracketSize / 2;
        for (int i = 0; i < r1Count; i++) {
            String pA = seeded.get(i * 2);
            String pB = seeded.get(i * 2 + 1);

            boolean isBye = isByeMatch(pA, pB);
            String winner = isBye ? (pA != null ? pA : pB) : null;
            String nextId = totalRounds > 1 ? matchIdGrid.get(2).get(i / 2) : null;
            String nextSlot = (i % 2 == 0) ? "A" : "B";

            allMatches.add(Match.builder()
                    .id(matchIdGrid.get(1).get(i))
                    .tournamentId(tournamentId)
                    .round(1).matchNumber(i + 1)
                    .participantAId(pA).participantBId(pB)
                    .status(isBye ? "COMPLETED" : "PENDING")
                    .winnerId(winner)
                    .nextMatchId(nextId).nextMatchSlot(nextSlot)
                    .scheduledAt(Instant.now().plusSeconds(3600L * (i + 1)))
                    .build());
        }

        // Rounds 2..N: TBD participants
        for (int round = 2; round <= totalRounds; round++) {
            int count = bracketSize / (int) Math.pow(2, round);
            for (int i = 0; i < count; i++) {
                String nextId = (round < totalRounds) ? matchIdGrid.get(round + 1).get(i / 2) : null;
                String nextSlot = (i % 2 == 0) ? "A" : "B";

                allMatches.add(Match.builder()
                        .id(matchIdGrid.get(round).get(i))
                        .tournamentId(tournamentId)
                        .round(round).matchNumber(i + 1)
                        .status("PENDING")
                        .nextMatchId(nextId).nextMatchSlot(nextSlot)
                        .scheduledAt(Instant.now().plusSeconds(3600L * 24 * round))
                        .build());
            }
        }

        List<Match> saved = matchRepository.saveAll(allMatches);
        log.info("✅ [SingleElim] {} matches created for tournament {}", saved.size(), tournamentId);
        return saved;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

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
