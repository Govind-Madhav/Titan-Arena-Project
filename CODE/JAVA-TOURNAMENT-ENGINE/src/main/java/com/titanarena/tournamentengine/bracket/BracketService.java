package com.titanarena.tournamentengine.bracket;

import com.titanarena.tournamentengine.bracket.strategy.BracketStrategy;
import com.titanarena.tournamentengine.domain.Match;
import com.titanarena.tournamentengine.domain.MatchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Facade over the bracket strategy system.
 *
 * Selects the appropriate {@link BracketStrategy} implementation
 * based on the tournament format (SINGLE_ELIMINATION, DOUBLE_ELIMINATION, etc.)
 * and delegates generation to it.
 *
 * To add a new format: implement BracketStrategy, annotate
 * with @Component("FORMAT_NAME"),
 * and it will be automatically picked up here.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BracketService {

    /** All BracketStrategy beans, keyed by their @Component qualifier */
    private final Map<String, BracketStrategy> strategies;
    private final MatchRepository matchRepository;

    /**
     * Generates a bracket for the given tournament using the appropriate strategy.
     *
     * @param tournamentId The tournament ID.
     * @param format       Tournament format ("SINGLE_ELIMINATION", "ROUND_ROBIN",
     *                     etc.)
     * @param participants Shuffled/seeded list of participant IDs.
     * @return All created Match objects.
     */
    public List<Match> generateBracket(String tournamentId, String format, List<String> participants) {
        String key = (format != null) ? format.toUpperCase() : "SINGLE_ELIMINATION";
        BracketStrategy strategy = strategies.getOrDefault(key, strategies.get("SINGLE_ELIMINATION"));

        if (strategy == null) {
            throw new IllegalStateException("No BracketStrategy registered for format: " + key);
        }

        log.info("🎯 Using strategy [{}] for tournament {}", key, tournamentId);
        return strategy.generate(tournamentId, participants);
    }

    /**
     * Fetches all matches for a tournament, ordered by round and match number.
     */
    public List<Match> getMatches(String tournamentId) {
        return matchRepository.findByTournamentIdOrderByRoundAscMatchNumberAsc(tournamentId);
    }
}
