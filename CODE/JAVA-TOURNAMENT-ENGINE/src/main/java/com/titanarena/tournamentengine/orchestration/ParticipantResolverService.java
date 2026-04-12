package com.titanarena.tournamentengine.orchestration;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

/**
 * Resolves the approved participant list for a tournament.
 *
 * Uses JdbcTemplate (not JPA) to avoid a full entity for a simple lookup.
 * Shuffles results for fair random seeding.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ParticipantResolverService {

    private final JdbcTemplate jdbcTemplate;

    public List<String> getApprovedParticipants(String tournamentId) {
        try {
            String sql = """
                                        SELECT "userId"
                                        FROM registration
                                        WHERE "tournamentId" = ?
                      AND status = 'APPROVED'
                                        ORDER BY "createdAt" ASC
                    """;

            List<String> participants = jdbcTemplate.queryForList(sql, String.class, tournamentId);
            Collections.shuffle(participants); // fair seeding
            log.info("📋 {} approved participants resolved for tournament {}", participants.size(), tournamentId);
            return participants;

        } catch (Exception e) {
            log.error("❌ Failed to resolve participants for tournament {}: {}", tournamentId, e.getMessage());
            return Collections.emptyList();
        }
    }
}
