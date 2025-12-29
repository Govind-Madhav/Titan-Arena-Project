/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    Search,
    Filter,
    Gamepad2,
    Trophy,
    ChevronDown,
    X
} from 'lucide-react'
import TournamentCard from '../../Components/tournament/TournamentCard'
import { CardNav, TiltedCard } from '../../Components/effects/ReactBits'
import api from '../../lib/api'

// removed hardcoded GAMES array -> now dynamic
const STATUSES = ['All', 'UPCOMING', 'ONGOING', 'COMPLETED']
const TYPES = ['All', 'SOLO', 'TEAM']

export default function TournamentsPage() {
    const [tournaments, setTournaments] = useState([])
    const [games, setGames] = useState(['All']) // Dynamic games list
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filters, setFilters] = useState({
        game: 'All',
        status: 'All',
        type: 'All'
    })
    const [showFilters, setShowFilters] = useState(false)

    useEffect(() => {
        fetchGames()
        fetchTournaments()
    }, [filters])

    const fetchGames = async () => {
        try {
            const res = await api.get('/games')
            const gameNames = res.data.data.map(g => g.name)
            setGames(['All', ...gameNames])
        } catch (error) {
            console.error('Failed to fetch games', error)
            // Fallback to defaults if API fails
            setGames(['All', 'BGMI', 'Valorant', 'Free Fire', 'CS2', 'COD Mobile'])
        }
    }

    const fetchTournaments = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (filters.game !== 'All') params.append('game', filters.game)
            if (filters.status !== 'All') params.append('status', filters.status)
            if (filters.type !== 'All') params.append('type', filters.type)

            const res = await api.get(`/tournaments?${params}`)
            setTournaments(res.data.data || [])
        } catch (error) {
            console.error('Failed to fetch tournaments:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredTournaments = tournaments.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.game.toLowerCase().includes(search.toLowerCase())
    )

    // Mock data for display
    const mockTournaments = [
        { id: '1', name: 'BGMI Pro League S1', game: 'BGMI', prizePool: 100000, entryFee: 5000, status: 'UPCOMING', startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), type: 'SQUAD', _count: { registrations: 48 } },
        { id: '2', name: 'Valorant Champions Cup', game: 'Valorant', prizePool: 50000, entryFee: 2500, status: 'UPCOMING', startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), type: 'TEAM', _count: { registrations: 32 } },
        { id: '3', name: 'Free Fire Weekly', game: 'Free Fire', prizePool: 25000, entryFee: 1000, status: 'ONGOING', startTime: new Date().toISOString(), type: 'SOLO', _count: { registrations: 64 } },
        { id: '4', name: 'CS2 Showdown', game: 'CS2', prizePool: 75000, entryFee: 3000, status: 'UPCOMING', startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), type: 'TEAM', _count: { registrations: 20 } },
        { id: '5', name: 'COD Mobile Elite', game: 'COD Mobile', prizePool: 40000, entryFee: 2000, status: 'COMPLETED', startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), type: 'SQUAD', _count: { registrations: 56 } },
        { id: '6', name: 'BGMI Rookie Cup', game: 'BGMI', prizePool: 20000, entryFee: 500, status: 'UPCOMING', startTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), type: 'DUO', _count: { registrations: 80 } },
    ]

    const displayTournaments = filteredTournaments

    return (
        <div className="min-h-screen bg-titan-bg py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">
                        <Trophy className="inline-block mr-3 text-titan-purple" />
                        Discover Tournaments
                    </h1>
                    <p className="text-white/40">Find your next competition</p>
                </motion.div>

                {/* Search & Filters */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card p-4 mb-8"
                >
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                            <input
                                type="text"
                                placeholder="Search tournaments..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="input-dark pl-12 w-full"
                            />
                        </div>

                        {/* Filter Toggle (Mobile) */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="lg:hidden btn-glass flex items-center justify-center gap-2"
                        >
                            <Filter size={18} />
                            Filters
                            <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Filters (Desktop) */}
                        <div className="hidden lg:flex items-center gap-4">
                            <select
                                value={filters.game}
                                onChange={(e) => setFilters({ ...filters, game: e.target.value })}
                                className="input-dark pr-10 cursor-pointer"
                            >
                                {games.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="input-dark pr-10 cursor-pointer"
                            >
                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select
                                value={filters.type}
                                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                className="input-dark pr-10 cursor-pointer"
                            >
                                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Mobile Filters */}
                    {showFilters && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="lg:hidden mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-4"
                        >
                            <select
                                value={filters.game}
                                onChange={(e) => setFilters({ ...filters, game: e.target.value })}
                                className="input-dark text-sm"
                            >
                                {games.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="input-dark text-sm"
                            >
                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select
                                value={filters.type}
                                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                className="input-dark text-sm"
                            >
                                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </motion.div>
                    )}

                    {/* Active Filters */}
                    {(filters.game !== 'All' || filters.status !== 'All' || filters.type !== 'All') && (
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
                            {Object.entries(filters).map(([key, value]) =>
                                value !== 'All' && (
                                    <span
                                        key={key}
                                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-titan-purple/20 text-titan-purple text-sm"
                                    >
                                        {value}
                                        <button onClick={() => setFilters({ ...filters, [key]: 'All' })}>
                                            <X size={14} />
                                        </button>
                                    </span>
                                )
                            )}
                            <button
                                onClick={() => setFilters({ game: 'All', status: 'All', type: 'All' })}
                                className="text-sm text-white/40 hover:text-white"
                            >
                                Clear all
                            </button>
                        </div>
                    )}
                </motion.div>

                {/* Results Count */}
                <p className="text-white/40 mb-6">
                    {displayTournaments.length} tournament{displayTournaments.length !== 1 ? 's' : ''} found
                </p>

                {/* Tournament Grid */}
                {loading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="glass-card h-80 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {displayTournaments.map((tournament, i) => (
                            <motion.div
                                key={tournament.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <TiltedCard maxTilt={4}>
                                    <TournamentCard tournament={tournament} />
                                </TiltedCard>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && displayTournaments.length === 0 && (
                    <div className="text-center py-20">
                        <Gamepad2 size={48} className="text-white/20 mx-auto mb-4" />
                        <h3 className="font-heading text-xl font-semibold mb-2">No tournaments found</h3>
                        <p className="text-white/40">Try adjusting your filters</p>
                    </div>
                )}
            </div>
        </div>
    )
}
