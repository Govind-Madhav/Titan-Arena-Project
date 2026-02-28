/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * Stats Kafka Consumer.
 * Listens to match.completed events and updates stats asynchronously.
 * This decouples stat tracking from the match result submission flow.
 */

const { createConsumer } = require('../../config/kafka.config');
const { db } = require('../../db');
const { mmrRatings } = require('../../db/schema');
const { sql, eq } = require('drizzle-orm');

const TOPICS = ['match.completed', 'tournament.ended'];
const GROUP_ID = 'stats-service';

const handleMatchCompleted = async (payload) => {
    const { matchId, tournamentId, winnerId, loserId, scoreA, scoreB } = payload;

    console.log(`📊 Stats Consumer: Match ${matchId} completed — Winner: ${winnerId}, Loser: ${loserId}`);

    try {
        await db.transaction(async (tx) => {
            // Update Winner Stats (+15 MMR)
            if (winnerId) {
                await tx.insert(mmrRatings)
                    .values({ userId: winnerId, rating: 1015, gamesPlayed: 1, wins: 1, currentStreak: 1 })
                    .onConflictDoUpdate({
                        target: mmrRatings.userId,
                        set: {
                            rating: sql`${mmrRatings.rating} + 15`,
                            gamesPlayed: sql`${mmrRatings.gamesPlayed} + 1`,
                            wins: sql`${mmrRatings.wins} + 1`,
                            currentStreak: sql`CASE WHEN ${mmrRatings.currentStreak} < 0 THEN 1 ELSE ${mmrRatings.currentStreak} + 1 END`
                        }
                    });
            }

            // Update Loser Stats (-10 MMR)
            if (loserId) {
                await tx.insert(mmrRatings)
                    .values({ userId: loserId, rating: 990, gamesPlayed: 1, losses: 1, currentStreak: -1 })
                    .onConflictDoUpdate({
                        target: mmrRatings.userId,
                        set: {
                            rating: sql`GREATEST(${mmrRatings.rating} - 10, 0)`,
                            gamesPlayed: sql`${mmrRatings.gamesPlayed} + 1`,
                            losses: sql`${mmrRatings.losses} + 1`,
                            currentStreak: sql`CASE WHEN ${mmrRatings.currentStreak} > 0 THEN -1 ELSE ${mmrRatings.currentStreak} - 1 END`
                        }
                    });
            }
        });
        console.log(`✅ Stats Consumer: MMR updated for Match ${matchId}`);
    } catch (error) {
        console.error(`❌ Stats Consumer: Failed to update MMR for Match ${matchId}`, error);
    }
};

const handleTournamentEnded = async (payload) => {
    const { tournamentId, winnerId, prizePool } = payload;

    console.log(`📊 Stats Consumer: Tournament ${tournamentId} ended — Winner: ${winnerId}`);

    if (winnerId) {
        try {
            // Bonus 50 MMR for winning a tournament
            await db.insert(mmrRatings)
                .values({ userId: winnerId, rating: 1050 })
                .onConflictDoUpdate({
                    target: mmrRatings.userId,
                    set: { rating: sql`${mmrRatings.rating} + 50` }
                });
            console.log(`✅ Stats Consumer: Tournament Bonus MMR applied for ${winnerId}`);
        } catch (error) {
            console.error(`❌ Stats Consumer: Failed to apply Tournament Bonus`, error);
        }
    }
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
