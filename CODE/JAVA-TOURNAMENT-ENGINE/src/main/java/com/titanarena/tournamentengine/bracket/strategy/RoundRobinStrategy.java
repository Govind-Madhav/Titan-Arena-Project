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
@Component
@RequiredArgsConstructor
@Slf4j
public class RoundRobinStrategy implements BracketStrategy {

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

        List<String> roster = createRoster(participants);

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
            allMatches.addAll(buildRoundMatches(tournamentId, circle, n, round));

            // Rotate: fix position 0, rotate positions 1..n-1 clockwise by 1
            rotateClockwise(circle);
        }

        List<Match> saved = matchRepository.saveAll(allMatches);
        log.info("✅ [RoundRobin] {} matches across {} rounds for tournament {}", saved.size(), totalRounds,
                tournamentId);
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

    private List<String> createRoster(List<String> participants) {
        List<String> roster = new ArrayList<>(participants);
        if (roster.size() % 2 != 0) {
            roster.add(null);
        }
        return roster;
    }

    private List<Match> buildRoundMatches(String tournamentId, List<String> circle, int rosterSize, int round) {
        int matchesInRound = rosterSize / 2;
        int scheduledOffsetHours = 24 * round;
        List<Match> matches = new ArrayList<>();

        for (int i = 0; i < matchesInRound; i++) {
            String pA = circle.get(i);
            String pB = circle.get(rosterSize - 1 - i);
            boolean isBye = (pA == null || pB == null);
            String byeWinner = isBye ? resolveByeWinner(pA, pB) : null;

            matches.add(Match.builder()
                    .id(UUID.randomUUID().toString())
                    .tournamentId(tournamentId)
                    .round(round)
                    .matchNumber(i + 1)
                    .participantAId(pA)
                    .participantBId(pB)
                    .status(isBye ? STATUS_COMPLETED : STATUS_PENDING)
                    .winnerId(byeWinner)
                    .bracketSection("ROUND_ROBIN")
                    .startTime(Instant.now().plusSeconds(3600L * scheduledOffsetHours + 1800L * i))
                    .build());
        }
        return matches;
    }

    private String resolveByeWinner(String pA, String pB) {
        return pA != null ? pA : pB;
    }

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
