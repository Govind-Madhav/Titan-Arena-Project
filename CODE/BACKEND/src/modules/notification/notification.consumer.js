/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * Notification Kafka Consumer.
 * Listens to match and tournament events and creates in-app notifications.
 */

const { createConsumer } = require('../../config/kafka.config');
const notificationController = require('./notification.controller');
const { db } = require('../../db');
const { matches, registrations, teamMembers, users, tournaments } = require('../../db/schema');
const { eq, or } = require('drizzle-orm');
const emailService = require('../../services/email.service');

const TOPICS = ['match.completed', 'tournament.created', 'tournament.started', 'tournament.ended', 'tournament.live'];
const GROUP_ID = 'notification-service';

/**
 * Resolve user IDs to notify for a completed match.
 * For SOLO: participantAId / participantBId are userIds directly.
 * For TEAM: look up team members.
 */
const resolveMatchParticipantUserIds = async (matchData) => {
    const { participantAId, participantBId, tournamentType } = matchData;
    const ids = [participantAId, participantBId].filter(Boolean);

    if (tournamentType === 'SOLO') {
        return ids; // already user IDs
    }

    // TEAM mode — resolve team members
    const members = await db
        .select({ userId: teamMembers.userId })
        .from(teamMembers)
        .where(
            or(
                eq(teamMembers.teamId, participantAId),
                eq(teamMembers.teamId, participantBId)
            )
        );

    return members.map(m => m.userId);
};

/**
 * Handle a match.completed event.
 */
const handleMatchCompleted = async (payload) => {
    const { matchId, tournamentId, winnerId, loserId, tournamentType, tournamentName } = payload;
    const isTeam = (tournamentType || 'SOLO') === 'TEAM';

    // Resolve all notifiable userIds
    const allUserIds = await resolveMatchParticipantUserIds({
        participantAId: winnerId,
        participantBId: loserId,
        tournamentType: tournamentType || 'SOLO'
    });

    // For team mode: also resolve winning team member ids separately for correct isWinner
    let winnerUserIds = new Set();
    if (isTeam && winnerId) {
        const winMembers = await db
            .select({ userId: teamMembers.userId })
            .from(teamMembers)
            .where(eq(teamMembers.teamId, winnerId));
        winMembers.forEach(m => winnerUserIds.add(m.userId));
    }

    for (const userId of allUserIds) {
        // Solo: userId === winnerId.  Team: userId is in winning team's member set
        const isWinner = isTeam ? winnerUserIds.has(userId) : userId === winnerId;
        await notificationController.send(
            userId,
            isWinner ? '🏆 Match Won!' : '❌ Match Lost',
            isWinner
                ? `You won your match in "${tournamentName || 'the tournament'}"! Keep it up.`
                : `You lost your match in "${tournamentName || 'the tournament'}". Better luck next time!`,
            isWinner ? 'SUCCESS' : 'INFO',
            { matchId, tournamentId }
        );
    }

    console.log(`✅ Notification: Sent match result notifications for match ${matchId}`);
};

/**
 * Handle a tournament.started event — notify all registered participants.
 */
const handleTournamentStarted = async (payload) => {
    const { tournamentId } = payload;

    const regs = await db
        .select({
            userId: registrations.userId,
            user: { email: users.email, username: users.username },
            tournament: { name: tournaments.name }
        })
        .from(registrations)
        .innerJoin(users, eq(registrations.userId, users.id))
        .innerJoin(tournaments, eq(registrations.tournamentId, tournaments.id))
        .where(eq(registrations.tournamentId, tournamentId));

    for (const reg of regs) {
        await notificationController.send(
            reg.userId,
            '📅 Schedule Ready!',
            `The schedule for your tournament is ready. Opponents will be revealed when matches begin.`,
            'INFO',
            { tournamentId }
        );

        // Also fetch user details for email
        if (reg.user?.email) {
            await emailService.sendTournamentStart({
                to: reg.user.email,
                username: reg.user.username,
                tournamentName: reg.tournament?.name || 'Your Tournament',
                tournamentId
            });
        }
    }

    console.log(`✅ Notification: Sent tournament started notifications for ${tournamentId}`);
};

const handleTournamentLive = async (payload) => {
    const { tournamentId } = payload;

    const regs = await db
        .select({
            userId: registrations.userId,
            user: { email: users.email, username: users.username },
            tournament: { name: tournaments.name }
        })
        .from(registrations)
        .innerJoin(users, eq(registrations.userId, users.id))
        .innerJoin(tournaments, eq(registrations.tournamentId, tournaments.id))
        .where(eq(registrations.tournamentId, tournamentId));

    for (const reg of regs) {
        await notificationController.send(
            reg.userId,
            '🔥 Matches are LIVE!',
            `Your tournament has officially started! Your opponents are now revealed. Good luck!`,
            'SUCCESS',
            { tournamentId }
        );

        if (reg.user?.email) {
            await emailService.sendTournamentLive({
                to: reg.user.email,
                username: reg.user.username,
                tournamentName: reg.tournament?.name || 'Your Tournament',
                tournamentId
            });
        }
    }

    console.log(`✅ Notification: Sent tournament live notifications for ${tournamentId}`);
};

/**
 * Handle a tournament.ended event — notify the winner.
 */
const handleTournamentEnded = async (payload) => {
    const { tournamentId, winnerId, prizePool } = payload;

    if (winnerId) {
        await notificationController.send(
            winnerId,
            '🥇 You Won the Tournament!',
            `Congratulations! You won the tournament. Prize pool: ₹${prizePool || 0}.`,
            'SUCCESS',
            { tournamentId, prizePool }
        );
    }

    console.log(`✅ Notification: Sent tournament ended notification for ${tournamentId}`);
};

/**
 * Start the notification Kafka consumer.
 * Called once at server startup.
 */
const startNotificationConsumer = async () => {
    const consumer = createConsumer(GROUP_ID);
    if (!consumer) {
        console.warn('⚠️  Notification Consumer: Kafka disabled, skipping.');
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
                    console.error(`❌ Notification Consumer: Failed to parse message on [${topic}]`, e.message);
                    return;
                }

                console.log(`📥 Notification Consumer: Received [${topic}]`, payload);

                switch (topic) {
                    case 'match.completed':
                        await handleMatchCompleted(payload);
                        break;
                    case 'tournament.started':
                        await handleTournamentStarted(payload);
                        break;
                    case 'tournament.live':
                        await handleTournamentLive(payload);
                        break;
                    case 'tournament.ended':
                        await handleTournamentEnded(payload);
                        break;
                    default:
                        // tournament.created — no notification needed currently
                        break;
                }
            }
        });

        console.log('✅ Notification Consumer: Listening on topics:', TOPICS.join(', '));
    } catch (err) {
        console.error('❌ Notification Consumer: Failed to start:', err.message);
    }
};

module.exports = { startNotificationConsumer };
