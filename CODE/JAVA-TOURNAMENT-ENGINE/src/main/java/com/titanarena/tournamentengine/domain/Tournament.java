package com.titanarena.tournamentengine.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * READ-ONLY mirror of the `tournaments` table managed by Node.js/Drizzle.
 * Java never mutates this — ddl-auto=none enforces it.
 */
@Entity
@Table(name = "tournaments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Tournament {

    @Id
    @Column(name = "id", nullable = false)
    private String id;

    @Column(name = "name")
    private String name;

    @Column(name = "game")
    private String game;

    @Column(name = "type")
    private String type; // SOLO, TEAM

    @Column(name = "format")
    private String format; // SINGLE_ELIMINATION, DOUBLE_ELIMINATION, ROUND_ROBIN

    @Column(name = "status")
    private String status;

    @Column(name = "max_participants")
    private Integer maxParticipants;

    @Column(name = "prize_pool", precision = 12, scale = 2)
    private BigDecimal prizePool;

    @Column(name = "entry_fee", precision = 10, scale = 2)
    private BigDecimal entryFee;

    @Column(name = "host_id")
    private String hostId;

    @Column(name = "start_time")
    private Instant startTime;

    @Column(name = "end_time")
    private Instant endTime;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;
}
