/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 *
 * BracketPage — Live public bracket viewer for a tournament.
 * Route: /tournament/:id/bracket (public, no auth needed)
 * Data: fetched from Node backend -> Java bracket engine proxy
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ChevronLeft,
    Trophy,
    Swords,
    RefreshCw,
    Tv2,
    Clock,
    CheckCircle2,
    Circle,
    Loader2,
    AlertTriangle,
    Radio
} from 'lucide-react'
import api from '../../lib/api'
import { GradientText } from '../../Components/effects/ReactBits'

// ─── Match Status Badge ────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const config = {
        COMPLETED: { label: 'Done', cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30', icon: <CheckCircle2 size={11} /> },
        ONGOING: { label: 'LIVE', cls: 'text-red-400 bg-red-400/10 border-red-400/30 animate-pulse', icon: <Radio size={11} /> },
        SCHEDULED: { label: 'Soon', cls: 'text-white/40 bg-white/5 border-white/10', icon: <Clock size={11} /> },
        BYE: { label: 'BYE', cls: 'text-titan-warning/60 bg-titan-warning/5 border-titan-warning/20', icon: null },
    }
    const { label, cls, icon } = config[status] || config.SCHEDULED
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${cls}`}>
            {icon}{label}
        </span>
    )
}

// ─── Single Match Card ─────────────────────────────────────────────────────────
function MatchCard({ match, isWinner }) {
    const teamA = match.participantAId ? match.participantAId.split('-')[0].toUpperCase() : 'TBD'
    const teamB = match.participantBId ? match.participantBId.split('-')[0].toUpperCase() : 'TBD'
    const winnerIsA = match.winnerId === match.participantAId
    const winnerIsB = match.winnerId === match.participantBId
    const isDone = match.status === 'COMPLETED'

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`relative rounded-xl border overflow-hidden min-w-[180px] w-[180px] ${match.status === 'ONGOING'
                ? 'border-red-500/40 bg-gradient-to-br from-red-950/30 to-titan-bg shadow-lg shadow-red-500/10'
                : 'border-white/10 bg-white/3'
                }`}
        >
            {/* Match header */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 bg-white/3">
                <span className="text-[10px] text-white/30 font-mono">M{match.matchNumber}</span>
                <StatusBadge status={match.isBye ? 'BYE' : match.status} />
            </div>

            {/* Participant A */}
            <div className={`flex items-center justify-between px-3 py-2 border-b border-white/5 ${winnerIsA && isDone ? 'bg-emerald-500/10' : ''}`}>
                <span className={`font-heading text-sm font-semibold truncate max-w-[100px] ${winnerIsA && isDone ? 'text-emerald-300' : 'text-white/80'}`}>
                    {teamA}
                </span>
                <span className={`font-display font-bold text-sm ${winnerIsA && isDone ? 'text-emerald-300' : 'text-white/50'}`}>
                    {isDone ? match.scoreA ?? '-' : '-'}
                </span>
            </div>

            {/* Participant B */}
            <div className={`flex items-center justify-between px-3 py-2 ${winnerIsB && isDone ? 'bg-emerald-500/10' : ''}`}>
                <span className={`font-heading text-sm font-semibold truncate max-w-[100px] ${winnerIsB && isDone ? 'text-emerald-300' : 'text-white/80'}`}>
                    {teamB}
                </span>
                <span className={`font-display font-bold text-sm ${winnerIsB && isDone ? 'text-emerald-300' : 'text-white/50'}`}>
                    {isDone ? match.scoreB ?? '-' : '-'}
                </span>
            </div>

            {/* Stream link */}
            {match.streamUrl && (
                <a
                    href={match.streamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border-t border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider transition-colors"
                >
                    <Tv2 size={11} />
                    Watch Live
                </a>
            )}
        </motion.div>
    )
}

// ─── A column of matches for one round ────────────────────────────────────────
function RoundColumn({ roundName, matches }) {
    return (
        <div className="flex flex-col items-center gap-3 flex-shrink-0">
            {/* Round header */}
            <div className="text-center mb-2">
                <span className="font-heading text-xs font-bold uppercase tracking-wider text-titan-purple bg-titan-purple/10 border border-titan-purple/30 px-3 py-1 rounded-full">
                    {roundName}
                </span>
            </div>
            {/* Matches */}
            <div
                className="flex flex-col gap-6 justify-around"
                style={{ minHeight: `${Math.max(matches.length, 1) * 100}px` }}
            >
                {matches.map(match => (
                    <MatchCard key={match.id} match={match} />
                ))}
            </div>
        </div>
    )
}

// ─── Main Bracket Page ─────────────────────────────────────────────────────────
export default function BracketPage() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [bracketData, setBracketData] = useState(null) // null | { type: 'SE' | 'DE', ... }
    const [tournament, setTournament] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [lastUpdated, setLastUpdated] = useState(null)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [activeSection, setActiveSection] = useState('WINNERS') // for DE tab switcher

    const fetchBracket = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)
        else setIsRefreshing(true)
        setError(null)

        try {
            const [tournRes, bracketRes] = await Promise.allSettled([
                api.get(`/tournaments/${id}`),
                api.get(`/matches/tournament/${id}`)
            ])

            if (tournRes.status === 'fulfilled') {
                setTournament(tournRes.value.data.data)
            }

            if (bracketRes.status === 'fulfilled') {
                const matches = bracketRes.value.data.data || []

                if (matches.length === 0) {
                    setBracketData(null)
                } else {
                    // ─── Detect format from bracketSection ───
                    const hasDE = matches.some(m => m.bracketSection && m.bracketSection !== 'WINNERS')

                    if (hasDE) {
                        // Double Elimination: group into three sections
                        const winners = matches.filter(m => m.bracketSection === 'WINNERS')
                        const losers = matches.filter(m => m.bracketSection === 'LOSERS')
                        const gf = matches.filter(m => m.bracketSection === 'GRAND_FINAL')

                        setBracketData({
                            type: 'DE',
                            WINNERS: groupByRound(winners, 'WB'),
                            LOSERS: groupByRound(losers, 'LB'),
                            GRAND_FINAL: { 'Grand Final': gf }
                        })
                    } else {
                        // Single / Round Robin
                        setBracketData({ type: 'SE', rounds: groupByRound(matches, 'WB') })
                    }
                }
            } else {
                throw new Error('Failed to load bracket data')
            }

            setLastUpdated(new Date())
        } catch (err) {
            setError('Could not load the bracket. The tournament may not have started yet.')
        } finally {
            setLoading(false)
            setIsRefreshing(false)
        }
    }, [id])

    // Initial load
    useEffect(() => { fetchBracket() }, [fetchBracket])

    // Live polling every 15s when tournament is ONGOING
    useEffect(() => {
        if (!tournament) return
        if (tournament.status !== 'ONGOING' && tournament.status !== 'ACTIVE') return
        const interval = setInterval(() => fetchBracket(true), 15000)
        return () => clearInterval(interval)
    }, [tournament, fetchBracket])

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function groupByRound(matches, prefix) {
        const maxRound = Math.max(...matches.map(m => Math.abs(m.round)), 1)
        const grouped = {}
        for (const match of matches) {
            const absRound = Math.abs(match.round)
            const label = prefix === 'LB'
                ? `LB Round ${absRound}`
                : getRoundLabel(absRound, maxRound)
            if (!grouped[label]) grouped[label] = []
            grouped[label].push(match)
        }
        Object.keys(grouped).forEach(r => {
            grouped[r].sort((a, b) => a.matchNumber - b.matchNumber)
        })
        return grouped
    }

    function getRoundLabel(round, totalRounds) {
        if (round === 0) return 'Grand Final'
        if (round === totalRounds) return 'Final'
        if (round === totalRounds - 1) return 'Semi Final'
        if (round === totalRounds - 2 && totalRounds > 4) return 'Quarter Final'
        return `Round ${round}`
    }

    const hasLiveMatches = bracketData && (() => {
        const sections = bracketData.type === 'DE'
            ? [bracketData.WINNERS, bracketData.LOSERS, bracketData.GRAND_FINAL]
            : [bracketData.rounds]
        return sections.some(s => Object.values(s).some(ms => ms.some(m => m.status === 'ONGOING')))
    })()

    return (
        <div className="min-h-screen bg-titan-bg">
            {/* Page Header */}
            <div className="px-4 pt-8 pb-4 max-w-[95vw] mx-auto">
                <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => navigate(`/tournament/${id}`)}
                    className="flex items-center gap-2 text-white/50 hover:text-white mb-5 transition-colors"
                >
                    <ChevronLeft size={18} />
                    Back to Tournament
                </motion.button>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap items-center justify-between gap-4 mb-6"
                >
                    <div>
                        <h1 className="font-display text-2xl sm:text-3xl font-bold">
                            <Swords className="inline-block mr-3 text-titan-purple" size={28} />
                            <GradientText>{tournament?.name ?? 'Tournament Bracket'}</GradientText>
                        </h1>
                        <div className="flex items-center gap-3 mt-2">
                            {hasLiveMatches && (
                                <span className="flex items-center gap-1.5 text-red-400 text-sm font-bold animate-pulse">
                                    <Radio size={14} /> LIVE
                                </span>
                            )}
                            {lastUpdated && (
                                <span className="text-white/30 text-xs">
                                    Updated {lastUpdated.toLocaleTimeString()}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => fetchBracket(true)}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-4 py-2 glass-card-hover text-sm font-heading"
                    >
                        <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </motion.div>
            </div>

            {/* Bracket Viewport */}
            <div className="overflow-x-auto px-4 pb-12">
                <div className="min-w-max mx-auto">
                    <AnimatePresence mode="wait">
                        {loading ? (
                            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex items-center justify-center py-32 gap-3 text-white/40"
                            >
                                <Loader2 size={28} className="animate-spin" />
                                <span className="font-heading text-lg">Loading bracket...</span>
                            </motion.div>
                        ) : error ? (
                            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-32 gap-4 text-center"
                            >
                                <AlertTriangle size={48} className="text-titan-warning/50" />
                                <p className="text-white/50 font-heading text-lg max-w-sm">{error}</p>
                                <button onClick={() => fetchBracket()} className="btn-neon mt-2">Try Again</button>
                            </motion.div>
                        ) : !bracketData ? (
                            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-32 gap-4 text-center"
                            >
                                <Trophy size={56} className="text-white/10" />
                                <h2 className="font-heading text-xl font-semibold text-white/50">Bracket Not Generated Yet</h2>
                                <p className="text-white/30 max-w-xs text-sm">
                                    The bracket will appear here once the tournament host generates it after check-in closes.
                                </p>
                                <button onClick={() => navigate('/tournaments')} className="btn-glass mt-2">Browse Other Tournaments</button>
                            </motion.div>
                        ) : bracketData.type === 'DE' ? (
                            // ─── Double Elimination View ───────────────────────
                            <motion.div key="de-bracket" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                {/* Section selector tabs */}
                                <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
                                    {[['WINNERS', '🏆 Winners', 'text-emerald-400 border-emerald-400/40'],
                                    ['LOSERS', '💀 Losers', 'text-orange-400 border-orange-400/40'],
                                    ['GRAND_FINAL', '⚔️ Grand Final', 'text-yellow-400 border-yellow-400/40']].map(([key, label, color]) => (
                                        <button
                                            key={key}
                                            onClick={() => setActiveSection(key)}
                                            className={`px-4 py-2 rounded-lg text-sm font-heading font-semibold border transition-all ${activeSection === key
                                                    ? `${color} bg-white/8`
                                                    : 'border-white/10 text-white/40 hover:text-white/70'
                                                }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>

                                {/* Active section bracket */}
                                <div className="flex gap-10 items-start pt-2 pb-6">
                                    {Object.entries(
                                        activeSection === 'WINNERS' ? bracketData.WINNERS :
                                            activeSection === 'LOSERS' ? bracketData.LOSERS :
                                                bracketData.GRAND_FINAL
                                    ).sort(([a], [b]) => {
                                        const lbOrder = k => {
                                            const m = k.match(/LB Round (\d+)/)
                                            return m ? parseInt(m[1]) : (k === 'Grand Final' ? 999 : 0)
                                        }
                                        const wbOrder = k => ({
                                            'Final': 999, 'Semi Final': 998, 'Quarter Final': 997
                                        })[k] ?? parseInt(k.replace('Round ', ''))
                                        return activeSection === 'LOSERS' ? lbOrder(a) - lbOrder(b) : wbOrder(a) - wbOrder(b)
                                    }).map(([roundName, matches]) => (
                                        <RoundColumn key={roundName} roundName={roundName} matches={matches} />
                                    ))}

                                    {activeSection === 'GRAND_FINAL' && tournament?.winnerId && (
                                        <ChampionBanner winnerId={tournament.winnerId} />
                                    )}
                                </div>

                                {/* Losers bracket info note */}
                                {activeSection === 'WINNERS' && (
                                    <p className="text-center text-white/25 text-xs mt-2">
                                        💀 Losers from each WB round drop into the Losers Bracket
                                    </p>
                                )}
                            </motion.div>
                        ) : (
                            // ─── Single Elimination / Round Robin View ─────────
                            <motion.div key="se-bracket" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="flex gap-10 items-start pt-4 pb-6"
                            >
                                {Object.entries(bracketData.rounds)
                                    .sort(([a], [b]) => {
                                        const order = { 'Final': 999, 'Semi Final': 998, 'Quarter Final': 997 }
                                        const getOrder = k => order[k] ?? parseInt(k.replace('Round ', ''))
                                        return getOrder(a) - getOrder(b)
                                    })
                                    .map(([roundName, matches]) => (
                                        <RoundColumn key={roundName} roundName={roundName} matches={matches} />
                                    ))
                                }
                                {tournament?.winnerId && <ChampionBanner winnerId={tournament.winnerId} />}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}

// ─── Champion Banner ───────────────────────────────────────────────────────────
function ChampionBanner({ winnerId }) {
    return (
        <div className="flex flex-col items-center gap-2 flex-shrink-0 ml-6">
            <span className="font-heading text-xs font-bold uppercase tracking-wider text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-3 py-1 rounded-full mb-2">
                Champion
            </span>
            <div className="rounded-xl border border-yellow-400/40 bg-yellow-400/5 px-8 py-6 text-center shadow-lg shadow-yellow-400/10">
                <Trophy size={36} className="text-yellow-400 mx-auto mb-2" />
                <p className="font-display font-bold text-yellow-300 text-xl">
                    {winnerId.split('-')[0].toUpperCase()}
                </p>
            </div>
        </div>
    )
}
