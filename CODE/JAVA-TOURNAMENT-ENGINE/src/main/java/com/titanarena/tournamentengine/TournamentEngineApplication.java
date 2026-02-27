package com.titanarena.tournamentengine;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class TournamentEngineApplication {

    public static void main(String[] args) {
        SpringApplication.run(TournamentEngineApplication.class, args);
    }
}
