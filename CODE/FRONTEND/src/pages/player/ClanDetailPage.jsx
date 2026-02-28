/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 *
 * ClanDetailPage — Full profile for a single clan: roster, stats, owner controls.
 * Route: /clans/:id
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Shield, Users, Swords, Crown, Globe, Lock,
    LogOut, Trash2, Copy, Check, Edit2, X, Save,
    Loader2, ChevronLeft, UserPlus, ArrowRight,
    Trophy
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import { GradientText } from '../../Components/effects/ReactBits'

const ROLE_ORDER = { OWNER: 0, OFFICER: 1, MEMBER: 2 }
const ROLE_COLORS = {
    OWNER: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    OFFICER: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    MEMBER: 'text-white/50 bg-white/5 border-white/10',
}

function RoleBadge({ role }) {
    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${ROLE_COLORS[role] || ROLE_COLORS.MEMBER}`}>
            {role === 'OWNER' && <Crown size={9} className="inline mr-1" />}
            {role}
        </span>
    )
}

// ─── Edit Clan Modal ──────────────────────────────────────────────────────────
function EditClanModal({ clan, onClose, onSaved }) {
    const [form, setForm] = useState({
        name: clan.name,
        description: clan.description || '',
        isOpen: clan.isOpen
    })
    const [loading, setLoading] = useState(false)

    const handleSave = async () => {
        setLoading(true)
        try {
            const res = await api.patch(`/clans/${clan.id}`, form)
            toast.success('Clan updated')
            onSaved(res.data.data)
            onClose()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Update failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-titan-bg-card border border-white/10 rounded-2xl p-6 w-full max-w-md"
            >
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-heading text-lg font-bold">Edit Clan</h2>
                    <button onClick={onClose}><X size={20} className="text-white/40 hover:text-white" /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-white/40 mb-1 block">Clan Name</label>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className="input-field w-full" required minLength={3} maxLength={100} />
                    </div>
                    <div>
                        <label className="text-xs text-white/40 mb-1 block">Description</label>
                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            rows={3} maxLength={500} className="input-field w-full resize-none" />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={form.isOpen} onChange={e => setForm(f => ({ ...f, isOpen: e.target.checked }))}
                            className="w-4 h-4 accent-titan-purple" />
                        <span className="text-sm text-white/70 flex items-center gap-1">
                            {form.isOpen ? <><Globe size={13} className="text-emerald-400" />Open clan</> : <><Lock size={13} className="text-orange-400" />Invite only</>}
                        </span>
                    </label>
                </div>
                <button onClick={handleSave} disabled={loading}
                    className="btn-neon w-full mt-5 py-2.5 flex items-center justify-center gap-2">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Changes
                </button>
            </motion.div>
        </motion.div>
    )
}

// ─── Member Row ───────────────────────────────────────────────────────────────
function MemberRow({ member, myRole, clanId, onUpdate }) {
    const [loading, setLoading] = useState(false)
    const isOwner = myRole === 'OWNER'

    const promote = async () => {
        setLoading(true)
        try {
            await api.patch(`/clans/${clanId}/members/${member.userId}`, { role: 'OFFICER' })
            toast.success(`${member.username} promoted to Officer`)
            onUpdate()
        } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
        finally { setLoading(false) }
    }

    const demote = async () => {
        setLoading(true)
        try {
            await api.patch(`/clans/${clanId}/members/${member.userId}`, { role: 'MEMBER' })
            toast.success(`${member.username} demoted to Member`)
            onUpdate()
        } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
        finally { setLoading(false) }
    }

    const kick = async () => {
        if (!window.confirm(`Kick ${member.username}?`)) return
        setLoading(true)
        try {
            await api.delete(`/clans/${clanId}/members/${member.userId}`)
            toast.success('Member kicked')
            onUpdate()
        } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
        finally { setLoading(false) }
    }

    return (
        <motion.div
            layout
            className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
        >
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-titan-purple/30 to-titan-pink/20 flex items-center justify-center flex-shrink-0">
                    {member.avatarUrl
                        ? <img src={member.avatarUrl} alt={member.username} className="w-full h-full rounded-full object-cover" />
                        : <span className="text-titan-purple font-bold text-sm">{member.username?.[0]?.toUpperCase()}</span>
                    }
                </div>
                <div>
                    <p className="font-medium text-white text-sm">{member.username}</p>
                    <p className="text-[10px] text-white/30">
                        Joined {new Date(member.joinedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <RoleBadge role={member.role} />
                {isOwner && member.role !== 'OWNER' && !loading && (
                    <div className="flex items-center gap-1 ml-1">
                        {member.role === 'MEMBER' && (
                            <button onClick={promote} title="Promote to Officer"
                                className="p-1.5 rounded-md hover:bg-blue-500/10 text-white/30 hover:text-blue-400 transition-colors">
                                <ArrowRight size={13} />
                            </button>
                        )}
                        {member.role === 'OFFICER' && (
                            <button onClick={demote} title="Demote to Member"
                                className="p-1.5 rounded-md hover:bg-orange-500/10 text-white/30 hover:text-orange-400 transition-colors">
                                <ArrowRight size={13} className="rotate-180" />
                            </button>
                        )}
                        <button onClick={kick} title="Kick"
                            className="p-1.5 rounded-md hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors">
                            <X size={13} />
                        </button>
                    </div>
                )}
                {loading && <Loader2 size={14} className="animate-spin text-white/30 ml-1" />}
            </div>
        </motion.div>
    )
}

// ─── Clan Detail Page ─────────────────────────────────────────────────────────
export default function ClanDetailPage() {
    const { id } = useParams()
    const { user } = useAuthStore()
    const navigate = useNavigate()

    const [clan, setClan] = useState(null)
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showEdit, setShowEdit] = useState(false)
    const [copied, setCopied] = useState(false)
    const [leaving, setLeaving] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const myMember = members.find(m => m.userId === user?.id)
    const myRole = myMember?.role || null
    const isOwner = myRole === 'OWNER'
    const isOfficerOrAbove = ['OWNER', 'OFFICER'].includes(myRole)

    useEffect(() => { fetchClan() }, [id])

    const fetchClan = async () => {
        setLoading(true)
        try {
            const res = await api.get(`/clans/${id}`)
            const data = res.data.data
            setClan(data)
            setMembers((data.members || []).sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9)))
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load clan')
        } finally {
            setLoading(false)
        }
    }

    const handleLeave = async () => {
        if (!window.confirm('Leave this clan?')) return
        setLeaving(true)
        try {
            await api.delete(`/clans/${id}/leave`)
            toast.success('Left the clan')
            navigate('/clans')
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to leave')
        } finally {
            setLeaving(false)
        }
    }

    const handleDisband = async () => {
        if (!window.confirm('DISBAND this clan permanently? This cannot be undone.')) return
        setDeleting(true)
        try {
            await api.delete(`/clans/${id}`)
            toast.success('Clan disbanded')
            navigate('/clans')
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to disband')
        } finally {
            setDeleting(false)
        }
    }

    const copyTag = () => {
        navigator.clipboard.writeText(`[${clan.tag}]`)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }

    if (loading) return (
        <div className="min-h-screen bg-titan-bg flex items-center justify-center gap-3 text-white/30">
            <Loader2 size={24} className="animate-spin" />
            <span className="font-heading">Loading clan…</span>
        </div>
    )

    if (error || !clan) return (
        <div className="min-h-screen bg-titan-bg flex flex-col items-center justify-center gap-4 text-center">
            <Shield size={48} className="text-white/10" />
            <p className="text-white/40">{error || 'Clan not found'}</p>
            <button onClick={() => navigate('/clans')} className="btn-glass px-5 py-2 text-sm">
                <ChevronLeft size={14} className="inline mr-1" />
                Back to Clans
            </button>
        </div>
    )

    return (
        <div className="min-h-screen bg-titan-bg px-4 pt-8 pb-16 max-w-4xl mx-auto">
            {/* Back */}
            <button onClick={() => navigate('/clans')} className="flex items-center gap-1 text-white/30 hover:text-white text-sm mb-6 transition-colors">
                <ChevronLeft size={16} />
                All Clans
            </button>

            {/* Clan Header */}
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
                className="bg-titan-bg-card border border-white/10 rounded-3xl p-6 mb-6 relative overflow-hidden"
            >
                {/* decorative bg */}
                <div className="absolute inset-0 opacity-5 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse at 80% 40%, #7c3aed 0%, transparent 60%)' }} />

                <div className="flex flex-wrap items-start gap-5 relative">
                    {/* Tag badge */}
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-titan-purple/30 to-titan-pink/20 flex items-center justify-center border border-titan-purple/20 flex-shrink-0">
                        <span className="font-display font-black text-titan-purple text-xl">{clan.tag}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="font-display text-2xl font-bold text-white">{clan.name}</h1>
                            <button onClick={copyTag} title="Copy tag"
                                className="p-1 rounded text-white/20 hover:text-white/60 transition-colors">
                                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                            </button>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {clan.isOpen
                                ? <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold"><Globe size={11} />Open Clan</span>
                                : <span className="flex items-center gap-1 text-orange-400 text-xs font-semibold"><Lock size={11} />Invite Only</span>
                            }
                            <span className="text-white/20">•</span>
                            <span className="text-white/30 text-xs flex items-center gap-1"><Crown size={11} />Level {clan.level ?? 1}</span>
                        </div>
                        {clan.description && (
                            <p className="text-white/40 text-sm mt-2 leading-relaxed">{clan.description}</p>
                        )}
                    </div>

                    {/* Owner controls */}
                    {isOwner && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowEdit(true)}
                                className="btn-glass px-3 py-2 text-sm flex items-center gap-1">
                                <Edit2 size={14} />
                                Edit
                            </button>
                        </div>
                    )}
                </div>

                {/* Stat pills */}
                <div className="flex flex-wrap gap-3 mt-5">
                    {[
                        { icon: Users, label: 'Members', value: clan.membersCount ?? members.length },
                        { icon: Swords, label: 'Total Wins', value: clan.totalWins ?? 0 },
                        { icon: Trophy, label: 'Tournaments', value: clan.tournamentsPlayed ?? 0 },
                        { icon: Crown, label: 'Level', value: clan.level ?? 1 },
                    ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="flex items-center gap-2 bg-black/30 rounded-xl px-3 py-2 border border-white/5">
                            <Icon size={14} className="text-titan-purple" />
                            <div>
                                <p className="text-[10px] text-white/30">{label}</p>
                                <p className="font-heading font-bold text-white text-sm">{value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Members */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="bg-titan-bg-card border border-white/10 rounded-3xl p-6 mb-6"
            >
                <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
                    <Users size={18} className="text-titan-purple" />
                    Roster
                    <span className="text-sm font-normal text-white/30 ml-1">({members.length})</span>
                </h2>
                <div className="divide-y divide-white/5">
                    {members.map(m => (
                        <MemberRow
                            key={m.userId}
                            member={m}
                            myRole={myRole}
                            clanId={id}
                            onUpdate={fetchClan}
                        />
                    ))}
                </div>
            </motion.div>

            {/* Actions for member */}
            {myMember && !isOwner && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                    className="flex justify-end"
                >
                    <button onClick={handleLeave} disabled={leaving}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-sm transition-all">
                        {leaving ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                        Leave Clan
                    </button>
                </motion.div>
            )}

            {/* Owner: disband option */}
            {isOwner && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                    className="mt-6 p-4 rounded-2xl border border-red-500/10 bg-red-500/5"
                >
                    <p className="text-sm text-red-400/70 font-medium mb-2 flex items-center gap-1">
                        <Shield size={14} />Danger Zone
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-white/30">Disbanding permanently deletes the clan and removes all members.</p>
                        <button onClick={handleDisband} disabled={deleting}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm transition-all">
                            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            Disband Clan
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Modals */}
            <AnimatePresence>
                {showEdit && (
                    <EditClanModal
                        clan={clan}
                        onClose={() => setShowEdit(false)}
                        onSaved={updated => setClan(prev => ({ ...prev, ...updated }))}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
