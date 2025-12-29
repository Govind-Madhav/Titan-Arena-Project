/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, User, Users, Medal, Search, Filter, Crown } from 'lucide-react'
import { Particles } from '../../Components/effects/ReactBits'
import api from '../../lib/api'

export default function LeaderboardPage() {
    const [activeTab, setActiveTab] = useState('players') // 'players' | 'teams'
    const [searchTerm, setSearchTerm] = useState('')
    const [leaderboardData, setLeaderboardData] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchLeaderboard()
    }, [])

    const fetchLeaderboard = async () => {
        try {
            const res = await api.get('/stats/leaderboard')
            setLeaderboardData(res.data.data || [])
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error)
        } finally {
            setLoading(false)
        }
    }

    // Filter and Sort
    const filteredData = leaderboardData.filter(item =>
        item.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const top3 = filteredData.slice(0, 3)
    const rest = filteredData.slice(3)

    return (
        <div className="min-h-screen relative bg-titan-bg pb-20">
            <Particles count={30} color="rgba(139, 92, 246, 0.4)" />

            {/* Header Section */}
            <div className="relative pt-24 pb-12 px-4 text-center z-10">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-display font-bold text-4xl md:text-6xl text-white mb-4 tracking-tight"
                >
                    <span className="text-titan-purple">GLOBAL</span> RANKINGS
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-white/40 text-lg max-w-2xl mx-auto"
                >
                    The hall of fame. See who reigns supreme in the arena.
                </motion.p>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Controls */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
                    {/* Tab Switcher (Currently only Players supported) */}
                    <div className="bg-white/5 p-1 rounded-xl flex items-center border border-white/10">
                        <button
                            onClick={() => setActiveTab('players')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-heading font-semibold transition-all duration-300 ${activeTab === 'players' ? 'bg-titan-purple text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                        >
                            <User size={18} /> Players
                        </button>
                        <button
                            disabled
                            className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-heading font-semibold text-white/20 cursor-not-allowed"
                        >
                            <Users size={18} /> Teams (Coming Soon)
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative w-full md:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                        <input
                            type="text"
                            placeholder="Search players..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-dark pl-10 w-full md:w-64 bg-white/5 border-white/10 focus:border-titan-purple/50"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 animate-pulse text-white/40">Loading Leaderboard...</div>
                ) : leaderboardData.length === 0 ? (
                    <div className="text-center py-20 glass-card">
                        <p className="text-white/40">No ranked players yet.</p>
                    </div>
                ) : (
                    <>
                        {/* Podium Section */}
                        {top3.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-end">
                                {/* 2nd Place */}
                                {top3[1] && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 50 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                        className="order-2 md:order-1 relative"
                                    >
                                        <div className="glass-card p-6 rounded-2xl border-t-4 border-silver-400 flex flex-col items-center transform hover:-translate-y-2 transition-transform duration-300">
                                            <div className="absolute -top-5">
                                                <Medal size={40} className="text-gray-300 drop-shadow-lg" />
                                            </div>
                                            <div className="mt-6 w-20 h-20 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 p-1 mb-4">
                                                <div className="w-full h-full rounded-full bg-titan-bg flex items-center justify-center font-bold text-2xl text-white overflow-hidden">
                                                    {top3[1].avatarUrl ? <img src={top3[1].avatarUrl} className="w-full h-full object-cover" /> : top3[1].username[0]}
                                                </div>
                                            </div>
                                            <h2 className="font-bold text-xl text-white mb-1">{top3[1].username}</h2>
                                            <p className="text-titan-purple font-mono font-bold">{top3[1].points.toLocaleString()} PTS</p>
                                        </div>
                                    </motion.div>
                                )}

                                {/* 1st Place */}
                                {top3[0] && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 50 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="order-1 md:order-2 relative -mt-12 md:-mt-0"
                                    >
                                        <div className="relative z-10 glass-card p-8 rounded-2xl border-t-4 border-yellow-400 bg-gradient-to-b from-yellow-500/10 to-titan-bg-card flex flex-col items-center transform scale-105 hover:scale-110 transition-transform duration-300 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                                            <div className="absolute -top-8 animate-bounce">
                                                <Crown size={56} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.6)]" />
                                            </div>
                                            <div className="mt-8 w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 p-1 mb-4 shadow-lg">
                                                <div className="w-full h-full rounded-full bg-titan-bg flex items-center justify-center font-bold text-4xl text-white overflow-hidden">
                                                    {top3[0].avatarUrl ? <img src={top3[0].avatarUrl} className="w-full h-full object-cover" /> : top3[0].username[0]}
                                                </div>
                                            </div>
                                            <h2 className="font-display font-bold text-2xl text-white mb-1">{top3[0].username}</h2>
                                            <p className="text-yellow-400 font-mono font-bold text-xl">{top3[0].points.toLocaleString()} PTS</p>
                                        </div>
                                    </motion.div>
                                )}

                                {/* 3rd Place */}
                                {top3[2] && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 50 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="order-3 relative"
                                    >
                                        <div className="glass-card p-6 rounded-2xl border-t-4 border-orange-700 flex flex-col items-center transform hover:-translate-y-2 transition-transform duration-300">
                                            <div className="absolute -top-5">
                                                <Medal size={40} className="text-orange-700 drop-shadow-lg" />
                                            </div>
                                            <div className="mt-6 w-20 h-20 rounded-full bg-gradient-to-br from-orange-800 to-orange-900 p-1 mb-4">
                                                <div className="w-full h-full rounded-full bg-titan-bg flex items-center justify-center font-bold text-2xl text-white overflow-hidden">
                                                    {top3[2].avatarUrl ? <img src={top3[2].avatarUrl} className="w-full h-full object-cover" /> : top3[2].username[0]}
                                                </div>
                                            </div>
                                            <h2 className="font-bold text-xl text-white mb-1">{top3[2].username}</h2>
                                            <p className="text-titan-purple font-mono font-bold">{top3[2].points.toLocaleString()} PTS</p>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        )}

                        {/* List View */}
                        <div className="bg-titan-bg-card rounded-2xl border border-white/5 overflow-hidden">
                            <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 text-sm font-bold text-white/40 uppercase tracking-wider">
                                <div className="col-span-2 md:col-span-1 text-center">Rank</div>
                                <div className="col-span-6 md:col-span-5">Name</div>
                                <div className="col-span-4 md:col-span-2 text-center">Points</div>
                                <div className="hidden md:block col-span-2 text-center">Win Rate</div>
                            </div>

                            <div className="divide-y divide-white/5">
                                {rest.map((item, index) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors"
                                    >
                                        <div className="col-span-2 md:col-span-1 text-center font-mono text-white/60">#{item.rank}</div>
                                        <div className="col-span-6 md:col-span-5 flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                                                {item.avatarUrl ? <img src={item.avatarUrl} className="w-full h-full object-cover" /> : item.username[0]}
                                            </div>
                                            <span className="font-bold text-white">{item.username}</span>
                                        </div>
                                        <div className="col-span-4 md:col-span-2 text-center font-mono text-titan-purple font-bold">
                                            {item.points.toLocaleString()}
                                        </div>
                                        <div className="hidden md:block col-span-2 text-center text-white/60">{item.winRate}%</div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
