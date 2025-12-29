/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    Users,
    Plus,
    Crown,
    UserPlus,
    X,
    Check,
    Trash2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { SpotlightCard, TiltedCard, GradientText } from '../../Components/effects/ReactBits'
import api from '../../lib/api'

export default function TeamsPage() {
    const [teams, setTeams] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newTeamName, setNewTeamName] = useState('')

    useEffect(() => {
        fetchTeams()
    }, [])

    const fetchTeams = async () => {
        try {
            const res = await api.get('/teams/my')
            setTeams(res.data.data || [])
        } catch (error) {
            console.error('Failed to fetch teams:', error)
        } finally {
            setLoading(false)
        }
    }

    const createTeam = async () => {
        if (!newTeamName.trim()) return
        try {
            await api.post('/teams', { name: newTeamName })
            toast.success('Team created!')
            setNewTeamName('')
            setShowCreateModal(false)
            fetchTeams()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create team')
        }
    }

    const displayTeams = teams;

    return (
        <div className="min-h-screen bg-titan-bg py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between mb-8"
                >
                    <div>
                        <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">
                            <Users className="inline-block mr-3 text-titan-purple" />
                            My <GradientText>Teams</GradientText>
                        </h1>
                        <p className="text-white/40">Manage your squads</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn-neon flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Create Team
                    </button>
                </motion.div>

                {/* Teams Grid */}
                {loading ? (
                    <div className="grid md:grid-cols-2 gap-6">
                        {[1, 2].map(i => (
                            <div key={i} className="glass-card h-60 animate-pulse" />
                        ))}
                    </div>
                ) : displayTeams.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-20"
                    >
                        <Users size={48} className="text-white/20 mx-auto mb-4" />
                        <h3 className="font-heading text-xl font-semibold mb-2">No teams yet</h3>
                        <p className="text-white/40 mb-6">Create a team to compete in tournaments</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="btn-neon"
                        >
                            Create Your First Team
                        </button>
                    </motion.div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                        {displayTeams.map((team, i) => (
                            <motion.div
                                key={team.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <TiltedCard maxTilt={4}>
                                    <SpotlightCard className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h3 className="font-heading text-xl font-bold">{team.name}</h3>
                                                <p className="text-sm text-white/40 flex items-center gap-1">
                                                    <Crown size={14} className="text-titan-purple" />
                                                    {team.captain?.username}
                                                </p>
                                            </div>
                                            <span className="px-3 py-1 rounded-full bg-titan-purple/20 text-titan-purple text-sm font-semibold">
                                                {team.members?.length || team._count?.members} members
                                            </span>
                                        </div>

                                        {/* Members */}
                                        <div className="space-y-2 mb-4">
                                            {(team.members || []).slice(0, 4).map(member => (
                                                <div
                                                    key={member.id}
                                                    className="flex items-center justify-between p-2 rounded-lg bg-white/5"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-titan-purple to-titan-blue flex items-center justify-center">
                                                            <span className="text-xs font-bold">
                                                                {member.user.username.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <span className="font-heading">{member.user.username}</span>
                                                        {member.role === 'CAPTAIN' && (
                                                            <Crown size={14} className="text-titan-warning" />
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            <button className="btn-glass flex-1 py-2 text-sm flex items-center justify-center gap-2">
                                                <UserPlus size={16} />
                                                Invite
                                            </button>
                                            <button className="btn-neon-outline flex-1 py-2 text-sm">
                                                Manage
                                            </button>
                                        </div>
                                    </SpotlightCard>
                                </TiltedCard>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Create Team Modal */}
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="glass-card p-6 w-full max-w-md"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="font-display text-xl font-bold">Create Team</h2>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <input
                                type="text"
                                placeholder="Team Name"
                                value={newTeamName}
                                onChange={(e) => setNewTeamName(e.target.value)}
                                className="input-dark w-full mb-4"
                                autoFocus
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="btn-glass flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={createTeam}
                                    className="btn-neon flex-1 flex items-center justify-center gap-2"
                                >
                                    <Check size={18} />
                                    Create
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </div>
        </div>
    )
}
