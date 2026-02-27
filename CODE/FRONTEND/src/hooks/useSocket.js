/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 *
 * useSocket — Custom React hook for Socket.io connectivity
 *
 * Connects to the backend WebSocket server at /ws.
 * Manages connection lifecycle (connect/disconnect on mount/unmount).
 * Provides subscribe/unsubscribe helpers for tournament and match rooms.
 *
 * Usage:
 *   const { socket, connected } = useSocket();
 *
 *   // Subscribe to a tournament's real-time feed
 *   useEffect(() => {
 *     socket?.emit('subscribe:tournament', tournamentId);
 *     socket?.on('score:update', handler);
 *     return () => socket?.off('score:update', handler);
 *   }, [socket, tournamentId]);
 */

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

let sharedSocket = null;
let refCount = 0;

/**
 * Returns a singleton Socket.io connection, shared across all components.
 * The socket is created on first use and destroyed when no component uses it.
 */
export function useSocket() {
    const [connected, setConnected] = useState(false);
    const socketRef = useRef(null);

    useEffect(() => {
        refCount++;

        if (!sharedSocket) {
            sharedSocket = io(BACKEND_URL, {
                path: '/ws',
                transports: ['websocket'],
                reconnectionAttempts: 5,
                reconnectionDelay: 2000,
            });
        }

        socketRef.current = sharedSocket;

        const onConnect = () => setConnected(true);
        const onDisconnect = () => setConnected(false);

        sharedSocket.on('connect', onConnect);
        sharedSocket.on('disconnect', onDisconnect);

        // If already connected by the time we mount, set state immediately
        if (sharedSocket.connected) setConnected(true);

        return () => {
            sharedSocket.off('connect', onConnect);
            sharedSocket.off('disconnect', onDisconnect);
            refCount--;
            if (refCount === 0 && sharedSocket) {
                sharedSocket.disconnect();
                sharedSocket = null;
            }
        };
    }, []);

    return { socket: socketRef.current, connected };
}

/**
 * Subscribe to a tournament room and listen for real-time events.
 *
 * @param {string|null} tournamentId - The tournament to subscribe to
 * @param {{ onScoreUpdate, onMatchCompleted, onBracketUpdate, onTournamentCompleted }} handlers
 */
export function useTournamentSocket(tournamentId, handlers = {}) {
    const { socket, connected } = useSocket();

    useEffect(() => {
        if (!socket || !tournamentId || !connected) return;

        socket.emit('subscribe:tournament', tournamentId);

        const { onScoreUpdate, onMatchCompleted, onBracketUpdate, onTournamentCompleted } = handlers;

        if (onScoreUpdate) socket.on('score:update', onScoreUpdate);
        if (onMatchCompleted) socket.on('match:completed', onMatchCompleted);
        if (onBracketUpdate) socket.on('bracket:update', onBracketUpdate);
        if (onTournamentCompleted) socket.on('tournament:completed', onTournamentCompleted);

        return () => {
            if (onScoreUpdate) socket.off('score:update', onScoreUpdate);
            if (onMatchCompleted) socket.off('match:completed', onMatchCompleted);
            if (onBracketUpdate) socket.off('bracket:update', onBracketUpdate);
            if (onTournamentCompleted) socket.off('tournament:completed', onTournamentCompleted);
        };
    }, [socket, connected, tournamentId]);

    return { socket, connected };
}

export default useSocket;
