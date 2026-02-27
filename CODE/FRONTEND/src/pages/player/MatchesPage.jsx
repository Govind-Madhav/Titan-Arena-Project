/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Swords,
    Trophy,
    Clock,
    CheckCircle,
    AlertTriangle,
    ChevronRight,
    Wifi,
    WifiOff,
} from 'lucide-react'
import { SpotlightCard, GradientText } from '../../Components/effects/ReactBits'
import { useTournamentSocket } from '../../hooks/useSocket'
import api from '../../lib/api'


// ─── Live Score Badge ───────────────────────────────────────────────────────────
function LiveBadge() {
    return (
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">
            <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
            LIVE
        </span>
    )
}

// ─── Match Card ─────────────────────────────────────────────────────────────────
function MatchCard({ match, tab, liveScores }) {
    const live = liveScores[match.id]
    const scoreA = live?.scoreA ?? match.scoreA ?? 0
    const scoreB = live?.scoreB ?? match.scoreB ?? 0

    return (
        <SpotlightCard className="p-5">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-titan-purple/30 to-titan-blue/30 flex items-center justify-center shrink-0">
                        <Trophy size={24} className="text-titan-purple" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-heading font-bold text-base truncate">
                            {match.tournamentName || 'Tournament'}
                        </h3>
                        <p className="text-sm text-white/40 truncate">
                            Round {match.round} • vs{' '}
                            <span className="text-white">
                                {match.opponentName || match.opponentId || 'TBD'}
                            </span>
                        </p>
                        {match.scheduledAt && tab === 'upcoming' && (
                            <p className="text-xs text-titan-purple mt-0.5">
                                {new Date(match.scheduledAt).toLocaleString()}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {tab === 'live' && (
                        <div className="flex flex-col items-end gap-1">
                            <LiveBadge />
                            <span className="font-display text-2xl font-bold text-white">
                                {scoreA} – {scoreB}
                            </span>
                        </div>
                    )}
                    {tab === 'completed' && (
                        <div className="text-right">
                            <span className="font-display text-xl font-bold">
                                {scoreA} – {scoreB}
                            </span>
                            <p className={`text-sm font-semibold mt-0.5 ${match.myWin ? 'text-titan-success' : 'text-titan-error'}`}>
                                {match.myWin ? 'Victory' : 'Defeat'}
                            </p>
                        </div>
                    )}
                    {tab === 'disputed' && (
                        <p className="text-titan-warning text-sm max-w-[140px] text-right">
                            {match.disputeReason || 'Under review'}
                        </p>
                    )}
                    <ChevronRight size={20} className="text-white/40" />
                </div>
            </div>
        </SpotlightCard>
    )
}

// ─── Main Page ───────────────────────────────────────────────────────────────────
export default function MatchesPage() {
    const [activeTab, setActiveTab] = useState('live')
    const [matches, setMatches] = useState({
        upcoming: [],
        live: [],
        completed: [],
        disputed: [],
    })
    const [liveScores, setLiveScores] = useState({}) // matchId → { scoreA, scoreB }
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [activeTournamentId, setActiveTournamentId] = useState(null)

    // ─── Fetch matches from API ──────────────────────────────────────────────
    useEffect(() => {
        const fetchMatches = async () => {
            setLoading(true)
            setError(null)
            try {
                const { data } = await api.get('/matches/my')
                const all = data.data || []

                const categorised = { upcoming: [], live: [], completed: [], disputed: [] }
                for (const m of all) {
                    if (m.status === 'DISPUTED') categorised.disputed.push(m)
                    else if (m.status === 'IN_PROGRESS') categorised.live.push(m)
                    else if (m.status === 'COMPLETED') categorised.completed.push(m)
                    else categorised.upcoming.push(m)
                }
                setMatches(categorised)

                // Subscribe to first active tournament for live updates
                const firstActive = categorised.live[0] || categorised.upcoming[0]
                if (firstActive?.tournamentId) setActiveTournamentId(firstActive.tournamentId)
            } catch (err) {
                console.error('Failed to fetch matches:', err)
                setError('Could not load matches. Please try again later.')
            } finally {
                setLoading(false)
            }
        }
        fetchMatches()
    }, [])

    // ─── WebSocket handlers ──────────────────────────────────────────────────
    const onScoreUpdate = useCallback(({ matchId, scoreA, scoreB }) => {
        setLiveScores(prev => ({ ...prev, [matchId]: { scoreA, scoreB } }))
    }, [])

    const onMatchCompleted = useCallback(({ matchId, winnerId }) => {
        setMatches(prev => {
            const completedMatch = prev.live.find(m => m.id === matchId)
            if (!completedMatch) return prev
            return {
                ...prev,
                live: prev.live.filter(m => m.id !== matchId),
                completed: [{ ...completedMatch, status: 'COMPLETED', winnerId }, ...prev.completed],
            }
        })
    }, [])

    const { connected } = useTournamentSocket(activeTournamentId, {
        onScoreUpdate,
        onMatchCompleted,
    })

    // ─── Tabs ────────────────────────────────────────────────────────────────
    const tabs = [
        { id: 'live', label: 'Live', icon: Swords },
        { id: 'upcoming', label: 'Upcoming', icon: Clock },
        { id: 'completed', label: 'Completed', icon: CheckCircle },
        { id: 'disputed', label: 'Disputed', icon: AlertTriangle },
    ]

    return (
        <div className="min-h-screen bg-titan-bg py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">
                                <Swords className="inline-block mr-3 text-titan-purple" />
                                My <GradientText>Matches</GradientText>
                            </h1>
                            <p className="text-white/40">Track your competition journey</p>
                        </div>
                        {/* Real-time connection indicator */}
                        <div
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${connected
                                ? 'bg-green-500/10 text-green-400'
                                : 'bg-white/5 text-white/30'
                                }`}
                        >
                            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
                            {connected ? 'Live' : 'Offline'}
                        </div>
                    </div>
                </motion.div>

                {/* Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex gap-2 mb-8 overflow-x-auto pb-2"
                >
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-heading font-semibold whitespace-nowrap transition-all ${activeTab === tab.id
                                ? 'bg-titan-purple text-white'
                                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                            {tab.id === 'live' && matches.live.length > 0 && (
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            )}
                            {matches[tab.id].length > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/10 rounded-full">
                                    {matches[tab.id].length}
                                </span>
                            )}
                        </button>
                    ))}
                </motion.div>

                {/* Match List */}
                <div className="space-y-4">
                    {loading ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-20"
                        >
                            <Swords size={48} className="text-white/20 mx-auto mb-4 animate-pulse" />
                            <h3 className="font-heading text-xl font-semibold mb-2">Loading matches...</h3>
                        </motion.div>
                    ) : error ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-20"
                        >
                            <AlertTriangle size={48} className="text-titan-warning mx-auto mb-4" />
                            <h3 className="font-heading text-xl font-semibold mb-2">Something went wrong</h3>
                            <p className="text-white/40">{error}</p>
                        </motion.div>
                    ) : matches[activeTab].length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-20"
                        >
                            <Swords size={48} className="text-white/20 mx-auto mb-4" />
                            <h3 className="font-heading text-xl font-semibold mb-2">
                                No {activeTab} matches
                            </h3>
                            <p className="text-white/40">
                                {activeTab === 'live'
                                    ? 'No matches in progress right now'
                                    : 'Check back later'}
                            </p>
                        </motion.div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {matches[activeTab].map((match, i) => (
                                <motion.div
                                    key={match.id}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ delay: i * 0.04 }}
                                >
                                    <MatchCard match={match} tab={activeTab} liveScores={liveScores} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </div>
        </div>
    )
}
