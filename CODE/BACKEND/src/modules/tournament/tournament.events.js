/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * Tournament Kafka event publishers.
 * Publishes tournament lifecycle events for downstream consumers.
 */

const { publishEvent } = require('../../config/kafka.config');

// Kafka topic constants
const TOPICS = {
    TOURNAMENT_CREATED: 'tournament.created',
    TOURNAMENT_STARTED: 'tournament.started',
    TOURNAMENT_ENDED: 'tournament.ended',
};

/**
 * Publish event when a new tournament is created.
 * @param {object} tournament - The created tournament record
 */
const publishTournamentCreated = async (tournament) => {
    await publishEvent(TOPICS.TOURNAMENT_CREATED, {
        eventType: 'TOURNAMENT_CREATED',
        tournamentId: tournament.id,
        name: tournament.name,
        game: tournament.game,
        type: tournament.type,
        maxParticipants: tournament.maxParticipants,
        hostId: tournament.hostId,
        prizePool: tournament.prizePool,
        entryFee: tournament.entryFee,
        startDate: tournament.startDate,
        timestamp: new Date().toISOString()
    });
};

/**
 * Publish event when a tournament transitions to ONGOING.
 * @param {string} tournamentId
 * @param {string} hostId
 */
const publishTournamentStarted = async (tournamentId, hostId) => {
    await publishEvent(TOPICS.TOURNAMENT_STARTED, {
        eventType: 'TOURNAMENT_STARTED',
        tournamentId,
        hostId,
        timestamp: new Date().toISOString()
    });
};

/**
 * Publish event when a tournament is completed.
 * @param {string} tournamentId
 * @param {string} winnerId - ID of the winning team/user
 * @param {number} prizePool
 */
const publishTournamentEnded = async (tournamentId, winnerId, prizePool) => {
    await publishEvent(TOPICS.TOURNAMENT_ENDED, {
        eventType: 'TOURNAMENT_ENDED',
        tournamentId,
        winnerId,
        prizePool,
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    TOPICS,
    publishTournamentCreated,
    publishTournamentStarted,
    publishTournamentEnded
};
