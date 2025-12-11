/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    Trophy,
    Wallet,
    Users,
    Swords,
    Bell,
    ChevronRight,
    TrendingUp,
    Calendar,
    Medal,
    Target
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import { SpotlightCard, TiltedCard, GradientText } from '../../Components/effects/ReactBits'
import api from '../../lib/api'

function StatsCard({ icon: Icon, label, value, trend, color = 'titan-purple' }) {
    return (
        <SpotlightCard className="p-6">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-${color}/20`}>
                    <Icon size={24} className={`text-${color}`} />
                </div>
                {trend && (
                    <span className={`flex items-center gap-1 text-sm ${trend > 0 ? 'text-titan-success' : 'text-titan-error'}`}>
                        <TrendingUp size={14} className={trend < 0 ? 'rotate-180' : ''} />
                        {Math.abs(trend)}%
                    </span>
                )}
            </div>
            <p className="text-2xl font-display font-bold text-white mb-1">{value}</p>
            <p className="text-sm text-white/40">{label}</p>
        </SpotlightCard>
    )
}

function QuickActionCard({ icon: Icon, label, to, color }) {
    return (
        <Link to={to}>
            <TiltedCard maxTilt={8}>
                <div className="glass-card p-6 group cursor-pointer">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <Icon size={24} className="text-white" />
                    </div>
                    <h3 className="font-heading font-semibold text-lg mb-1 group-hover:text-titan-purple transition-colors">
                        {label}
                    </h3>
                    <ChevronRight size={18} className="text-white/40 group-hover:text-titan-purple group-hover:translate-x-1 transition-all" />
                </div>
            </TiltedCard>
        </Link>
    )
}

export default function DashboardPage() {
    const { user } = useAuthStore()
    const [wallet, setWallet] = useState({ balance: 0, locked: 0 })
    const [stats, setStats] = useState({
        rank: '#-',
        tournaments: 0,
        wins: 0,
        teams: 0
    })

    useEffect(() => {
        // Fetch wallet
        api.get('/wallet')
            .then(res => setWallet(res.data.data || { balance: 0, locked: 0 }))
            .catch(() => { })

        // Fetch stats (would come from API)
        setStats({
            rank: '#128',
            tournaments: 12,
            wins: 3,
            teams: 2
        })
    }, [])

    const formatCurrency = (paise) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(paise / 100)
    }

    return (
        <div className="min-h-screen bg-titan-bg py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Welcome Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">
                        Welcome back, <GradientText>{user?.username || 'Player'}</GradientText>!
                    </h1>
                    <p className="text-white/40">Here's your arena overview</p>
                </motion.div>

                {/* Stats Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
                >
                    <StatsCard
                        icon={Medal}
                        label="Global Rank"
                        value={stats.rank}
                        trend={5}
                    />
                    <StatsCard
                        icon={Wallet}
                        label="Wallet Balance"
                        value={formatCurrency(wallet.balance)}
                    />
                    <StatsCard
                        icon={Trophy}
                        label="Tournaments Played"
                        value={stats.tournaments}
                        trend={12}
                    />
                    <StatsCard
                        icon={Target}
                        label="Wins"
                        value={stats.wins}
                    />
                </motion.div>

                {/* Quick Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-8"
                >
                    <h2 className="font-heading text-xl font-semibold mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <QuickActionCard
                            icon={Trophy}
                            label="Find Tournament"
                            to="/tournaments"
                            color="from-titan-purple to-titan-blue"
                        />
                        <QuickActionCard
                            icon={Users}
                            label="My Teams"
                            to="/teams"
                            color="from-titan-blue to-titan-cyan"
                        />
                        <QuickActionCard
                            icon={Swords}
                            label="My Matches"
                            to="/matches"
                            color="from-orange-500 to-red-500"
                        />
                        <QuickActionCard
                            icon={Wallet}
                            label="Wallet"
                            to="/wallet"
                            color="from-titan-success to-emerald-500"
                        />
                    </div>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Upcoming Matches */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-heading text-xl font-semibold">Upcoming Matches</h2>
                            <Link to="/matches" className="text-titan-purple text-sm hover:text-titan-purple-light">
                                View all
                            </Link>
                        </div>
                        <div className="glass-card divide-y divide-white/5">
                            {[
                                { game: 'BGMI Pro League', time: 'Today, 8:00 PM', vs: 'Team Alpha' },
                                { game: 'Valorant Cup', time: 'Tomorrow, 6:00 PM', vs: 'Phoenix Squad' },
                                { game: 'Free Fire Weekly', time: 'Dec 15, 4:00 PM', vs: 'FireLords' },
                            ].map((match, i) => (
                                <div key={i} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                    <div>
                                        <p className="font-heading font-semibold">{match.game}</p>
                                        <p className="text-sm text-white/40">vs {match.vs}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-titan-purple">{match.time}</p>
                                        <Calendar size={14} className="inline text-white/40" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Recent Notifications */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-heading text-xl font-semibold">Notifications</h2>
                            <span className="px-2 py-1 rounded-full bg-titan-purple/20 text-titan-purple text-xs font-semibold">
                                3 new
                            </span>
                        </div>
                        <div className="glass-card divide-y divide-white/5">
                            {[
                                { title: 'Team invite received', desc: 'Phoenix Squad wants you to join', time: '2h ago', type: 'info' },
                                { title: 'Tournament starting soon', desc: 'BGMI Pro League begins in 4 hours', time: '4h ago', type: 'warning' },
                                { title: 'Prize credited!', desc: '₹500 added to wallet', time: '1d ago', type: 'success' },
                            ].map((notif, i) => (
                                <div key={i} className="p-4 flex items-start gap-3 hover:bg-white/5 transition-colors cursor-pointer">
                                    <div className={`p-2 rounded-lg ${notif.type === 'success' ? 'bg-titan-success/20' :
                                        notif.type === 'warning' ? 'bg-titan-warning/20' :
                                            'bg-titan-purple/20'
                                        }`}>
                                        <Bell size={16} className={
                                            notif.type === 'success' ? 'text-titan-success' :
                                                notif.type === 'warning' ? 'text-titan-warning' :
                                                    'text-titan-purple'
                                        } />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-heading font-semibold text-sm">{notif.title}</p>
                                        <p className="text-sm text-white/40">{notif.desc}</p>
                                    </div>
                                    <span className="text-xs text-white/30">{notif.time}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
