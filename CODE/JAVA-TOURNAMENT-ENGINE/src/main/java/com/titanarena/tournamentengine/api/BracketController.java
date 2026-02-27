package com.titanarena.tournamentengine.api;

import com.titanarena.tournamentengine.bracket.BracketService;
import com.titanarena.tournamentengine.bracket.strategy.BracketStrategy;
import com.titanarena.tournamentengine.domain.Match;
import com.titanarena.tournamentengine.domain.TournamentRepository;
import com.titanarena.tournamentengine.orchestration.ParticipantResolverService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Public REST API — called by the Node.js backend to read bracket data.
 *
 * GET /api/brackets/{tournamentId} → bracket grouped by round name
 * POST /api/brackets/{tournamentId}/generate → manual bracket generation (admin
 * retry)
 */
@RestController
@RequestMapping("/api/brackets")
@RequiredArgsConstructor
@Slf4j
public class BracketController {

    private final BracketService bracketService;
    private final TournamentRepository tournamentRepository;
    private final ParticipantResolverService participantResolverService;

    @GetMapping("/{tournamentId}")
    public ResponseEntity<?> getBracket(@PathVariable String tournamentId) {
        if (!tournamentRepository.existsById(tournamentId)) {
            return ResponseEntity.notFound().build();
        }

        List<Match> matches = bracketService.getMatches(tournamentId);
        if (matches.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Bracket not yet generated",
                    "data", Map.of("rounds", List.of())));
        }

        int totalRounds = matches.stream().mapToInt(Match::getRound).max().orElse(1);
        Map<String, List<Match>> grouped = matches.stream()
                .collect(Collectors.groupingBy(m -> BracketStrategy.roundName(m.getRound(), totalRounds)));

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", Map.of(
                        "tournamentId", tournamentId,
                        "totalRounds", totalRounds,
                        "totalMatches", matches.size(),
                        "rounds", grouped)));
    }

    @PostMapping("/{tournamentId}/generate")
    public ResponseEntity<?> generateBracket(
            @PathVariable String tournamentId,
            @RequestParam(defaultValue = "SINGLE_ELIMINATION") String format) {
        if (!tournamentRepository.existsById(tournamentId)) {
            return ResponseEntity.notFound().build();
        }

        List<String> participants = participantResolverService.getApprovedParticipants(tournamentId);
        if (participants.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "No approved participants found"));
        }

        List<Match> matches = bracketService.generateBracket(tournamentId, format, participants);
        log.info("🔧 Manual bracket generation: tournament={} format={} matches={}", tournamentId, format,
                matches.size());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Bracket generated",
                "data", Map.of("matchesCreated", matches.size(), "format", format)));
    }
}
