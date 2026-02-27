package com.titanarena.tournamentengine.bracket.strategy;

import com.titanarena.tournamentengine.domain.Match;

import java.util.List;

/**
 * Strategy interface for bracket generation algorithms.
 *
 * Implement this to add new formats:
 * - {@link SingleEliminationStrategy} (Phase 2 — DONE)
 * - DoubleEliminationStrategy (Phase 3+)
 * - RoundRobinStrategy (Phase 3+)
 * - SwissStrategy (future)
 */
public interface BracketStrategy {

    /**
     * @param tournamentId The tournament to generate a bracket for.
     * @param participants Ordered/seeded list of participant IDs (userId or
     *                     teamId).
     * @return All created Match objects, ordered by round → matchNumber.
     */
    List<Match> generate(String tournamentId, List<String> participants);

    /**
     * Human-readable round name from round number and total rounds.
     * e.g. round=3 of 3 → "Final", round=2 of 3 → "Semi Finals"
     */
    static String roundName(int round, int totalRounds) {
        int remaining = totalRounds - round + 1;
        return switch (remaining) {
            case 1 -> "Final";
            case 2 -> "Semi Finals";
            case 3 -> "Quarter Finals";
            default -> "Round " + round;
        };
    }
}
