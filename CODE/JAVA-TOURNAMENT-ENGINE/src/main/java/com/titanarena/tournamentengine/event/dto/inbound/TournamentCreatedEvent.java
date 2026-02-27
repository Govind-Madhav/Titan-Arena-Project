package com.titanarena.tournamentengine.event.dto.inbound;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Deserializes the `tournament.created` Kafka event published by Node.js.
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class TournamentCreatedEvent {
    private String eventType;
    private String tournamentId;
    private String name;
    private String game;
    private String type; // SOLO, TEAM
    private String format; // SINGLE_ELIMINATION, etc.
    private Integer maxParticipants;
    private String hostId;
    private Double prizePool;
    private Double entryFee;
    private String startDate;
    private String timestamp;
}
