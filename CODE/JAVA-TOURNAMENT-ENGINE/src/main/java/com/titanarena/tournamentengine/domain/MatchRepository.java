package com.titanarena.tournamentengine.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MatchRepository extends JpaRepository<Match, String> {

    List<Match> findByTournamentIdOrderByRoundAscMatchNumberAsc(String tournamentId);

    @Query("SELECT m FROM Match m WHERE m.tournamentId = :tId AND m.round = :round ORDER BY m.matchNumber ASC")
    List<Match> findByTournamentIdAndRound(@Param("tId") String tournamentId, @Param("round") int round);

    boolean existsByTournamentId(String tournamentId);
}
