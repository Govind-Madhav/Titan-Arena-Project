/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { User, Shield, Calendar, Trophy, Mail, CheckCircle, XCircle, Edit, MapPin, Activity, TrendingUp, Swords, Clock, AlertCircle, LayoutDashboard, Crown, ArrowRight } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import { Particles } from '../../Components/effects/ReactBits'

export default function ProfilePage() {
    const { user, getDashboard, getProfile } = useAuthStore()
    const [loading, setLoading] = useState(true)
    const [dashboardData, setDashboardData] = useState({
        tournamentsJoined: 0,
        matchesWon: 0,
        totalMatches: 0,
        losses: 0,
        winRate: 0,
        points: 0,
        globalRank: 'N/A',
        recentMatches: []
    })

    useEffect(() => {
        const fetchData = async () => {
            // Fetch latest profile data to ensure local state is synced
            await getProfile()

            const result = await getDashboard()
            if (result.success) {
                setDashboardData(result.data)
            }
            setLoading(false)
        }
        fetchData()
    }, [getDashboard, getProfile])

    // Calculate K/D Ratio (Mock calculation since we don't have kills/deaths in schema yet)
    // We'll use Win/Loss ratio as a proxy for "Performance Ratio" for now
    const performanceRatio = dashboardData.losses > 0
        ? (dashboardData.matchesWon / dashboardData.losses).toFixed(2)
        : dashboardData.matchesWon > 0 ? "Perfect" : "0.00"


    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState({
        bio: '',
        avatarUrl: ''
    })

    // Initialize form when user data loads or edit mode opens
    useEffect(() => {
        if (user) {
            setEditForm({
                bio: user.bio || '',
                avatarUrl: user.avatarUrl || ''
            })
        }
    }, [user, isEditing])

    const handleUpdateProfile = async () => {
        const { updateProfile } = useAuthStore.getState()
        const result = await updateProfile(editForm)
        if (result.success) {
            setIsEditing(false)
            // You might want to show a toast here
        }
    }

    return (
        <div className="min-h-screen relative bg-titan-bg pb-20">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-titan-purple/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-titan-blue/10 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 relative z-10">

                {/* Header Profile Section */}
                <div className="flex flex-col md:flex-row items-center md:items-end gap-8 mb-12">
                    <div className="relative shrink-0 group">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-titan-purple to-titan-blue p-1 shadow-neon-lg overflow-hidden relative">
                            {/* Avatar Image or Fallback */}
                            <div className="w-full h-full rounded-full bg-titan-bg flex items-center justify-center overflow-hidden">
                                {user?.avatarUrl ? (
                                    <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="font-display font-bold text-4xl md:text-5xl text-white/90">
                                        {(user?.ign || user?.username || 'P').charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>

                            {/* Edit Overlay (only when editing) */}
                            {isEditing && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <Edit size={24} className="text-white/80" />
                                </div>
                            )}
                        </div>
                        <div className="absolute bottom-1 right-1 bg-titan-bg rounded-full p-1.5 border border-white/10 z-10">
                            {user?.emailVerified ? (
                                <CheckCircle className="text-green-400 w-6 h-6 fill-current" />
                            ) : (
                                <XCircle className="text-yellow-400 w-6 h-6 fill-current" />
                            )}
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left w-full">
                        {isEditing ? (
                            <div className="space-y-4 max-w-lg">
                                <div>
                                    <label className="text-xs text-white/40 block mb-1">Avatar URL</label>
                                    <input
                                        type="text"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-titan-purple outline-none"
                                        placeholder="https://imgur.com/..."
                                        value={editForm.avatarUrl}
                                        onChange={(e) => setEditForm({ ...editForm, avatarUrl: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-white/40 block mb-1">Bio</label>
                                    <textarea
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-titan-purple outline-none h-20 resize-none"
                                        placeholder="Tell us about yourself..."
                                        value={editForm.bio}
                                        onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleUpdateProfile} className="btn-primary text-sm py-2 px-4">Save Changes</button>
                                    <button onClick={() => setIsEditing(false)} className="btn-ghost text-sm py-2 px-4">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h1 className="font-display font-bold text-3xl md:text-5xl text-white mb-2">
                                    {user?.ign || user?.username}
                                </h1>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-white/60 mb-4">
                                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-sm">
                                        <Mail size={14} /> {user?.email}
                                    </span>
                                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-sm">
                                        <Shield size={14} className={user?.role === 'ADMIN' ? 'text-titan-purple' : 'text-blue-400'} />
                                        {user?.role}
                                    </span>
                                </div>
                                <p className="text-white/60 font-medium italic mb-2">
                                    {user?.bio || "No bio yet."}
                                </p>
                                <p className="text-white/40 text-sm max-w-lg mx-auto md:mx-0">
                                    Member since {new Date(user?.createdAt).getFullYear()}.
                                    {user?.hostStatus === 'VERIFIED' && ' Verified Tournament Host.'}
                                </p>
                            </>
                        )}
                    </div>

                    {!isEditing && (
                        <div className="flex gap-4">
                            <Link to="/settings" className="btn-secondary px-6 flex items-center gap-2">
                                <Edit size={16} /> Edit Profile
                            </Link>
                            <Link to="/wallet" className="btn-ghost px-6">Wallet</Link>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Stats */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Key Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-5 rounded-2xl bg-titan-bg-card border border-white/5 hover:border-titan-purple/30 transition-all group">
                                <div className="flex items-center gap-3 text-white/60 mb-2">
                                    <Trophy size={18} className="text-yellow-500" />
                                    <span className="text-sm font-medium">Global Rank</span>
                                </div>
                                <div className="font-display font-bold text-2xl text-white group-hover:scale-105 transition-transform origin-left">
                                    {dashboardData.globalRank}
                                </div>
                                <div className="text-xs text-titan-purple mt-1">{dashboardData.points} PTS</div>
                            </div>

                            <div className="p-5 rounded-2xl bg-titan-bg-card border border-white/5 hover:border-titan-purple/30 transition-all group">
                                <div className="flex items-center gap-3 text-white/60 mb-2">
                                    <TrendingUp size={18} className="text-green-400" />
                                    <span className="text-sm font-medium">Win Rate</span>
                                </div>
                                <div className="font-display font-bold text-2xl text-white group-hover:scale-105 transition-transform origin-left">
                                    {dashboardData.winRate}%
                                </div>
                                <div className="text-xs text-white/40 mt-1">{dashboardData.matchesWon}W - {dashboardData.losses}L</div>
                            </div>

                            <div className="p-5 rounded-2xl bg-titan-bg-card border border-white/5 hover:border-titan-purple/30 transition-all group">
                                <div className="flex items-center gap-3 text-white/60 mb-2">
                                    <Swords size={18} className="text-red-400" />
                                    <span className="text-sm font-medium">Total Matches</span>
                                </div>
                                <div className="font-display font-bold text-2xl text-white group-hover:scale-105 transition-transform origin-left">
                                    {dashboardData.totalMatches}
                                </div>
                                <div className="text-xs text-white/40 mt-1">Simulated K/D: {performanceRatio}</div>
                            </div>

                            <div className="p-5 rounded-2xl bg-titan-bg-card border border-white/5 hover:border-titan-purple/30 transition-all group">
                                <div className="flex items-center gap-3 text-white/60 mb-2">
                                    <Calendar size={18} className="text-blue-400" />
                                    <span className="text-sm font-medium">Tournaments</span>
                                </div>
                                <div className="font-display font-bold text-2xl text-white group-hover:scale-105 transition-transform origin-left">
                                    {dashboardData.tournamentsJoined}
                                </div>
                                <div className="text-xs text-white/40 mt-1">Events Joined</div>
                            </div>
                        </div>

                        {/* Recent History */}
                        <div className="bg-titan-bg-card border border-white/5 rounded-2xl overflow-hidden">
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <h3 className="font-display font-bold text-xl text-white flex items-center gap-2">
                                    <Clock size={20} className="text-titan-purple" />
                                    Recent Match History
                                </h3>
                                <Link to="/matches" className="text-xs text-titan-purple hover:text-white transition-colors">View All</Link>
                            </div>

                            <div className="divide-y divide-white/5">
                                {loading ? (
                                    <div className="p-8 text-center text-white/30 italic">Loading history...</div>
                                ) : dashboardData.recentMatches.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-white/20">
                                            <Swords size={32} />
                                        </div>
                                        <p className="text-white/40">No matches played yet.</p>
                                        <Link to="/tournaments" className="text-titan-purple text-sm hover:underline mt-2 inline-block">Join a tournament</Link>
                                    </div>
                                ) : (
                                    dashboardData.recentMatches.map((match) => (
                                        <div key={match.id} className="p-4 hover:bg-white/5 transition-colors grid grid-cols-12 gap-4 items-center">
                                            <div className="col-span-3 md:col-span-2 flex flex-col items-center justify-center">
                                                <span className={`text-xs font-bold px-2 py-1 rounded w-16 text-center ${match.result === 'WIN' ? 'bg-green-500/20 text-green-400' : match.result === 'LOSS' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                                    {match.result}
                                                </span>
                                            </div>
                                            <div className="col-span-9 md:col-span-6">
                                                <p className="font-bold text-white text-sm md:text-base">{match.teamAName} vs {match.teamBName}</p>
                                                <div className="flex items-center gap-2 text-xs text-white/40 mt-1">
                                                    <Trophy size={12} /> {match.tournamentName} • Round {match.round}
                                                </div>
                                            </div>
                                            <div className="col-span-12 md:col-span-4 flex items-center justify-between md:justify-end gap-6 mt-2 md:mt-0 px-4 md:px-0 bg-white/5 md:bg-transparent py-2 md:py-0 rounded-lg">
                                                <div className="text-center">
                                                    <span className="block text-xs text-white/30 uppercase tracking-wider">Score</span>
                                                    <span className="font-mono font-bold text-white text-lg">{match.scoreA} - {match.scoreB}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-xs text-white/30 uppercase tracking-wider">Date</span>
                                                    <span className="text-white/60 text-sm">{new Date(match.startTime).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Mini Dashboard */}
                    <div className="space-y-6">
                        {/* Performance Card */}
                        <div className="bg-gradient-to-br from-titan-purple/20 to-titan-blue/10 border border-titan-purple/20 rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-titan-purple/20 blur-3xl -mr-16 -mt-16"></div>

                            <h3 className="font-bold text-white text-lg mb-4 flex items-center gap-2 relative z-10">
                                <Activity size={18} className="text-titan-purple" />
                                Performance
                            </h3>

                            <div className="space-y-4 relative z-10">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-white/60">Win Rate</span>
                                        <span className="text-white font-bold">{dashboardData.winRate}%</span>
                                    </div>
                                    <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-titan-purple to-titan-blue rounded-full" style={{ width: `${dashboardData.winRate}%` }}></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                        <div className="text-xs text-white/40 mb-1">K/D Ratio</div>
                                        <div className="text-lg font-bold text-white">{performanceRatio}</div>
                                    </div>
                                    <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                        <div className="text-xs text-white/40 mb-1">Total XP</div>
                                        <div className="text-lg font-bold text-white">{dashboardData.points * 15}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions / Quick Links */}
                        <div className="bg-titan-bg-card border border-white/5 rounded-2xl p-6">
                            <h3 className="font-bold text-white text-lg mb-4">Quick Actions</h3>
                            <div className="space-y-2">
                                {(user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') && (
                                    <Link to="/admin" className="flex items-center gap-3 p-3 rounded-xl bg-titan-purple/20 hover:bg-titan-purple/30 text-white transition-all border border-titan-purple/30">
                                        <LayoutDashboard size={18} className="text-titan-purple" />
                                        <span>Admin Dashboard</span>
                                        <ArrowRight className="ml-auto opacity-50" size={16} />
                                    </Link>
                                )}
                                {(user?.role === 'HOST' || user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') && (
                                    <Link to="/host" className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-white transition-all border border-blue-500/30">
                                        <Crown size={18} className="text-blue-400" />
                                        <span>Host Dashboard</span>
                                        <ArrowRight className="ml-auto opacity-50" size={16} />
                                    </Link>
                                )}

                                <Link to="/tournaments" className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all">
                                    <Trophy size={18} className="text-yellow-500" />
                                    <span>Browse Tournaments</span>
                                    <ArrowRight className="ml-auto opacity-50" size={16} />
                                </Link>
                                <Link to="/teams" className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all">
                                    <User size={18} className="text-blue-500" />
                                    <span>Manage Team</span>
                                    <ArrowRight className="ml-auto opacity-50" size={16} />
                                </Link>
                                <Link to="/leaderboard" className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all">
                                    <TrendingUp size={18} className="text-green-500" />
                                    <span>View Leaderboard</span>
                                    <ArrowRight className="ml-auto opacity-50" size={16} />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}


