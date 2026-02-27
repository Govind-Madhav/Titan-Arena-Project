package com.titanarena.tournamentengine.event.producer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.titanarena.tournamentengine.event.dto.outbound.MatchScheduledEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

/**
 * Publishes outbound Kafka events from the Java engine.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MatchEventProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.kafka.topics.match-scheduled}")
    private String matchScheduledTopic;

    public void publishMatchScheduled(MatchScheduledEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(matchScheduledTopic, event.getMatchId(), payload)
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            log.error("❌ Failed to publish match.scheduled for match {}: {}",
                                    event.getMatchId(), ex.getMessage());
                        } else {
                            log.info("📤 match.scheduled → matchId={} round='{}'",
                                    event.getMatchId(), event.getRound());
                        }
                    });
        } catch (Exception e) {
            log.error("❌ Serialization error: {}", e.getMessage(), e);
        }
    }
}
