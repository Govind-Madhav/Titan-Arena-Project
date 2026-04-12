package com.titanarena.tournamentengine.orchestration;

import com.titanarena.tournamentengine.bracket.BracketService;
import com.titanarena.tournamentengine.bracket.strategy.BracketStrategy;
import com.titanarena.tournamentengine.domain.Match;
import com.titanarena.tournamentengine.domain.MatchRepository;
import com.titanarena.tournamentengine.domain.Tournament;
import com.titanarena.tournamentengine.domain.TournamentRepository;
import com.titanarena.tournamentengine.event.dto.outbound.MatchScheduledEvent;
import com.titanarena.tournamentengine.event.producer.MatchEventProducer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

/**
 * Coordinates the full bracket lifecycle:
 * 1. Resolves approved participants for a tournament
 * 2. Delegates bracket generation to BracketService
 * 3. Publishes match.scheduled for each ready Round 1 match
 * 4. On match.completed: advances winner into next match + publishes it if
 * ready
 *
 * All public methods are @Async so the Kafka consumer thread is never blocked.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MatchOrchestratorService {

    private final BracketService bracketService;
    private final MatchEventProducer matchEventProducer;
    private final MatchRepository matchRepository;
    private final TournamentRepository tournamentRepository;
    private final ParticipantResolverService participantResolverService;

    @Async
    public void onTournamentCreated(@NonNull String tournamentId) {
        try {
            log.info("🏆 Orchestrating bracket for tournament: {}", tournamentId);

            Tournament tournament = tournamentRepository.findById(tournamentId).orElse(null);
            if (tournament == null) {
                log.warn("⚠️  Tournament {} not found in DB — skipping", tournamentId);
                return;
            }

            List<String> participants = participantResolverService.getApprovedParticipants(tournamentId);
            if (participants.isEmpty()) {
                log.warn("⚠️  No approved participants for tournament {} — skipping", tournamentId);
                return;
            }

            log.info("👥 {} participants for tournament {}", participants.size(), tournamentId);

            String format = tournament.getFormat() != null ? tournament.getFormat() : "SINGLE_ELIMINATION";
            List<Match> matches = bracketService.generateBracket(tournamentId, format, participants);

            int totalRounds = matches.stream().mapToInt(Match::getRound).max().orElse(1);

            // Publish match.scheduled only for Round 1 (later rounds have TBD participants)
            long published = 0;
            for (Match m : matches) {
                if (m.getRound() == 1 && !"COMPLETED".equals(m.getStatus())) {
                    matchEventProducer.publishMatchScheduled(toEvent(m, tournament, totalRounds));
                    published++;
                }
            }

            log.info("✅ Bracket ready: {} matches | {} Round-1 events published for tournament {}",
                    matches.size(), published, tournamentId);

        } catch (Exception e) {
            log.error("❌ Bracket generation failed for tournament {}: {}", tournamentId, e.getMessage(), e);
        }
    }

    @Async
    public void onMatchCompleted(@NonNull String matchId, @NonNull String winnerId) {
        try {
            Match completed = matchRepository.findById(matchId).orElse(null);
            if (completed == null)
                return; // Final match

            String nextMatchId = completed.getNextMatchId();
            if (nextMatchId == null)
                return;

            Match nextMatch = matchRepository.findById(nextMatchId).orElse(null);
            if (nextMatch == null)
                return;

            String completedTournamentId = completed.getTournamentId();
            if (completedTournamentId == null)
                return;

            Tournament tournament = tournamentRepository.findById(completedTournamentId).orElse(null);

            // Advance winner into the correct slot
            if ("A".equals(completed.getNextMatchSlot())) {
                nextMatch.setParticipantAId(winnerId);
            } else {
                nextMatch.setParticipantBId(winnerId);
            }
            nextMatch.setUpdatedAt(Instant.now());
            matchRepository.save(nextMatch);

            // Both slots filled → this match is now ready to play
            if (nextMatch.getParticipantAId() != null && nextMatch.getParticipantBId() != null) {
                List<Match> all = matchRepository.findByTournamentIdOrderByRoundAscMatchNumberAsc(
                    completedTournamentId);
                int totalRounds = all.stream().mapToInt(Match::getRound).max().orElse(1);
                matchEventProducer.publishMatchScheduled(toEvent(nextMatch, tournament, totalRounds));
                log.info("✅ Next match {} ready: {} vs {}",
                        nextMatch.getId(), nextMatch.getParticipantAId(), nextMatch.getParticipantBId());
            }

        } catch (Exception e) {
            log.error("❌ Error advancing winner for match {}: {}", matchId, e.getMessage(), e);
        }
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    private MatchScheduledEvent toEvent(Match m, Tournament t, int totalRounds) {
        return MatchScheduledEvent.builder()
                .eventType("MATCH_SCHEDULED")
                .matchId(m.getId())
                .tournamentId(m.getTournamentId())
                .tournamentName(t != null ? t.getName() : "Unknown")
                .round(BracketStrategy.roundName(m.getRound(), totalRounds))
                .matchNumber(m.getMatchNumber())
                .participantAId(m.getParticipantAId())
                .participantBId(m.getParticipantBId())
                .status(m.getStatus())
                .nextMatchId(m.getNextMatchId())
                .nextMatchSlot(m.getNextMatchSlot())
                // scheduledTime = tournament start so players know when to show up
                .scheduledTime(t != null && t.getStartTime() != null ? t.getStartTime().toString() : null)
                .timestamp(Instant.now().toString())
                .build();
    }
}
