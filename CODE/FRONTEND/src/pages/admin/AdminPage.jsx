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
    Replace,
    UserCog,
    FileText // Added
} from 'lucide-react'
import Layout from '../../Components/layout/Layout'
import useAuthStore from '../../store/authStore'
import { SpotlightCard, GradientText } from '../../Components/effects/ReactBits'
import api from '../../lib/api'
import toast from 'react-hot-toast'

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

    // Super Admin State
    const [admins, setAdmins] = useState([]);
    const [fromAdmin, setFromAdmin] = useState('');
    const [toAdmin, setToAdmin] = useState('');
    const [reassignLoading, setReassignLoading] = useState(false);

    // Fetch Real Stats
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/admin/stats');
                const data = res.data.data;
                setStats({
                    totalUsers: data.users || 0,
                    totalTournaments: data.tournaments || 0,
                    activeHosts: 0,
                    revenue: 0,
                    pendingKYC: 0
                });
            } catch (error) {
                console.error("Failed to fetch admin stats", error);
            }
        };
        fetchStats();

        // Fetch Admins if Super Admin
        if (user?.role === 'SUPERADMIN') {
            const fetchAdmins = async () => {
                try {
                    const res = await api.get('/admin/admins');
                    setAdmins(res.data.data);
                } catch (error) {
                    console.error("Failed to fetch admins", error);
                }
            };
            fetchAdmins();
        }
    }, [user?.role])

    const handleReassign = async () => {
        if (!fromAdmin || !toAdmin) {
            toast.error("Please select both admins");
            return;
        }
        if (fromAdmin === toAdmin) {
            toast.error("Source and Target cannot be the same");
            return;
        }

        try {
            setReassignLoading(true);
            await api.post('/admin/reassign-workload', {
                fromAdminId: fromAdmin,
                toAdminId: toAdmin
            });
            toast.success("Workload reassigned successfully");
            setFromAdmin('');
            setToAdmin('');
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to reassign");
        } finally {
            setReassignLoading(false);
        }
    };

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
                            trend=""
                        />
                        <StatsCard

                            title="Platform Revenue"
                            value={formatCurrency(stats.revenue)}
                            icon={DollarSign}
                            color="text-green-400"
                            trend=""
                        />
                        <StatsCard
                            title="Active Tournaments"
                            value={stats.totalTournaments.toLocaleString()}
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

                    {/* SUPER ADMIN SECTION */}
                    {user?.role === 'SUPERADMIN' && (
                        <div className="mb-12 bg-red-900/10 border border-red-500/20 rounded-2xl p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                <Shield size={120} />
                            </div>
                            <h2 className="font-heading text-2xl font-bold mb-6 flex items-center gap-2 text-red-100">
                                <UserCog className="text-red-500" />
                                Super Admin Controls
                            </h2>

                            <div className="grid md:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                        <Replace size={18} className="text-titan-purple" />
                                        Emergency Workload Reassignment
                                    </h3>
                                    <p className="text-sm text-white/50 mb-6">
                                        Transfer all managed users/hosts from one Admin to another. Use this in case of admin unavailability.
                                    </p>

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs text-white/40 mb-1">Transfer From</label>
                                                <select
                                                    value={fromAdmin}
                                                    onChange={(e) => setFromAdmin(e.target.value)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:outline-none"
                                                >
                                                    <option value="">Select Admin (Current Load)</option>
                                                    {admins.map(a => (
                                                        <option key={a.id} value={a.id}>
                                                            {a.username} ({a.managedUsersCount || 0} users)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-white/40 mb-1">Transfer To</label>
                                                <select
                                                    value={toAdmin}
                                                    onChange={(e) => setToAdmin(e.target.value)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none"
                                                >
                                                    <option value="">Select Target Admin</option>
                                                    {admins.filter(a => a.id !== fromAdmin).map(a => (
                                                        <option key={a.id} value={a.id}>
                                                            {a.username} ({a.managedUsersCount || 0} users)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleReassign}
                                            disabled={reassignLoading || !fromAdmin || !toAdmin}
                                            className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-100 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                                        >
                                            {reassignLoading ? 'Processing...' : 'Execute Transfer'}
                                        </button>
                                    </div>
                                </div>
                                <div className="border-l border-white/5 pl-8 hidden md:block">
                                    <h3 className="text-lg font-bold text-white mb-4">System Status</h3>
                                    <div className="space-y-2 text-sm text-white/60">
                                        <div className="flex justify-between">
                                            <span>Active Admins</span>
                                            <span className="text-white">{admins.length}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Server Load</span>
                                            <span className="text-green-400">Normal</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Security Level</span>
                                            <span className="text-red-400 font-bold">MAXIMUM</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

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
                                        to="/manageApplications"
                                        title="Host Applications"
                                        desc="Review pending host requests."
                                        icon={FileText}
                                        color="bg-yellow-500/10 hover:bg-yellow-500/20"
                                        borderColor="border-yellow-500/20"
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
                                    <div className="text-center py-8 text-white/20 italic">
                                        No recent system activity.
                                    </div>
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
                                        <span className="font-bold text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">0</span>
                                    </div>
                                    <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                                        <span className="text-sm">Reported Matches</span>
                                        <span className="font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded">0</span>
                                    </div>
                                    <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                                        <span className="text-sm">Withdrawal Requests</span>
                                        <span className="font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded">0</span>
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
