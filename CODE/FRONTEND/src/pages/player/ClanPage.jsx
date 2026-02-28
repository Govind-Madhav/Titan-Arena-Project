/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 *
 * ClanPage — Browse all clans, search/filter, create a new clan, and join open ones.
 * Route: /clans (protected)
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Users, Plus, Search, Shield, Crown,
    Globe, Lock, Swords, X, Loader2, ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import { GradientText } from '../../Components/effects/ReactBits'

// ─── Create Clan Modal ─────────────────────────────────────────────────────────
function CreateClanModal({ onClose, onCreated }) {
    const [form, setForm] = useState({ name: '', tag: '', description: '', isOpen: true })
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await api.post('/clans', form)
            toast.success(`[${form.tag.toUpperCase()}] ${form.name} created!`)
            onCreated(res.data.data)
            onClose()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create clan')
        } finally {
            setLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-titan-bg-card border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-heading text-xl font-bold">
                        <Shield className="inline-block mr-2 text-titan-purple" size={20} />
                        Create Clan
                    </h2>
                    <button onClick={onClose} className="text-white/40 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-white/50 mb-1">Clan Name</label>
                        <input
                            required
                            minLength={3} maxLength={100}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-titan-purple focus:outline-none text-sm"
                            placeholder="e.g. Shadow Warriors"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-white/50 mb-1">Tag (2–10 chars, A-Z 0-9)</label>
                        <input
                            required
                            minLength={2} maxLength={10}
                            pattern="[A-Za-z0-9]+"
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-titan-purple focus:outline-none text-sm font-mono uppercase"
                            placeholder="SHW"
                            value={form.tag}
                            onChange={e => setForm(f => ({ ...f, tag: e.target.value.toUpperCase() }))}
                        />
                        <p className="text-[10px] text-white/30 mt-1">Will appear as [TAG] before your username in matches.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-white/50 mb-1">Description (optional)</label>
                        <textarea
                            maxLength={500}
                            rows={3}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-titan-purple focus:outline-none text-sm resize-none"
                            placeholder="Tell players about your clan…"
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.isOpen}
                            onChange={e => setForm(f => ({ ...f, isOpen: e.target.checked }))}
                            className="w-4 h-4 accent-titan-purple"
                        />
                        <span className="text-sm text-white/70">
                            {form.isOpen ? <><Globe className="inline mr-1 text-emerald-400" size={14} />Open clan (anyone can join)</> : <><Lock className="inline mr-1 text-orange-400" size={14} />Invite-only</>}
                        </span>
                    </label>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-neon w-full py-3 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
                        {loading ? 'Creating…' : 'Create Clan'}
                    </button>
                </form>
            </motion.div>
        </motion.div>
    )
}

