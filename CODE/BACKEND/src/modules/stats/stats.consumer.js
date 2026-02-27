/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * Stats Kafka Consumer.
 * Listens to match.completed events and updates stats asynchronously.
 * This decouples stat tracking from the match result submission flow.
 */

const { createConsumer } = require('../../config/kafka.config');

const TOPICS = ['match.completed', 'tournament.ended'];
const GROUP_ID = 'stats-service';

/**
 * Handle a match.completed event.
 * Currently logs the event; extend to write to a dedicated stats/leaderboard table.
 * Phase 3 (CQRS) will update Redis sorted sets here.
 */
const handleMatchCompleted = async (payload) => {
    const { matchId, tournamentId, winnerId, loserId, scoreA, scoreB } = payload;

    // TODO (Phase 3): Update Redis leaderboard sorted set
    // await redis.zIncrBy('leaderboard:global', WIN_POINTS, winnerId);
    // await redis.zIncrBy('leaderboard:global', LOSS_POINTS, loserId);

    console.log(`📊 Stats Consumer: Match ${matchId} completed — Winner: ${winnerId}, Loser: ${loserId}`);
    // Stats are currently computed on-demand via stats.service.js (calculateUserStats).
    // This consumer is the hook point for Phase 3 CQRS leaderboard updates.
};

/**
 * Handle a tournament.ended event.
 * Awards bonus points to the tournament winner.
 */
const handleTournamentEnded = async (payload) => {
    const { tournamentId, winnerId, prizePool } = payload;

    // TODO (Phase 3): Award tournament win bonus in Redis leaderboard
    // await redis.zIncrBy('leaderboard:global', TOURNAMENT_WIN_BONUS, winnerId);

    console.log(`📊 Stats Consumer: Tournament ${tournamentId} ended — Winner: ${winnerId}`);
};

/**
 * Start the stats Kafka consumer.
 * Called once at server startup.
 */
const startStatsConsumer = async () => {
    const consumer = createConsumer(GROUP_ID);
    if (!consumer) {
        console.warn('⚠️  Stats Consumer: Kafka disabled, skipping.');
        return;
    }

    try {
        await consumer.connect();
        await consumer.subscribe({ topics: TOPICS, fromBeginning: false });

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                let payload;
                try {
                    payload = JSON.parse(message.value.toString());
                } catch (e) {
                    console.error(`❌ Stats Consumer: Failed to parse message on [${topic}]`, e.message);
                    return;
                }

                console.log(`📥 Stats Consumer: Received [${topic}]`, payload);

                switch (topic) {
                    case 'match.completed':
                        await handleMatchCompleted(payload);
                        break;
                    case 'tournament.ended':
                        await handleTournamentEnded(payload);
                        break;
                }
            }
        });

        console.log('✅ Stats Consumer: Listening on topics:', TOPICS.join(', '));
    } catch (err) {
        console.error('❌ Stats Consumer: Failed to start:', err.message);
    }
};

module.exports = { startStatsConsumer };
