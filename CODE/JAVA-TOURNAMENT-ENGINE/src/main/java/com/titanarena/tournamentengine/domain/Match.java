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
@Table(name = "match")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Match {

    @Id
    @Column(name = "id", nullable = false)
    private String id;

    @Column(name = "tournamentId", nullable = false)
    private String tournamentId;

    @Column(name = "round", nullable = false)
    private Integer round;

    @Column(name = "matchNumber", nullable = false)
    private Integer matchNumber;

    /** NULL until previous round's match concludes */
    @Column(name = "participantAId")
    private String participantAId;

    @Column(name = "participantBId")
    private String participantBId;

    @Column(name = "winnerId")
    private String winnerId;

    @Column(name = "scoreA")
    private Integer scoreA;

    @Column(name = "scoreB")
    private Integer scoreB;

    /** PENDING → IN_PROGRESS → COMPLETED */
    @Column(name = "status")
    @Builder.Default
    private String status = "PENDING";

    /** Which match the winner advances into */
    @Column(name = "nextMatchId")
    private String nextMatchId;

    /** "A" or "B" slot in the next match */
    @Column(name = "nextMatchSlot")
    private String nextMatchSlot;

    @Column(name = "startTime")
    private Instant startTime;

    @Column(name = "createdAt")
    @Builder.Default
    private Instant createdAt = Instant.now();

    /** Where the LOSER of this match goes (Double Elimination only) */
    @Column(name = "loserNextMatchId")
    private String loserNextMatchId;

    /** "A" or "B" slot in the loser's next match */
    @Column(name = "loserNextMatchSlot")
    private String loserNextMatchSlot;

    /** WINNERS | LOSERS | GRAND_FINAL | ROUND_ROBIN */
    @Column(name = "bracketSection")
    @Builder.Default
    private String bracketSection = "WINNERS";

    @Column(name = "updatedAt")
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