// ─── Clan Card ─────────────────────────────────────────────────────────────────
function ClanCard({ clan, myMembership, onJoin, onView }) {
    const isMember = myMembership?.clanId === clan.id
    const [joining, setJoining] = useState(false)

    const handleJoin = async (e) => {
        e.stopPropagation()
        setJoining(true)
        await onJoin(clan)
        setJoining(false)
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            onClick={() => onView(clan)}
            className="glass-card-hover rounded-2xl p-5 cursor-pointer flex flex-col gap-3 border border-white/5 hover:border-titan-purple/30 transition-all"
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-titan-purple/30 to-titan-pink/20 flex items-center justify-center flex-shrink-0 border border-titan-purple/20">
                        <span className="font-display font-bold text-titan-purple text-sm">{clan.tag}</span>
                    </div>
                    <div>
                        <h3 className="font-heading font-bold text-white text-base leading-tight">{clan.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            {clan.isOpen
                                ? <><Globe size={11} className="text-emerald-400" /><span className="text-[10px] text-emerald-400 font-semibold">OPEN</span></>
                                : <><Lock size={11} className="text-orange-400" /><span className="text-[10px] text-orange-400 font-semibold">INVITE ONLY</span></>
                            }
                        </div>
                    </div>
                </div>
                <ChevronRight size={18} className="text-white/20 flex-shrink-0 mt-1" />
            </div>

            {/* Description */}
            {clan.description && (
                <p className="text-white/40 text-xs leading-relaxed line-clamp-2">{clan.description}</p>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-4 text-xs text-white/40">
                <span className="flex items-center gap-1"><Users size={12} />{clan.membersCount ?? 1} members</span>
                <span className="flex items-center gap-1"><Swords size={12} />{clan.totalWins ?? 0} wins</span>
                <span className="flex items-center gap-1"><Crown size={12} />Lv {clan.level ?? 1}</span>
            </div>

            {/* Action */}
            {isMember ? (
                <span className="text-xs text-titan-purple font-semibold flex items-center gap-1"><Shield size={12} />Your Clan</span>
            ) : myMembership ? null : clan.isOpen ? (
                <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="btn-glass w-full py-2 text-sm flex items-center justify-center gap-2"
                >
                    {joining ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Join
                </button>
            ) : (
                <span className="text-xs text-white/30 italic">Request invite from an officer</span>
            )}
        </motion.div>
    )
}

// ─── Main Clan Hub Page ────────────────────────────────────────────────────────
export default function ClanPage() {
    const { user } = useAuthStore()
    const navigate = useNavigate()

    const [clans, setClans] = useState([])
    const [myMembership, setMyMembership] = useState(null) // current user's clan membership
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showCreate, setShowCreate] = useState(false)

    useEffect(() => {
        fetchAll()
    }, [])

    const fetchAll = async () => {
        setLoading(true)
        try {
            const [clanRes, memberRes] = await Promise.allSettled([
                api.get('/clans'),
                api.get('/clans/my') // returns the user's current membership
            ])
            if (clanRes.status === 'fulfilled') setClans(clanRes.value.data.data || [])
            if (memberRes.status === 'fulfilled') setMyMembership(memberRes.value.data.data)
        } catch (e) {
            //
        } finally {
            setLoading(false)
        }
    }

    const handleJoin = async (clan) => {
        try {
            await api.post(`/clans/${clan.id}/join`)
            toast.success(`Joined [${clan.tag}] ${clan.name}!`)
            fetchAll()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to join clan')
        }
    }

    const filtered = clans.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.tag.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-titan-bg px-4 pt-8 pb-16 max-w-6xl mx-auto">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">
                    <GradientText>Clan Hub</GradientText>
                </h1>
                <p className="text-white/40 text-sm">Form organisations, build your legacy, and compete as one.</p>
            </motion.div>

            {/* My Clan Banner (if member) */}
            {myMembership && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 rounded-2xl border border-titan-purple/40 bg-titan-purple/5 flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-titan-purple/20 flex items-center justify-center">
                            <Shield size={20} className="text-titan-purple" />
                        </div>
                        <div>
                            <p className="text-xs text-white/40">Your Clan</p>
                            <p className="font-heading font-bold text-white">[{myMembership.tag}] {myMembership.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate(`/clans/${myMembership.clanId}`)}
                        className="btn-neon px-4 py-2 text-sm"
                    >
                        View Clan
                    </button>
                </motion.div>
            )}

            {/* Controls */}
            <div className="flex flex-wrap gap-3 mb-6">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search clans by name or tag…"
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:border-titan-purple focus:outline-none"
                    />
                </div>
                {!myMembership && (
                    <button
                        onClick={() => setShowCreate(true)}
                        className="btn-neon px-5 py-2.5 flex items-center gap-2 text-sm"
                    >
                        <Plus size={16} />
                        Create Clan
                    </button>
                )}
            </div>

            {/* Clan Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20 gap-3 text-white/30">
                    <Loader2 size={24} className="animate-spin" />
                    <span className="font-heading">Loading clans…</span>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl">
                    <Shield size={48} className="mx-auto text-white/10 mb-4" />
                    <h3 className="font-heading text-lg font-semibold text-white/40 mb-1">No Clans Found</h3>
                    <p className="text-white/25 text-sm">Be the first to create one!</p>
                    {!myMembership && (
                        <button onClick={() => setShowCreate(true)} className="btn-neon mt-4 px-6 py-2 text-sm">
                            Create Clan
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(clan => (
                        <ClanCard
                            key={clan.id}
                            clan={clan}
                            myMembership={myMembership}
                            onJoin={handleJoin}
                            onView={c => navigate(`/clans/${c.id}`)}
                        />
                    ))}
                </div>
            )}

            {/* Create Modal */}
            <AnimatePresence>
                {showCreate && (
                    <CreateClanModal
                        onClose={() => setShowCreate(false)}
                        onCreated={(clan) => {
                            setClans(prev => [clan, ...prev])
                            fetchAll() // re-fetch to get membership
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
