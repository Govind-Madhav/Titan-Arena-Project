package com.titanarena.tournamentengine.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * READ-ONLY mirror of the `tournament` table managed by Node.js/Drizzle.
 * Java never mutates this — ddl-auto=none enforces it.
 */
@Entity
@Table(name = "tournament")
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

    @Column(name = "maxParticipants")
    private Integer maxParticipants;

    @Column(name = "prizePool", precision = 12, scale = 2)
    private BigDecimal prizePool;

    @Column(name = "entryFee", precision = 10, scale = 2)
    private BigDecimal entryFee;

    @Column(name = "hostId")
    private String hostId;

    @Column(name = "startTime")
    private Instant startTime;

    @Column(name = "endTime")
    private Instant endTime;

    @Column(name = "createdAt")
    private Instant createdAt;

    @Column(name = "updatedAt")
    private Instant updatedAt;
}
