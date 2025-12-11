/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    Users,
    Trophy,
    Target,
    Activity,
    DollarSign,
    Shield,
    ArrowUpRight,
    TrendingUp,
    AlertCircle,
    CheckCircle
} from 'lucide-react'
import Layout from '../../Components/layout/Layout'
import useAuthStore from '../../store/authStore'
import { SpotlightCard, GradientText } from '../../Components/effects/ReactBits'
import api from '../../lib/api'

// Start of Admin Dashboard Component
const AdminDashboard = () => {
    const { user } = useAuthStore()
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalTournaments: 0,
        activeHosts: 0,
        revenue: 0,
        pendingKYC: 0
    })

    // Mock fetching stats - in real app, call API
    useEffect(() => {
        // api.get('/admin/stats').then...
        setStats({
            totalUsers: 1250,
            totalTournaments: 142,
            activeHosts: 45,
            revenue: 250000,
            pendingKYC: 12
        })
    }, [])

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount)
    }

    return (
        <Layout userRole="ADMIN">
            <div className="min-h-screen bg-titan-bg py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
                {/* Background Blobs */}
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-titan-purple/10 rounded-full blur-[100px]" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-titan-blue/10 rounded-full blur-[100px]" />
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    {/* Header */}
                    <div className="mb-12">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="font-display text-4xl md:text-5xl font-bold mb-4"
                        >
                            Admin <GradientText>Command Center</GradientText>
                        </motion.h1>
                        <p className="text-white/40 text-lg max-w-2xl">
                            Welcome back, {user?.username}. You have full control over the arena infrastructure.
                        </p>
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        <StatsCard
                            title="Total Users"
                            value={stats.totalUsers.toLocaleString()}
                            icon={Users}
                            color="text-blue-400"
                            trend="+12% this week"
                        />
                        <StatsCard
                            title="Platform Revenue"
                            value={formatCurrency(stats.revenue)}
                            icon={DollarSign}
                            color="text-green-400"
                            trend="+8.5% this month"
                        />
                        <StatsCard
                            title="Active Tournaments"
                            value="24"
                            icon={Trophy}
                            color="text-purple-400"
                        />
                        <StatsCard
                            title="Pending KYC"
                            value={stats.pendingKYC}
                            icon={Shield}
                            color="text-yellow-400"
                            border="border-yellow-500/30"
                        />
                    </div>

                    {/* Management Sections */}
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Main Actions Area */}
                        <div className="lg:col-span-2 space-y-8">
                            <section>
                                <h2 className="font-heading text-2xl font-bold mb-6 flex items-center gap-2">
                                    <Target className="text-titan-purple" />
                                    Management Modules
                                </h2>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <ActionCard
                                        to="/manageUsers"
                                        title="User Management"
                                        desc="Manage players, bans, and roles."
                                        icon={Users}
                                        color="bg-blue-500/10 hover:bg-blue-500/20"
                                        borderColor="border-blue-500/20"
                                    />
                                    <ActionCard
                                        to="/manageHosts"
                                        title="Host Verification"
                                        desc="Approve or reject tournament hosts."
                                        icon={Shield}
                                        color="bg-purple-500/10 hover:bg-purple-500/20"
                                        borderColor="border-purple-500/20"
                                    />
                                    <ActionCard
                                        to="/manageTourn"
                                        title="Tournament Oversight"
                                        desc="Monitor and control active events."
                                        icon={Trophy}
                                        color="bg-pink-500/10 hover:bg-pink-500/20"
                                        borderColor="border-pink-500/20"
                                    />
                                </div>
                            </section>

                            <section>
                                <h2 className="font-heading text-2xl font-bold mb-6 flex items-center gap-2">
                                    <Activity className="text-titan-purple" />
                                    System Activity
                                </h2>
                                <div className="bg-titan-bg-card border border-white/5 rounded-2xl p-6">
                                    <div className="space-y-4">
                                        {[
                                            { action: 'New Host Application', user: 'CyberCafe_Delhi', time: '10 mins ago', status: 'pending' },
                                            { action: 'Tournament Created', user: 'ProGamingHub', time: '25 mins ago', status: 'success' },
                                            { action: 'User Reported', user: 'ToxicPlayer123', time: '1 hour ago', status: 'warning' },
                                            { action: 'Withdrawal Request', user: 'WinnerGeneric', time: '2 hours ago', status: 'pending' }
                                        ].map((log, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-green-500' :
                                                        log.status === 'warning' ? 'bg-red-500' : 'bg-yellow-500'
                                                        }`} />
                                                    <div>
                                                        <p className="font-medium text-white">{log.action}</p>
                                                        <p className="text-sm text-white/40">by {log.user}</p>
                                                    </div>
                                                </div>
                                                <span className="text-xs text-white/30">{log.time}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <button className="w-full mt-4 py-2 text-sm text-titan-purple hover:text-white transition-colors">
                                        View Full Audit Logs
                                    </button>
                                </div>
                            </section>
                        </div>

                        {/* Recent Alerts / Quick Stats */}
                        <div className="space-y-6">
                            <div className="bg-gradient-to-br from-titan-purple/20 to-blue-600/10 border border-titan-purple/20 rounded-2xl p-6">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <AlertCircle className="text-yellow-400" size={20} />
                                    Attention Needed
                                </h3>
                                <div className="space-y-3">
                                    <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                                        <span className="text-sm">Pending KYC Requests</span>
                                        <span className="font-bold text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">12</span>
                                    </div>
                                    <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                                        <span className="text-sm">Reported Matches</span>
                                        <span className="font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded">3</span>
                                    </div>
                                    <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                                        <span className="text-sm">Withdrawal Requests</span>
                                        <span className="font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded">45</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    )
}

// Sub-components for cleaner code
const StatsCard = ({ title, value, icon: Icon, color, trend, border = "border-white/5" }) => (
    <div className={`bg-titan-bg-card border ${border} p-6 rounded-2xl relative overflow-hidden group`}>
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Icon size={64} />
        </div>
        <div className="relative z-10">
            <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-4 ${color}`}>
                <Icon size={20} />
            </div>
            <p className="text-white/40 text-sm mb-1">{title}</p>
            <h3 className="text-2xl font-display font-bold text-white">{value}</h3>
            {trend && <p className="text-xs text-green-400 mt-2 flex items-center gap-1"><TrendingUp size={12} /> {trend}</p>}
        </div>
    </div>
)

const ActionCard = ({ to, title, desc, icon: Icon, color, borderColor }) => (
    <Link to={to} className={`block p-6 rounded-2xl border ${borderColor} ${color} transition-all group`}>
        <div className="flex items-start justify-between">
            <div>
                <h3 className="font-heading font-bold text-lg text-white mb-1 group-hover:text-titan-purple transition-colors">{title}</h3>
                <p className="text-sm text-white/50">{desc}</p>
            </div>
            <ArrowUpRight className="text-white/20 group-hover:text-white transition-colors" />
        </div>
    </Link>
)

export default AdminDashboard
