/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    Swords,
    Trophy,
    Clock,
    CheckCircle,
    AlertTriangle,
    ChevronRight
} from 'lucide-react'
import { SpotlightCard, GradientText } from '../../Components/effects/ReactBits'

export default function MatchesPage() {
    const [activeTab, setActiveTab] = useState('upcoming')

    const tabs = [
        { id: 'upcoming', label: 'Upcoming', icon: Clock },
        { id: 'live', label: 'Live', icon: Swords },
        { id: 'completed', label: 'Completed', icon: CheckCircle },
        { id: 'disputed', label: 'Disputed', icon: AlertTriangle },
    ]

    const mockMatches = {
        upcoming: [
            { id: '1', tournament: 'BGMI Pro League', opponent: 'Team Alpha', time: 'Today, 8:00 PM', game: 'BGMI', round: 'Quarter Final' },
            { id: '2', tournament: 'Valorant Cup', opponent: 'Phoenix Squad', time: 'Tomorrow, 6:00 PM', game: 'Valorant', round: 'Semi Final' },
        ],
        live: [
            { id: '3', tournament: 'Free Fire Weekly', opponent: 'FireLords', score: '2 - 1', game: 'Free Fire', round: 'Final' },
        ],
        completed: [
            { id: '4', tournament: 'CS2 Showdown', opponent: 'Elite Warriors', score: '3 - 1', result: 'win', game: 'CS2', round: 'Group Stage' },
            { id: '5', tournament: 'BGMI Rookie Cup', opponent: 'Noob Squad', score: '0 - 2', result: 'loss', game: 'BGMI', round: 'Semi Final' },
        ],
        disputed: [
            { id: '6', tournament: 'COD Mobile Elite', opponent: 'Hackers Inc', reason: 'Cheating suspected', game: 'COD Mobile', round: 'Quarter Final' },
        ],
    }

    return (
        <div className="min-h-screen bg-titan-bg py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">
                        <Swords className="inline-block mr-3 text-titan-purple" />
                        My <GradientText>Matches</GradientText>
                    </h1>
                    <p className="text-white/40">Track your competition journey</p>
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
                            {tab.id === 'live' && mockMatches.live.length > 0 && (
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            )}
                        </button>
                    ))}
                </motion.div>

                {/* Match List */}
                <div className="space-y-4">
                    {mockMatches[activeTab].length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-20"
                        >
                            <Swords size={48} className="text-white/20 mx-auto mb-4" />
                            <h3 className="font-heading text-xl font-semibold mb-2">No matches</h3>
                            <p className="text-white/40">Check back later</p>
                        </motion.div>
                    ) : (
                        mockMatches[activeTab].map((match, i) => (
                            <motion.div
                                key={match.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <SpotlightCard className="p-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {/* Game Icon */}
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-titan-purple/30 to-titan-blue/30 flex items-center justify-center">
                                                <Trophy size={24} className="text-titan-purple" />
                                            </div>

                                            <div>
                                                <h3 className="font-heading font-bold text-lg">{match.tournament}</h3>
                                                <p className="text-sm text-white/40">
                                                    {match.round} • vs <span className="text-white">{match.opponent}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            {activeTab === 'upcoming' && (
                                                <p className="text-titan-purple font-heading font-semibold">{match.time}</p>
                                            )}
                                            {activeTab === 'live' && (
                                                <div className="flex items-center gap-2">
                                                    <span className="badge-live">LIVE</span>
                                                    <span className="font-display text-2xl font-bold">{match.score}</span>
                                                </div>
                                            )}
                                            {activeTab === 'completed' && (
                                                <div>
                                                    <span className="font-display text-xl font-bold">{match.score}</span>
                                                    <p className={`text-sm font-semibold ${match.result === 'win' ? 'text-titan-success' : 'text-titan-error'
                                                        }`}>
                                                        {match.result === 'win' ? 'Victory' : 'Defeat'}
                                                    </p>
                                                </div>
                                            )}
                                            {activeTab === 'disputed' && (
                                                <p className="text-titan-warning text-sm">{match.reason}</p>
                                            )}
                                        </div>

                                        <ChevronRight size={20} className="text-white/40" />
                                    </div>
                                </SpotlightCard>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
