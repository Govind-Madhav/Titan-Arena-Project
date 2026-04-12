/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 *
 * StreamPage — Live spectator hub. Browse all live match streams and watch
 * embedded Twitch / YouTube streams without leaving the platform.
 * Route: /streams
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Tv2, Radio, Eye, Monitor, ExternalLink, RefreshCw,
    ChevronRight, Loader2, Volume2, VolumeX, Maximize2,
    Swords, Trophy, KeyRound, X
} from 'lucide-react'
import api from '../../lib/api'
import { GradientText } from '../../Components/effects/ReactBits'
import { useSocket } from '../../hooks/useSocket'

// ─── Platform detection ────────────────────────────────────────────────────────
function detectPlatform(url) {
    if (!url) return null
    if (/twitch\.tv/i.test(url)) return 'TWITCH'
    if (/youtube\.com|youtu\.be/i.test(url)) return 'YOUTUBE'
    return 'OTHER'
}

function getTwitchChannel(url) {
    // twitch.tv/channelname or twitch.tv/videos/123
    const m = url.match(/twitch\.tv\/(?:videos\/(\d+)|([^/?#]+))/)
    if (!m) return null
    return m[2] ? { type: 'channel', value: m[2] } : { type: 'video', value: m[1] }
}

function getYouTubeEmbed(url) {
    // supports youtu.be/ID and youtube.com/watch?v=ID and /live/ID
    const regexes = [
        /youtu\.be\/([^?#&]+)/,
        /youtube\.com\/watch\?v=([^&]+)/,
        /youtube\.com\/live\/([^?#&]+)/,
        /youtube\.com\/embed\/([^?#&]+)/,
    ]
    for (const re of regexes) {
        const m = url.match(re)
        if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1&mute=0`
    }
    return null
}

function getTwitchEmbed(parsed) {
    if (!parsed) return null
    const parent = window.location.hostname
    if (parsed.type === 'channel') {
        return `https://player.twitch.tv/?channel=${parsed.value}&parent=${parent}&autoplay=true`
    }
    return `https://player.twitch.tv/?video=${parsed.value}&parent=${parent}&autoplay=true`
}

// ─── Stream Embed ─────────────────────────────────────────────────────────────
function StreamEmbed({ url, title }) {
    const platform = detectPlatform(url)
    const [muted, setMuted] = useState(false)

    let embedSrc = null
    if (platform === 'YOUTUBE') embedSrc = getYouTubeEmbed(url)
    if (platform === 'TWITCH') embedSrc = getTwitchEmbed(getTwitchChannel(url))

    if (!embedSrc) {
        return (
            <div className="w-full aspect-video bg-black/60 flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10">
                <ExternalLink size={32} className="text-white/20" />
                <p className="text-white/40 text-sm">Can't embed this stream</p>
                <a href={url} target="_blank" rel="noopener noreferrer" className="btn-glass px-4 py-2 text-sm flex items-center gap-2">
                    <ExternalLink size={14} />
                    Open in New Tab
                </a>
            </div>
        )
    }

    return (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 group">
            <iframe
                src={embedSrc}
                title={title || 'Live Stream'}
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
            />
            {/* Overlay controls */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={url} target="_blank" rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-black/60 text-white/60 hover:text-white transition-colors backdrop-blur-sm"
                    title="Open on platform">
                    <ExternalLink size={14} />
                </a>
            </div>

            {/* LIVE badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-bold shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
            </div>
        </div>
    )
}

// ─── Stream Card ──────────────────────────────────────────────────────────────
function StreamCard({ stream, isSelected, onSelect }) {
    const platform = detectPlatform(stream.streamUrl)
    const platformColors = {
        TWITCH: 'text-purple-400 bg-purple-400/10',
        YOUTUBE: 'text-red-400 bg-red-400/10',
        OTHER: 'text-white/40 bg-white/5',
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ x: 4 }}
            onClick={() => onSelect(stream)}
            className={`cursor-pointer rounded-xl p-4 border transition-all duration-200
                ${isSelected
                    ? 'border-titan-purple/60 bg-titan-purple/10'
                    : 'border-white/5 bg-titan-bg-card hover:border-white/15 hover:bg-white/[0.03]'
                }`}
        >
            <div className="flex items-start gap-3">
                {/* Game icon / banner */}
                <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden bg-black/40 border border-white/5">
                    {stream.gameBanner
                        ? <img src={stream.gameBanner} alt={stream.game} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Swords size={18} className="text-white/20" /></div>
                    }
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-heading font-bold text-white text-sm leading-tight truncate">
                        {stream.tournamentName || 'Tournament Match'}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5 truncate">
                        Round {stream.round} · Match {stream.matchNumber}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                        {/* Live indicator */}
                        <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[10px] text-red-400 font-semibold uppercase tracking-wide">Live</span>
                        </div>
                        {platform && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${platformColors[platform]}`}>
                                {platform}
                            </span>
                        )}
                    </div>
                </div>
                <ChevronRight size={16} className={`flex-shrink-0 mt-1 transition-colors ${isSelected ? 'text-titan-purple' : 'text-white/20'}`} />
            </div>
        </motion.div>
    )
}

// ─── Spectator Code Modal ─────────────────────────────────────────────────────
function SpectatorCodeBadge({ code }) {
    const [shown, setShown] = useState(false)
    const [copied, setCopied] = useState(false)

    const copy = () => {
        navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }

    if (!code) return null
    return (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <KeyRound size={14} className="text-amber-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-[10px] text-amber-400/70 font-semibold uppercase tracking-wider">Spectator Code</p>
                <p className={`text-sm font-mono font-bold text-amber-300 mt-0.5 transition-all ${shown ? '' : 'blur-sm select-none'}`}>
                    {code}
                </p>
            </div>
            <div className="flex items-center gap-1">
                <button onClick={() => setShown(s => !s)}
                    className="text-[10px] text-amber-400/60 hover:text-amber-300 underline">{shown ? 'Hide' : 'Show'}</button>
                {shown && (
                    <button onClick={copy}
                        className="text-[10px] text-amber-400/60 hover:text-amber-300 ml-1">
                        {copied ? '✓' : 'Copy'}
                    </button>
                )}
            </div>
        </div>
    )
}

// ─── Main StreamPage ──────────────────────────────────────────────────────────
export default function StreamPage() {
    const navigate = useNavigate()
    const [streams, setStreams] = useState([])
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState(null)
    const [refreshing, setRefreshing] = useState(false)
    const { socket, connected } = useSocket()

    const fetchStreams = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)
        else setRefreshing(true)
        try {
            const res = await api.get('/matches/streams/live')
            const data = res.data.data || []
            setStreams(data)
            // Auto-select first stream only when no stream is currently selected.
            setSelected((prev) => prev || data[0] || null)
        } catch {
            //
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        fetchStreams()
    }, [fetchStreams])

    useEffect(() => {
        if (!socket) return;

        const onStreamUpdate = (payload) => {
            if (!payload?.streamUrl) {
                fetchStreams(true);
                return;
            }

            setStreams((prev) => {
                const idx = prev.findIndex((item) => item.matchId === payload.matchId);
                if (idx === -1) {
                    fetchStreams(true);
                    return prev;
                }

                const next = [...prev];
                next[idx] = {
                    ...next[idx],
                    streamUrl: payload.streamUrl,
                    platform: payload.platform || next[idx].platform,
                    streamId: payload.streamId || next[idx].streamId,
                    streamScope: payload.streamScope || next[idx].streamScope,
                };
                return next;
            });

            setSelected((prev) => {
                if (!prev || prev.matchId !== payload.matchId) return prev;
                return {
                    ...prev,
                    streamUrl: payload.streamUrl,
                    platform: payload.platform || prev.platform,
                    streamId: payload.streamId || prev.streamId,
                    streamScope: payload.streamScope || prev.streamScope,
                };
            });
        };

        socket.on('stream:update', onStreamUpdate);
        return () => socket.off('stream:update', onStreamUpdate);
    }, [socket, fetchStreams]);

    useEffect(() => {
        if (!socket || !connected) return;

        const tournamentIds = [...new Set(streams.map((stream) => stream.tournamentId).filter(Boolean))];
        tournamentIds.forEach((tournamentId) => {
            socket.emit('subscribe:tournament', tournamentId);
        });
    }, [socket, connected, streams]);

    useEffect(() => {
        // Polling is fallback only when socket is unavailable/disconnected.
        if (connected) return;
        const interval = setInterval(() => fetchStreams(true), 30000);
        return () => clearInterval(interval);
    }, [connected, fetchStreams])

    return (
        <div className="min-h-screen bg-titan-bg px-4 pt-8 pb-16">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-6 max-w-7xl mx-auto">
                <div>
                    <h1 className="font-display text-3xl sm:text-4xl font-bold mb-1">
                        <GradientText>Live Now</GradientText>
                    </h1>
                    <p className="text-white/40 text-sm flex items-center gap-2">
                        <Radio size={13} className="text-red-400 animate-pulse" />
                        {streams.length} match{streams.length !== 1 ? 'es' : ''} streaming live
                    </p>
                    <p className="text-white/25 text-xs mt-1">
                        Update mode: {connected ? 'Realtime socket' : 'Polling fallback'}
                    </p>
                </div>
                <button
                    onClick={() => fetchStreams(true)}
                    disabled={refreshing}
                    className="btn-glass px-4 py-2 text-sm flex items-center gap-2"
                >
                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </motion.div>

            {loading ? (
                <div className="flex items-center justify-center py-32 gap-3 text-white/30">
                    <Loader2 size={24} className="animate-spin" />
                    <span className="font-heading">Scanning for live matches…</span>
                </div>
            ) : streams.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-32 gap-4 text-center max-w-md mx-auto"
                >
                    <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-2 border border-white/5">
                        <Tv2 size={36} className="text-white/10" />
                    </div>
                    <h2 className="font-heading text-xl font-bold text-white">No Live Streams</h2>
                    <p className="text-white/30 text-sm leading-relaxed">
                        No matches are streaming right now. When hosts add stream links to active matches, they'll appear here.
                    </p>
                    <button onClick={() => navigate('/tournaments')} className="btn-neon px-6 py-2.5 text-sm mt-2 flex items-center gap-2">
                        <Trophy size={16} />
                        Browse Tournaments
                    </button>
                </motion.div>
            ) : (
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
                    {/* Stream List (sidebar on large screens) */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:max-h-[80vh] lg:overflow-y-auto space-y-2 pr-1"
                    >
                        <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">Live Matches</p>
                        {streams.map(stream => (
                            <StreamCard
                                key={stream.matchId}
                                stream={stream}
                                isSelected={selected?.matchId === stream.matchId}
                                onSelect={setSelected}
                            />
                        ))}
                    </motion.div>

                    {/* Player Panel */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col gap-4"
                    >
                        {selected ? (
                            <>
                                {/* Embed */}
                                <StreamEmbed url={selected.streamUrl} title={selected.tournamentName} />

                                {/* Match Info */}
                                <div className="bg-titan-bg-card border border-white/10 rounded-2xl p-5 flex flex-wrap gap-4 items-start">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wide">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                                Live
                                            </span>
                                            {selected.bracketSection && selected.bracketSection !== 'WINNERS' && (
                                                <span className="text-[10px] text-titan-purple bg-titan-purple/10 border border-titan-purple/20 px-2 py-0.5 rounded-full font-semibold uppercase">
                                                    {selected.bracketSection.replace('_', ' ')}
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="font-heading font-bold text-white text-lg leading-tight">
                                            {selected.tournamentName || 'Tournament Match'}
                                        </h2>
                                        <p className="text-white/40 text-sm mt-1">
                                            Round {selected.round} · Match #{selected.matchNumber}
                                            {selected.game && ` · ${selected.game}`}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => navigate(`/tournament/${selected.tournamentId}/bracket`)}
                                            className="btn-glass px-4 py-2 text-sm flex items-center gap-2"
                                        >
                                            <Monitor size={14} />
                                            View Bracket
                                        </button>
                                        <a
                                            href={selected.streamUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-glass px-4 py-2 text-sm flex items-center gap-2"
                                        >
                                            <ExternalLink size={14} />
                                            Open
                                        </a>
                                    </div>
                                </div>

                                {/* Spectator Code */}
                                {selected.spectatorCode && (
                                    <SpectatorCodeBadge code={selected.spectatorCode} />
                                )}
                            </>
                        ) : (
                            <div className="aspect-video bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center flex-col gap-3 text-white/20">
                                <Tv2 size={36} />
                                <p className="text-sm">Select a stream to watch</p>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </div>
    )
}
