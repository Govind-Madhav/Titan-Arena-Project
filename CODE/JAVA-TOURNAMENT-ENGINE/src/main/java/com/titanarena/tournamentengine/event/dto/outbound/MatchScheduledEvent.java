package com.titanarena.tournamentengine.event.dto.outbound;

import lombok.Builder;
import lombok.Data;

/**
 * Payload for `match.scheduled` events published by the Java engine.
 * Consumed by Node.js notification and stats services.
 */
@Data
@Builder
public class MatchScheduledEvent {
    private String eventType; // MATCH_SCHEDULED
    private String matchId;
    private String tournamentId;
    private String tournamentName;
    private String round; // "Final" / "Semi Finals" / "Round N"
    private Integer matchNumber;
    private String participantAId; // null = TBD
    private String participantBId;
    private String status; // PENDING
    private String nextMatchId;
    private String nextMatchSlot; // "A" or "B"
    private String scheduledTime; // ISO-8601: tournament.startTime — when this match is due to be played
    private String timestamp; // event creation time
}
