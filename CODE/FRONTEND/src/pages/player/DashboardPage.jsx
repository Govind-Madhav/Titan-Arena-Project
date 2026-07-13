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
    const [upcomingMatches, setUpcomingMatches] = useState([])
    const [dashboardNotifications, setDashboardNotifications] = useState([])

    useEffect(() => {
        // Fetch wallet
        api.get('/wallet')
            .then(res => setWallet(res.data.data || { balance: 0, locked: 0 }))
            .catch(() => { })

        // Fetch stats
        api.get('/stats/my')
            .then(res => {
                if (res.data?.success && res.data?.data) {
                    const s = res.data.data;
                    setStats({
                        rank: s.globalRank && s.globalRank !== 'N/A' ? `#${s.globalRank}` : '#-',
                        tournaments: s.tournamentsJoined || 0,
                        wins: s.matchesWon || 0,
                        teams: s.winRate ? `${Math.round(s.winRate)}%` : '0%'
                    });
                }
            })
            .catch(err => console.error('Failed to fetch player stats', err));

        // Fetch matches
        api.get('/matches/my')
            .then(res => {
                const allMatches = res.data?.data || [];
                const upcoming = allMatches
                    .filter(m => m.status !== 'COMPLETED')
                    .slice(0, 3);
                setUpcomingMatches(upcoming);
            })
            .catch(err => console.error('Failed to fetch user matches', err));

        // Fetch notifications
        api.get('/notifications')
            .then(res => {
                setDashboardNotifications((res.data?.data || []).slice(0, 3));
            })
            .catch(err => console.error('Failed to fetch notifications', err));
    }, [])

    const formatDate = (dateString) => {
        if (!dateString) return 'TBD';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatTimeAgo = (dateString) => {
        if (!dateString) return '';
        const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

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
                        Welcome back, <GradientText>{user?.ign || user?.username || 'Player'}</GradientText>!
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
                            {upcomingMatches.length === 0 ? (
                                <div className="p-8 text-center text-white/40">
                                    No upcoming matches scheduled.
                                </div>
                            ) : (
                                upcomingMatches.map((match, i) => (
                                    <div key={match.id || i} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                        <div>
                                            <p className="font-heading font-semibold">{match.tournamentName || match.tournamentGame || 'Tournament Match'}</p>
                                            <p className="text-sm text-white/40">{match.roundName || `Round ${match.round || 1}`}</p>
                                        </div>
                                        <div className="text-right flex items-center gap-2">
                                            <span className="text-sm text-titan-purple">{formatDate(match.startTime)}</span>
                                            <Calendar size={14} className="text-white/40" />
                                        </div>
                                    </div>
                                ))
                            )}
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
                            {dashboardNotifications.filter(n => !n.isRead).length > 0 && (
                                <span className="px-2 py-1 rounded-full bg-titan-purple/20 text-titan-purple text-xs font-semibold">
                                    {dashboardNotifications.filter(n => !n.isRead).length} new
                                </span>
                            )}
                        </div>
                        <div className="glass-card divide-y divide-white/5">
                            {dashboardNotifications.length === 0 ? (
                                <div className="p-8 text-center text-white/40">
                                    No new notifications.
                                </div>
                            ) : (
                                dashboardNotifications.map((notif, i) => (
                                    <div key={notif.id || i} className="p-4 flex items-start gap-3 hover:bg-white/5 transition-colors cursor-pointer">
                                        <div className="p-2 rounded-lg bg-titan-purple/20">
                                            <Bell size={16} className="text-titan-purple" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-heading font-semibold text-sm">{notif.title}</p>
                                            <p className="text-sm text-white/40">{notif.message}</p>
                                        </div>
                                        <span className="text-xs text-white/30 whitespace-nowrap">{formatTimeAgo(notif.createdAt)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
