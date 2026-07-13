/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 *
 * StreamPage — Live spectator hub. Browse all live match streams and watch
 * embedded Twitch / YouTube streams without leaving the platform.
 * Route: /streams
 */

/* eslint-disable react/prop-types, sonarjs/no-nested-ternary, no-negated-condition, sonarjs/no-nested-functions */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    Tv2,
    Radio,
    Monitor,
    ExternalLink,
    RefreshCw,
    Loader2,
    Trophy,
    KeyRound,
    ChevronRight,
} from 'lucide-react'
import api from '../../lib/api'
import { GradientText } from '../../Components/effects/ReactBits'
import { useSocket } from '../../hooks/useSocket'

function detectPlatform(url) {
    if (!url) return null
    if (/twitch\.tv/i.test(url)) return 'TWITCH'
    if (/youtube\.com|youtu\.be/i.test(url)) return 'YOUTUBE'
    return 'OTHER'
}

function getTwitchChannel(url) {
    const match = url.match(/twitch\.tv\/(?:videos\/(\d+)|([^/?#]+))/)
    if (!match) return null
    return match[2] ? { type: 'channel', value: match[2] } : { type: 'video', value: match[1] }
}

function getYouTubeEmbed(url) {
    const regexes = [
        /youtu\.be\/([^?#&]+)/,
        /youtube\.com\/watch\?v=([^&]+)/,
        /youtube\.com\/live\/([^?#&]+)/,
        /youtube\.com\/embed\/([^?#&]+)/,
    ]

    for (const regex of regexes) {
        const match = url.match(regex)
        if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=0`
    }

    return null
}

function getTwitchEmbed(url) {
    if (!globalThis.window) return null

    const parent = globalThis.window.location.hostname
    const channel = getTwitchChannel(url)
    if (!channel) return null

    if (channel.type === 'channel') {
        return `https://player.twitch.tv/?channel=${encodeURIComponent(channel.value)}&parent=${parent}&autoplay=true`
    }

    return `https://player.twitch.tv/?video=${encodeURIComponent(channel.value)}&parent=${parent}&autoplay=true`
}

function StreamEmbed({ url, title }) {
    const platform = detectPlatform(url)
    let embedSrc = null

    if (platform === 'YOUTUBE') {
        embedSrc = getYouTubeEmbed(url)
    } else if (platform === 'TWITCH') {
        embedSrc = getTwitchEmbed(url)
    }

    if (!embedSrc) {
        return (
            <div className="aspect-video bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center text-white/30">
                <div className="text-center px-6">
                    <Tv2 size={36} className="mx-auto mb-3 text-white/20" />
                    <p className="font-heading text-lg">Unsupported stream link</p>
                    <p className="text-sm mt-1">{title || 'No stream selected'}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/5 group">
            <iframe
                src={embedSrc}
                title={title || 'Live stream'}
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
            />
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-bold shadow-lg">
                <span aria-hidden="true" className="block w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>LIVE</span>
            </div>
        </div>
    )
}

function StreamCard({ stream, isSelected, onSelect }) {
    const platform = detectPlatform(stream.streamUrl)
    const platformColors = {
        TWITCH: 'text-purple-400 bg-purple-400/10',
        YOUTUBE: 'text-red-400 bg-red-400/10',
        OTHER: 'text-white/40 bg-white/5',
    }

    return (
        <motion.button
            type="button"
            onClick={() => onSelect(stream)}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            className={`w-full text-left rounded-2xl border p-3 transition-all ${isSelected ? 'border-titan-purple bg-titan-purple/5' : 'border-white/5 bg-white/[0.03] hover:border-white/10'}`}
        >
            <div className="flex gap-3">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/40 flex-shrink-0">
                    {stream.gameBanner ? (
                        <img src={stream.gameBanner} alt={stream.game || 'Stream'} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20">
                            <Tv2 size={24} />
                        </div>
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-white truncate">{stream.tournamentName || 'Tournament Match'}</h3>
                            <p className="text-xs text-white/40 mt-0.5">Round {stream.round} · Match {stream.matchNumber}</p>
                        </div>
                        <ChevronRight size={16} className={`flex-shrink-0 mt-1 transition-colors ${isSelected ? 'text-titan-purple' : 'text-white/20'}`} />
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-wide font-semibold">
                        <div className="flex items-center gap-1">
                            <span aria-hidden="true" className="block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-red-400">Live</span>
                        </div>
                        {platform && <span className={`px-1.5 py-0.5 rounded ${platformColors[platform]}`}>{platform}</span>}
                    </div>
                </div>
            </div>
        </motion.button>
    )
}

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
                <p className={`text-sm font-mono font-bold text-amber-300 mt-0.5 transition-all ${shown ? '' : 'blur-sm select-none'}`}>{code}</p>
            </div>
            <div className="flex items-center gap-1">
                <button onClick={() => setShown((value) => !value)} className="text-[10px] text-amber-400/60 hover:text-amber-300 underline">
                    {shown ? 'Hide' : 'Show'}
                </button>
                {shown && (
                    <button onClick={copy} className="text-[10px] text-amber-400/60 hover:text-amber-300 ml-1">
                        {copied ? '✓' : 'Copy'}
                    </button>
                )}
            </div>
        </div>
    )
}

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
            setSelected((current) => current || data[0] || null)
        } catch (error) {
            console.error('Failed to fetch streams:', error)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        fetchStreams()
    }, [fetchStreams])

    useEffect(() => {
        if (!socket || !connected) return

        const onStreamCreated = (payload) => {
            setStreams((current) => [payload, ...current.filter((item) => item.matchId !== payload.matchId)])
            setSelected((current) => current || payload)
        }

        const onStreamUpdated = (payload) => {
            setStreams((current) => current.map((item) => (item.matchId === payload.matchId ? { ...item, ...payload } : item)))
            setSelected((current) => (current?.matchId === payload.matchId ? { ...current, ...payload } : current))
        }

        socket.on('match-stream-created', onStreamCreated)
        socket.on('match-stream-updated', onStreamUpdated)

        return () => {
            socket.off('match-stream-created', onStreamCreated)
            socket.off('match-stream-updated', onStreamUpdated)
        }
    }, [socket, connected])

    useEffect(() => {
        if (connected) return
        const interval = setInterval(() => fetchStreams(true), 30000)
        return () => clearInterval(interval)
    }, [connected, fetchStreams])

    let content = null

    if (loading) {
        content = (
            <div className="flex items-center justify-center py-32 gap-3 text-white/30">
                <Loader2 size={24} className="animate-spin" />
                <span className="font-heading">Scanning for live matches…</span>
            </div>
        )
    } else if (streams.length === 0) {
        content = (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-32 gap-4 text-center max-w-md mx-auto">
                <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-2 border border-white/5">
                    <Tv2 size={36} className="text-white/10" />
                </div>
                <h2 className="font-heading text-xl font-bold text-white">No Live Streams</h2>
                <p className="text-white/30 text-sm leading-relaxed">
                    No matches are streaming right now. When hosts add stream links to active matches, they&apos;ll appear here.
                </p>
                <button onClick={() => navigate('/tournaments')} className="btn-neon px-6 py-2.5 text-sm mt-2 flex items-center gap-2">
                    <Trophy size={16} />
                    Browse Tournaments
                </button>
            </motion.div>
        )
    } else {
        content = (
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:max-h-[80vh] lg:overflow-y-auto space-y-2 pr-1">
                    <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">Live Matches</p>
                    {streams.map((stream) => (
                        <StreamCard
                            key={stream.matchId}
                            stream={stream}
                            isSelected={selected?.matchId === stream.matchId}
                            onSelect={setSelected}
                        />
                    ))}
                </motion.div>

                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4">
                    {selected ? (
                        <>
                            <StreamEmbed url={selected.streamUrl} title={selected.tournamentName} />

                            <div className="bg-titan-bg-card border border-white/10 rounded-2xl p-5 flex flex-wrap gap-4 items-start">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wide">
                                            <span aria-hidden="true" className="block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                            <span>Live</span>
                                        </span>
                                        {selected.bracketSection && selected.bracketSection !== 'WINNERS' && (
                                            <span className="text-[10px] text-titan-purple bg-titan-purple/10 border border-titan-purple/20 px-2 py-0.5 rounded-full font-semibold uppercase">
                                                {selected.bracketSection.replace('_', ' ')}
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="font-heading font-bold text-white text-lg leading-tight">{selected.tournamentName || 'Tournament Match'}</h2>
                                    <p className="text-white/40 text-sm mt-1">
                                        Round {selected.round} · Match #{selected.matchNumber}{selected.game ? ` · ${selected.game}` : ''}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button onClick={() => navigate(`/tournament/${selected.tournamentId}/bracket`)} className="btn-glass px-4 py-2 text-sm flex items-center gap-2">
                                        <Monitor size={14} />
                                        View Bracket
                                    </button>
                                    <a href={selected.streamUrl} target="_blank" rel="noopener noreferrer" className="btn-glass px-4 py-2 text-sm flex items-center gap-2">
                                        <ExternalLink size={14} />
                                        Open
                                    </a>
                                </div>
                            </div>

                            {selected.spectatorCode && <SpectatorCodeBadge code={selected.spectatorCode} />}
                        </>
                    ) : (
                        <div className="aspect-video bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center flex-col gap-3 text-white/20">
                            <Tv2 size={36} />
                            <p className="text-sm">Select a stream to watch</p>
                        </div>
                    )}
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-titan-bg px-4 pt-8 pb-16">
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6 max-w-7xl mx-auto">
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
                <button onClick={() => fetchStreams(true)} disabled={refreshing} className="btn-glass px-4 py-2 text-sm flex items-center gap-2">
                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </motion.div>

            {content}
        </div>
    )
}
