package com.titanarena.tournamentengine.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.Instant;

/**
 * Maps to the `matches` table.
 * Java WRITES bracket matches here; Node.js reads them for result submission.
 */
@Entity
@Table(name = "matches")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Match {

    @Id
    @Column(name = "id", nullable = false)
    private String id;

    @Column(name = "tournament_id", nullable = false)
    private String tournamentId;

    @Column(name = "round", nullable = false)
    private Integer round;

    @Column(name = "match_number", nullable = false)
    private Integer matchNumber;

    /** NULL until previous round's match concludes */
    @Column(name = "participant_a_id")
    private String participantAId;

    @Column(name = "participant_b_id")
    private String participantBId;

    @Column(name = "winner_id")
    private String winnerId;

    @Column(name = "score_a")
    private Integer scoreA;

    @Column(name = "score_b")
    private Integer scoreB;

    /** PENDING → IN_PROGRESS → COMPLETED */
    @Column(name = "status")
    @Builder.Default
    private String status = "PENDING";

    /** Which match the winner advances into */
    @Column(name = "next_match_id")
    private String nextMatchId;

    /** "A" or "B" slot in the next match */
    @Column(name = "next_match_slot")
    private String nextMatchSlot;

    @Column(name = "scheduled_at")
    private Instant scheduledAt;

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();

    /** Where the LOSER of this match goes (Double Elimination only) */
    @Column(name = "loser_next_match_id")
    private String loserNextMatchId;

    /** "A" or "B" slot in the loser's next match */
    @Column(name = "loser_next_match_slot")
    private String loserNextMatchSlot;

    /** WINNERS | LOSERS | GRAND_FINAL | ROUND_ROBIN */
    @Column(name = "bracket_section")
    @Builder.Default
    private String bracketSection = "WINNERS";

    @Column(name = "updated_at")
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
