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
 * Round Robin bracket strategy.
 *
 * Every participant plays every other participant exactly once.
 * Matches are grouped into "rounds" using the circle method for even-count
 * scheduling.
 * If the participant count is odd, one participant gets a BYE each round.
 *
 * Total matches = N*(N-1)/2
 * Total rounds = N-1 (even N) or N (odd N)
 * Matches/round = N/2 (floor)
 *
 * All matches are created immediately (status=PENDING).
 * nextMatchId/nextMatchSlot are null — Round Robin has no bracket progression.
 * bracketSection = "ROUND_ROBIN"
 *
 * The round field (1..totalRounds) is used as the "game week" / "matchday".
 *
 * @see BracketStrategy
 */
@Component("ROUND_ROBIN")
@RequiredArgsConstructor
@Slf4j
public class RoundRobinStrategy implements BracketStrategy {

    private final MatchRepository matchRepository;

    @Override
    @Transactional
    public List<Match> generate(String tournamentId, List<String> participants) {
        if (matchRepository.existsByTournamentId(tournamentId)) {
            log.warn("⚠️  Bracket already exists for tournament {} — skipping", tournamentId);
            return matchRepository.findByTournamentIdOrderByRoundAscMatchNumberAsc(tournamentId);
        }

        List<String> roster = new ArrayList<>(participants);
        boolean hasOddCount = roster.size() % 2 != 0;
        if (hasOddCount)
            roster.add(null); // add phantom BYE player for odd counts

        int n = roster.size();
        int totalRounds = n - 1;

        log.info("🔄 [RoundRobin] tournament={} | players={} | rounds={} | totalMatches={}",
                tournamentId, participants.size(), totalRounds, (n * (n - 1)) / 2);

        List<Match> allMatches = new ArrayList<>();

        // ─── Circle Algorithm ─────────────────────────────────────────────────
        // Fix player at index 0, rotate the rest clockwise each round.
        // Each iteration of the outer loop = one round (matchday).
        List<String> circle = new ArrayList<>(roster);

        for (int round = 1; round <= totalRounds; round++) {
            int matchesInRound = n / 2;
            int scheduledOffsetHours = 24 * round; // 1 day between rounds

            for (int i = 0; i < matchesInRound; i++) {
                String pA = circle.get(i);
                String pB = circle.get(n - 1 - i);

                // Skip BYE matches (one participant is the phantom null)
                boolean isBye = (pA == null || pB == null);

                allMatches.add(Match.builder()
                        .id(UUID.randomUUID().toString())
                        .tournamentId(tournamentId)
                        .round(round)
                        .matchNumber(i + 1)
                        .participantAId(pA)
                        .participantBId(pB)
                        .status(isBye ? "COMPLETED" : "PENDING")
                        .winnerId(isBye ? (pA != null ? pA : pB) : null)
                        .bracketSection("ROUND_ROBIN")
                        .scheduledAt(Instant.now().plusSeconds(3600L * scheduledOffsetHours + 1800L * i))
                        .build());
            }

            // Rotate: fix position 0, rotate positions 1..n-1 clockwise by 1
            rotateClockwise(circle);
        }

        List<Match> saved = matchRepository.saveAll(allMatches);
        log.info("✅ [RoundRobin] {} matches across {} rounds for tournament {}", saved.size(), totalRounds,
                tournamentId);
        return saved;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Rotates elements at indices 1..n-1 clockwise by one position.
     * Element at index 1 goes to the end; all others shift left by 1.
     * Element at index 0 is fixed (standard circle-method rotation).
     */
    private void rotateClockwise(List<String> list) {
        if (list.size() <= 2)
            return;
        // Take last element (index n-1) and insert it at index 1
        String last = list.remove(list.size() - 1);
        list.add(1, last);
    }
}
