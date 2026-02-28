/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 *
 * AdminDisputesPage — Admin dispute review queue.
 * List all disputes, filter by status, resolve with notes, optionally override match winner.
 * Route: /admin/disputes
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    AlertTriangle, CheckCircle, Clock, FileSearch, X,
    Loader2, ChevronDown, ChevronRight, ExternalLink,
    Gavel, User, Trophy, Swords, RotateCcw, Filter
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { GradientText } from '../../Components/effects/ReactBits'

// ─── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    OPEN: { label: 'Open', icon: Clock, tab: 'OPEN', classes: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
    UNDER_REVIEW: { label: 'Under Review', icon: FileSearch, tab: 'OPEN', classes: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
    RESOLVED: { label: 'Resolved', icon: CheckCircle, tab: 'RESOLVED', classes: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    DISMISSED: { label: 'Dismissed', icon: X, tab: 'RESOLVED', classes: 'text-white/30 bg-white/5 border-white/10' },
}

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.OPEN
    const Icon = cfg.icon
    return (
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${cfg.classes}`}>
            <Icon size={9} />
            {cfg.label}
        </span>
    )
}

// ─── Resolve Modal ─────────────────────────────────────────────────────────────
function ResolveModal({ dispute, onClose, onResolved }) {
    const [form, setForm] = useState({
        resolution: '',
        overrideWinnerId: '',
    })
    const [loading, setLoading] = useState(false)

    const handleResolve = async () => {
        if (!form.resolution.trim()) { toast.error('Resolution notes are required'); return }
        setLoading(true)
        try {
            await api.patch(`/disputes/${dispute.id}/resolve`, {
                resolution: form.resolution,
                ...(form.overrideWinnerId ? { overrideWinnerId: form.overrideWinnerId } : {}),
            })
            toast.success('Dispute resolved')
            onResolved()
            onClose()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to resolve')
        } finally {
            setLoading(false)
        }
    }

    const participantA = dispute.match?.participantAId
    const participantB = dispute.match?.participantBId

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.93, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.93, opacity: 0 }}
                className="bg-titan-bg-card border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
            >
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-heading text-lg font-bold flex items-center gap-2 text-white">
                        <Gavel size={18} className="text-titan-purple" />
                        Resolve Dispute
                    </h2>
                    <button onClick={onClose}><X size={20} className="text-white/30 hover:text-white" /></button>
                </div>

                {/* Dispute Summary */}
                <div className="p-4 bg-black/30 rounded-xl border border-white/5 mb-4 text-sm">
                    <p className="text-xs text-white/30 mb-1">Filed By</p>
                    <p className="text-white font-semibold">{dispute.raisedBy?.username || 'Unknown'}</p>
                    <p className="text-xs text-white/30 mt-3 mb-1">Reason</p>
                    <p className="text-white/70 leading-relaxed">{dispute.reason}</p>
                    {dispute.evidenceUrl && (
                        <a href={dispute.evidenceUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-titan-purple hover:underline mt-2">
                            <ExternalLink size={10} />View Evidence
                        </a>
                    )}
                </div>

                <div className="space-y-4">
                    {/* Resolution notes */}
                    <div>
                        <label className="text-xs text-white/40 mb-1.5 block">
                            Resolution Notes <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            rows={3}
                            value={form.resolution}
                            onChange={e => setForm(f => ({ ...f, resolution: e.target.value }))}
                            placeholder="Explain the outcome for both parties…"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-titan-purple focus:outline-none resize-none placeholder-white/20"
                        />
                    </div>

                    {/* Override winner */}
                    {participantA && participantB && (
                        <div>
                            <label className="text-xs text-white/40 mb-1.5 flex items-center gap-1">
                                <RotateCcw size={10} />Override Match Winner (optional — re-triggers MMR & bracket)
                            </label>
                            <select
                                value={form.overrideWinnerId}
                                onChange={e => setForm(f => ({ ...f, overrideWinnerId: e.target.value }))}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-titan-purple focus:outline-none"
                            >
                                <option value="">— Keep original result —</option>
                                <option value={participantA}>Participant A ({participantA.slice(0, 8)}…)</option>
                                <option value={participantB}>Participant B ({participantB.slice(0, 8)}…)</option>
                            </select>
                            {form.overrideWinnerId && (
                                <p className="text-[10px] text-orange-400 mt-1 flex items-center gap-1">
                                    <AlertTriangle size={9} />
                                    This will recalculate MMR and advance the new winner in the bracket.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose} className="flex-1 btn-glass py-2.5 text-sm">
                            Cancel
                        </button>
                        <button onClick={handleResolve} disabled={loading}
                            className="flex-1 btn-neon py-2.5 text-sm flex items-center justify-center gap-2">
                            {loading ? <Loader2 size={15} className="animate-spin" /> : <Gavel size={15} />}
                            {loading ? 'Resolving…' : 'Mark Resolved'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}

// ─── Dispute Row ──────────────────────────────────────────────────────────────
function DisputeRow({ dispute, index, onResolve }) {
    const [expanded, setExpanded] = useState(false)
    const isOpen = dispute.status === 'OPEN' || dispute.status === 'UNDER_REVIEW'

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className={`border rounded-2xl overflow-hidden transition-all ${isOpen
                ? 'border-orange-400/10 bg-orange-400/[0.02]'
                : 'border-white/5 bg-titan-bg-card'
                }`}
        >
            {/* Row header */}
            <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setExpanded(e => !e)}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isOpen ? 'bg-orange-400/10' : 'bg-white/5'}`}>
                    <AlertTriangle size={16} className={isOpen ? 'text-orange-400' : 'text-white/20'} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-heading font-bold text-white text-sm">
                            {dispute.match?.tournament?.name || 'Unknown Tournament'}
                        </p>
                        <StatusBadge status={dispute.status} />
                    </div>
                    <p className="text-xs text-white/30 mt-0.5">
                        Filed by <span className="text-white/50">{dispute.raisedBy?.username || 'Unknown'}</span>
                        {' · '}
                        Round {dispute.match?.round} / Match #{dispute.match?.matchNumber}
                        {' · '}
                        {new Date(dispute.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isOpen && (
                        <button
                            onClick={e => { e.stopPropagation(); onResolve(dispute) }}
                            className="btn-neon px-3 py-1.5 text-xs flex items-center gap-1.5"
                        >
                            <Gavel size={12} />
                            Resolve
                        </button>
                    )}
                    <ChevronRight size={16} className={`text-white/20 transition-transform flex-shrink-0 ${expanded ? 'rotate-90' : ''}`} />
                </div>
            </div>

            {/* Expanded details */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 border-t border-white/5 pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Reason</p>
                                <p className="text-sm text-white/70 leading-relaxed">{dispute.reason}</p>
                                {dispute.evidenceUrl && (
                                    <a href={dispute.evidenceUrl} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-xs text-titan-purple hover:underline mt-2">
                                        <ExternalLink size={10} />View Evidence
                                    </a>
                                )}
                            </div>
                            {dispute.resolution && (
                                <div className="p-3 bg-emerald-400/5 border border-emerald-400/15 rounded-xl">
                                    <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mb-1">Resolution</p>
                                    <p className="text-sm text-white/60">{dispute.resolution}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminDisputesPage() {
    const [disputes, setDisputes] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('OPEN')
    const [resolveTarget, setResolveTarget] = useState(null)
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20 })

    useEffect(() => {
        fetchDisputes()
    }, [filter])

    const fetchDisputes = async () => {
        setLoading(true)
        try {
            const res = await api.get('/disputes', {
                params: { status: filter, page: pagination.page, limit: pagination.limit }
            })
            setDisputes(res.data.data || [])
            if (res.data.pagination) setPagination(res.data.pagination)
        } catch (err) {
            toast.error('Failed to fetch disputes')
        } finally {
            setLoading(false)
        }
    }

    const openCount = disputes.filter(d => d.status === 'OPEN' || d.status === 'UNDER_REVIEW').length

    return (
        <div className="min-h-screen bg-titan-bg px-4 pt-8 pb-16 max-w-5xl mx-auto">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                <h1 className="font-display text-3xl font-bold mb-1">
                    <GradientText>Dispute Queue</GradientText>
                </h1>
                <p className="text-white/40 text-sm">
                    {openCount > 0
                        ? <span className="text-orange-400 font-semibold">{openCount} dispute{openCount !== 1 ? 's' : ''} awaiting review</span>
                        : 'All disputes resolved'
                    }
                </p>
            </motion.div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-5">
                {[
                    { value: 'OPEN', label: 'Open' },
                    { value: 'RESOLVED', label: 'Resolved' },
                ].map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setFilter(tab.value)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
                            ${filter === tab.value
                                ? 'bg-titan-purple/20 text-white border border-titan-purple/40'
                                : 'text-white/40 hover:text-white border border-white/5 hover:border-white/15'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-20 gap-3 text-white/30">
                    <Loader2 size={22} className="animate-spin" />
                    <span className="font-heading">Loading disputes…</span>
                </div>
            ) : disputes.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl">
                    <CheckCircle size={40} className="mx-auto text-emerald-400/30 mb-3" />
                    <p className="text-white/30 text-sm">
                        {filter === 'OPEN' ? 'No open disputes. Everything looks clean!' : 'No resolved disputes yet.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {disputes.map((d, i) => (
                        <DisputeRow
                            key={d.id}
                            dispute={d}
                            index={i}
                            onResolve={setResolveTarget}
                        />
                    ))}
                </div>
            )}

            {/* Stats footer */}
            {pagination.total > 0 && (
                <p className="text-center text-xs text-white/20 mt-6">
                    Showing {disputes.length} of {pagination.total} disputes
                </p>
            )}

            {/* Resolve Modal */}
            <AnimatePresence>
                {resolveTarget && (
                    <ResolveModal
                        dispute={resolveTarget}
                        onClose={() => setResolveTarget(null)}
                        onResolved={fetchDisputes}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
