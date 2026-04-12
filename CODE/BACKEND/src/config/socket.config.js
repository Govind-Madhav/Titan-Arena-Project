/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 *
 * WebSocket Gateway — Phase C
 * Provides real-time match updates, scoreboard events, and live bracket changes.
 * Uses Socket.io attached to the existing HTTP server.
 */

const { Server } = require('socket.io');

let io = null;

const resolveAllowedOrigins = () => {
    const configuredOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean);

    if (configuredOrigins?.length) {
        return configuredOrigins;
    }

    if (process.env.NODE_ENV === 'production') {
        throw new Error('ALLOWED_ORIGINS must be set in production for Socket.io CORS');
    }

    return ['http://localhost:5173', 'http://localhost:3000'];
};

/**
 * Initialise Socket.io on the HTTP server.
 * Call this once from index.js after `httpServer.listen()`.
 *
 * @param {http.Server} httpServer
 */
function initSocket(httpServer) {
    const allowedOrigins = resolveAllowedOrigins();

    io = new Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            methods: ['GET', 'POST'],
            credentials: true,
        },
        path: '/ws',
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Socket connected: ${socket.id}`);

        // Client subscribes to a tournament's real-time feed
        socket.on('subscribe:tournament', (tournamentId) => {
            socket.join(`tournament:${tournamentId}`);
            socket.emit('subscribed', { tournamentId });
            console.log(`📡 ${socket.id} subscribed to tournament:${tournamentId}`);
        });

        // Client subscribes to a single match feed (e.g. live score ticker)
        socket.on('subscribe:match', (matchId) => {
            socket.join(`match:${matchId}`);
            socket.emit('subscribed', { matchId });
        });

        socket.on('disconnect', () => {
            console.log(`❌ Socket disconnected: ${socket.id}`);
        });
    });

    console.log('⚡ WebSocket server initialised on /ws');
    return io;
}

/** Emit to all clients watching a tournament room */
function emitToTournament(tournamentId, event, data) {
    if (!io) return;
    io.to(`tournament:${tournamentId}`).emit(event, data);
}

/** Emit to all clients watching a specific match */
function emitToMatch(matchId, event, data) {
    if (!io) return;
    io.to(`match:${matchId}`).emit(event, data);
}

/**
 * Broadcast a live score update.
 * Called from match.controller.js when a score is updated.
 */
function broadcastScoreUpdate({ matchId, tournamentId, scoreA, scoreB, participantAId, participantBId }) {
    const payload = {
        matchId,
        tournamentId,
        scoreA,
        scoreB,
        participantAId,
        participantBId,
        updatedAt: new Date().toISOString(),
    };
    emitToTournament(tournamentId, 'score:update', payload);
    emitToMatch(matchId, 'score:update', payload);
}

/**
 * Broadcast match completion (winner declared).
 * Called from match.controller.js after a match result is submitted.
 */
function broadcastMatchCompleted({ matchId, tournamentId, winnerId, round }) {
    const payload = { matchId, tournamentId, winnerId, round, completedAt: new Date().toISOString() };
    emitToTournament(tournamentId, 'match:completed', payload);
    emitToMatch(matchId, 'match:completed', payload);
}

/**
 * Broadcast bracket generation complete (all matches for new round scheduled).
 */
function broadcastBracketUpdate(tournamentId, matches) {
    emitToTournament(tournamentId, 'bracket:update', { tournamentId, matches, updatedAt: new Date().toISOString() });
}

/**
 * Broadcast tournament completion (winner declared).
 */
function broadcastTournamentCompleted({ tournamentId, winnerId, name }) {
    emitToTournament(tournamentId, 'tournament:completed', { tournamentId, winnerId, name, completedAt: new Date().toISOString() });
}

module.exports = { initSocket, emitToTournament, emitToMatch, broadcastScoreUpdate, broadcastMatchCompleted, broadcastBracketUpdate, broadcastTournamentCompleted };
