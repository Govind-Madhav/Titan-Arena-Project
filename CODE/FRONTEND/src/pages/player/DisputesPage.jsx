/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 *
 * DisputesPage — Player-facing dispute management centre.
 * View raised disputes, raise a new one against a match, track status.
 * Route: /disputes
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    AlertTriangle, Plus, FileSearch, X, Loader2,
    CheckCircle, Clock, Swords, ChevronRight, Upload,
    ExternalLink, Shield, Info
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { GradientText } from '../../Components/effects/ReactBits'

// ─── Status Config ─────────────────────────────────────────────────────────────
const STATUS = {
    OPEN: { label: 'Open', icon: Clock, classes: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
    UNDER_REVIEW: { label: 'Under Review', icon: FileSearch, classes: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
    RESOLVED: { label: 'Resolved', icon: CheckCircle, classes: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    DISMISSED: { label: 'Dismissed', icon: X, classes: 'text-white/30 bg-white/5 border-white/10' },
}

function StatusBadge({ status }) {
    const cfg = STATUS[status] || STATUS.OPEN
    const Icon = cfg.icon
    return (
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${cfg.classes}`}>
            <Icon size={9} />
            {cfg.label}
        </span>
    )
}

// ─── Raise Dispute Modal ───────────────────────────────────────────────────────
function RaiseDisputeModal({ matchId, onClose, onRaised }) {
    const [form, setForm] = useState({ reason: '', evidenceUrl: '' })
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            await api.post(`/disputes/match/${matchId}`, {
                reason: form.reason,
                ...(form.evidenceUrl ? { evidenceUrl: form.evidenceUrl } : {}),
            })
            toast.success('Dispute raised. Admins will review it shortly.')
            onRaised()
            onClose()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to raise dispute')
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
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                className="bg-titan-bg-card border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
            >
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-heading text-lg font-bold flex items-center gap-2">
                        <AlertTriangle size={18} className="text-orange-400" />
                        Raise Dispute
                    </h2>
                    <button onClick={onClose}><X size={20} className="text-white/30 hover:text-white" /></button>
                </div>

                <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-start gap-2 mb-4 text-xs text-blue-300/70">
                    <Info size={13} className="text-blue-400 mt-0.5 flex-shrink-0" />
                    Only participants of the match can raise a dispute. False reports may result in penalties.
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs text-white/40 mb-1 block">Match ID</label>
                        <input
                            value={matchId}
                            readOnly
                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-white/30 text-sm font-mono cursor-not-allowed"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-white/40 mb-1 block">
                            Reason <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            required
                            minLength={10}
                            rows={4}
                            value={form.reason}
                            onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                            placeholder="Describe the issue clearly. Include round, match number, and what went wrong…"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-titan-purple focus:outline-none resize-none placeholder-white/20"
                        />
                        <p className="text-[10px] text-white/30 mt-1">{form.reason.length}/500 characters (min 10)</p>
                    </div>
                    <div>
                        <label className="text-xs text-white/40 mb-1 flex items-center gap-1">
                            <Upload size={10} />Evidence URL (screenshot, video — optional)
                        </label>
                        <input
                            type="url"
                            value={form.evidenceUrl}
                            onChange={e => setForm(f => ({ ...f, evidenceUrl: e.target.value }))}
                            placeholder="https://imgur.com/... or YouTube clip"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-titan-purple focus:outline-none placeholder-white/20"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || form.reason.length < 10}
                        className="w-full btn-neon py-3 flex items-center justify-center gap-2 text-sm"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={16} />}
                        {loading ? 'Submitting…' : 'Submit Dispute'}
                    </button>
                </form>
            </motion.div>
        </motion.div>
    )
}

// ─── Dispute List Item ─────────────────────────────────────────────────────────
function DisputeItem({ dispute, index }) {
    const navigate = useNavigate()
    const [expanded, setExpanded] = useState(false)

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-titan-bg-card border border-white/5 hover:border-white/10 rounded-2xl overflow-hidden transition-all"
        >
            {/* Header */}
            <div
                className="flex items-start justify-between p-4 cursor-pointer"
                onClick={() => setExpanded(e => !e)}
            >
                <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertTriangle size={16} className="text-orange-400" />
                    </div>
                    <div>
                        <p className="font-heading font-bold text-white text-sm leading-tight">
                            Match Dispute
                        </p>
                        <p className="text-white/30 text-xs mt-0.5">
                            {dispute.match
                                ? `Round ${dispute.match.round} · Match #${dispute.match.matchNumber}`
                                : `Match ID: ${dispute.matchId?.slice(0, 8)}…`
                            }
                        </p>
                        <p className="text-white/20 text-[10px] mt-0.5">
                            Filed {new Date(dispute.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge status={dispute.status} />
                    <ChevronRight size={16} className={`text-white/20 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                </div>
            </div>

            {/* Expanded */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                            <div>
                                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Reason</p>
                                <p className="text-sm text-white/70 leading-relaxed">{dispute.reason}</p>
                            </div>

                            {dispute.evidenceUrl && (
                                <div>
                                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Evidence</p>
                                    <a
                                        href={dispute.evidenceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-sm text-titan-purple hover:underline"
                                    >
                                        <ExternalLink size={12} />
                                        View Evidence
                                    </a>
                                </div>
                            )}

                            {dispute.resolution && (
                                <div className="p-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5">
                                    <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mb-1">Admin Resolution</p>
                                    <p className="text-sm text-white/70">{dispute.resolution}</p>
                                    {dispute.resolvedAt && (
                                        <p className="text-[10px] text-white/20 mt-1">
                                            Resolved {new Date(dispute.resolvedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                                        </p>
                                    )}
                                </div>
                            )}

                            {dispute.matchId && (
                                <button
                                    onClick={() => navigate(`/tournament/${dispute.match?.tournamentId}/bracket`)}
                                    className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white transition-colors"
                                >
                                    <Swords size={11} />
                                    View Match Bracket
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function DisputesPage() {
    const [disputes, setDisputes] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [matchIdInput, setMatchIdInput] = useState('')
    const [activeMatchId, setActiveMatchId] = useState(null)
    const [searchParams] = useSearchParams()

    // Auto-open modal if matchId is in URL params (?matchId=xxx)
    useEffect(() => {
        const m = searchParams.get('matchId')
        if (m) {
            setActiveMatchId(m)
            setShowModal(true)
        }
        fetchDisputes()
    }, [])

    const fetchDisputes = async () => {
        setLoading(true)
        try {
            const res = await api.get('/disputes/my')
            setDisputes(res.data.data || [])
        } catch {
            //
        } finally {
            setLoading(false)
        }
    }

    const openNewDispute = () => {
        if (!matchIdInput.trim()) {
            toast.error('Enter a Match ID first')
            return
        }
        setActiveMatchId(matchIdInput.trim())
        setShowModal(true)
    }

    const openDisputes = disputes.filter(d => d.status === 'OPEN' || d.status === 'UNDER_REVIEW')
    const closedDisputes = disputes.filter(d => d.status === 'RESOLVED' || d.status === 'DISMISSED')

    return (
        <div className="min-h-screen bg-titan-bg px-4 pt-8 pb-16 max-w-3xl mx-auto">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">
                    <GradientText>Dispute Centre</GradientText>
                </h1>
                <p className="text-white/40 text-sm">Report match issues, track admin review, and see resolutions.</p>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                    { label: 'Total', value: disputes.length, color: 'text-white' },
                    { label: 'Open', value: openDisputes.length, color: 'text-orange-400' },
                    { label: 'Resolved', value: closedDisputes.length, color: 'text-emerald-400' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="bg-titan-bg-card border border-white/5 rounded-2xl p-4 text-center">
                        <p className={`font-heading font-black text-2xl ${color}`}>{value}</p>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">{label}</p>
                    </div>
                ))}
            </div>

            {/* Raise new dispute */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-titan-bg-card border border-white/5 rounded-2xl p-4 mb-6"
            >
                <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Raise New Dispute</p>
                <div className="flex gap-3">
                    <input
                        value={matchIdInput}
                        onChange={e => setMatchIdInput(e.target.value)}
                        placeholder="Paste Match ID…"
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-titan-purple focus:outline-none placeholder-white/20"
                    />
                    <button
                        onClick={openNewDispute}
                        className="btn-neon px-5 py-2.5 text-sm flex items-center gap-2 flex-shrink-0"
                    >
                        <Plus size={16} />
                        File Dispute
                    </button>
                </div>
                <p className="text-[10px] text-white/20 mt-2 flex items-center gap-1">
                    <Info size={9} />
                    You can find the Match ID in the bracket view or your matches page.
                </p>
            </motion.div>

            {/* Disputes List */}
            {loading ? (
                <div className="flex items-center justify-center py-20 gap-3 text-white/30">
                    <Loader2 size={22} className="animate-spin" />
                    <span className="font-heading">Loading disputes…</span>
                </div>
            ) : disputes.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl">
                    <Shield size={40} className="mx-auto text-white/10 mb-3" />
                    <h3 className="font-heading text-lg font-semibold text-white/40 mb-1">No Disputes Filed</h3>
                    <p className="text-white/20 text-sm">If you believe a match result is incorrect, use the form above.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {openDisputes.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">
                                Active ({openDisputes.length})
                            </p>
                            <div className="space-y-3">
                                {openDisputes.map((d, i) => <DisputeItem key={d.id} dispute={d} index={i} />)}
                            </div>
                        </div>
                    )}
                    {closedDisputes.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">
                                Closed ({closedDisputes.length})
                            </p>
                            <div className="space-y-3">
                                {closedDisputes.map((d, i) => <DisputeItem key={d.id} dispute={d} index={i} />)}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Raise Dispute Modal */}
            <AnimatePresence>
                {showModal && activeMatchId && (
                    <RaiseDisputeModal
                        matchId={activeMatchId}
                        onClose={() => { setShowModal(false); setActiveMatchId(null) }}
                        onRaised={fetchDisputes}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
