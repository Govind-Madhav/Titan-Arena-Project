package com.titanarena.tournamentengine.event.consumer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.titanarena.tournamentengine.orchestration.MatchOrchestratorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

/**
 * Inbound Kafka listeners for the Java engine.
 *
 * Subscribes to:
 * - tournament.started → generate bracket; fired by Node.js when status
 * transitions to REG_CLOSED (not ONGOING). At this point the roster is
 * locked, so the bracket is built immediately and players can see their
 * seedings / opponent before the tournament actually begins.
 * - match.completed → advance winner to next match
 *
 * Uses MANUAL acknowledgment: offset only committed on success.
 * All heavy work delegated to @Async orchestrator (consumer thread never
 * blocks).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TournamentEventConsumer {

    private final MatchOrchestratorService orchestrator;
    private final ObjectMapper objectMapper;

    /**
     * tournament.started → bracket generation.
     * Fired by Node.js when host closes registration (status → REG_CLOSED).
     * At this point all desired registrations are APPROVED and the roster is
     * locked. The bracket is pre-built so players can see matchups before
     * the tournament begin time (tournament.live / ONGOING event).
     */
    @KafkaListener(topics = "${app.kafka.topics.tournament-started}", groupId = "${spring.kafka.consumer.group-id}", containerFactory = "kafkaListenerContainerFactory")
    public void onTournamentStarted(
            @Payload String message,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment ack) {
        log.info("📥 [{}] {}", topic, message);
        try {
            JsonNode node = objectMapper.readTree(message);
            String tournamentId = node.path("tournamentId").asText(null);
            if (tournamentId == null || tournamentId.isBlank()) {
                log.warn("⚠️  Missing tournamentId in tournament.started — skipping");
                ack.acknowledge();
                return;
            }
            orchestrator.onTournamentCreated(tournamentId); // reuses same orchestration logic
            ack.acknowledge();
        } catch (Exception e) {
            log.error("❌ Error processing tournament.started: {}", e.getMessage(), e);
            // No ack → Kafka will retry
        }
    }

    /**
     * match.completed → advance winner into next match slot.
     */
    @KafkaListener(topics = "${app.kafka.topics.match-completed}", groupId = "${spring.kafka.consumer.group-id}", containerFactory = "kafkaListenerContainerFactory")
    public void onMatchCompleted(
            @Payload String message,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment ack) {
        log.info("📥 [{}] {}", topic, message);
        try {
            JsonNode node = objectMapper.readTree(message);
            String matchId = node.path("matchId").asText(null);
            String winnerId = node.path("winnerId").asText(null);

            if (matchId == null || winnerId == null) {
                log.warn("⚠️  Missing matchId/winnerId — skipping");
                ack.acknowledge();
                return;
            }
            orchestrator.onMatchCompleted(matchId, winnerId);
            ack.acknowledge();
        } catch (Exception e) {
            log.error("❌ Error processing match.completed: {}", e.getMessage(), e);
        }
    }
}
