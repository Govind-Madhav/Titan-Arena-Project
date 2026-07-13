/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 *
 * HostManageStream — Host-side panel to set stream URL, VOD URL, and spectator
 * code for each match in a tournament. Accessible from the host dashboard.
 * Route: /host/tournaments/:tournamentId/streams
 */

/* eslint-disable react/prop-types, sonarjs/no-nested-ternary, no-irregular-whitespace */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    Tv2, Link as LinkIcon, KeyRound, Save, Loader2,
    ChevronLeft, Check, Trophy, Film, Radio, Info
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { GradientText } from '../../Components/effects/ReactBits'

const STATUS_COLOR = {
    SCHEDULED: 'text-white/30 bg-white/5',
    PENDING: 'text-white/30 bg-white/5',
    ONGOING: 'text-emerald-400 bg-emerald-400/10',
    IN_PROGRESS: 'text-emerald-400 bg-emerald-400/10',
    LIVE: 'text-red-400 bg-red-400/10',
    COMPLETED: 'text-white/20 bg-white/5',
    BYE: 'text-white/20 bg-white/5',
}

// ─── Match Row ─────────────────────────────────────────────────────────────────
function MatchRow({ match, index }) {
    const [form, setForm] = useState({
        streamUrl: match.streamUrl || '',
        vodUrl: match.vodUrl || '',
        spectatorCode: match.spectatorCode || '',
        isLive: ['LIVE', 'IN_PROGRESS', 'ONGOING'].includes(match.status),
    })
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    let saveButtonClass = 'opacity-30 cursor-not-allowed bg-white/5 border border-white/10 text-white/30'
    if (saved) {
        saveButtonClass = 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
    } else if (form.streamUrl !== (match.streamUrl || '') ||
        form.vodUrl !== (match.vodUrl || '') ||
        form.spectatorCode !== (match.spectatorCode || '') ||
        form.isLive !== ['LIVE', 'IN_PROGRESS', 'ONGOING'].includes(match.status)) {
        saveButtonClass = 'btn-neon'
    }

    let saveLabel = <><Save size={12} />Save</>
    if (saved) {
        saveLabel = <><Check size={12} />Saved</>
    }
    if (saving) {
        saveLabel = <><Loader2 size={12} className="animate-spin" />Saving…</>
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await api.patch(`/matches/${match.id}/stream`, form)
            setSaved(true)
            toast.success(`Match ${match.matchNumber} stream updated`)
            setTimeout(() => setSaved(false), 2500)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    const isDirty = form.streamUrl !== (match.streamUrl || '') ||
        form.vodUrl !== (match.vodUrl || '') ||
        form.spectatorCode !== (match.spectatorCode || '') ||
        form.isLive !== ['LIVE', 'IN_PROGRESS', 'ONGOING'].includes(match.status)

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="bg-titan-bg-card border border-white/5 hover:border-white/10 rounded-2xl p-5 transition-all"
        >
            {/* Match header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <p className="font-heading font-bold text-white text-sm">
                        Round {match.round} · Match #{match.matchNumber}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                        {match.bracketSection && match.bracketSection !== 'WINNERS' && (
                            <span className="text-[10px] text-titan-purple bg-titan-purple/10 px-1.5 py-0.5 rounded uppercase font-semibold">
                                {match.bracketSection.replace('_', ' ')}
                            </span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${STATUS_COLOR[match.status] || STATUS_COLOR.SCHEDULED}`}>
                            {match.status}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {match.streamUrl && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                            <Radio size={9} className="animate-pulse" />
                            Stream Set
                        </div>
                    )}
                </div>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Tv2 size={10} />Live Stream URL
                    </label>
                    <input
                        value={form.streamUrl}
                        onChange={e => setForm(f => ({ ...f, streamUrl: e.target.value }))}
                        placeholder="https://twitch.tv/... or youtube.com/..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-titan-purple focus:outline-none placeholder-white/20"
                    />
                </div>
                <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Film size={10} />VOD / Replay URL
                    </label>
                    <input
                        value={form.vodUrl}
                        onChange={e => setForm(f => ({ ...f, vodUrl: e.target.value }))}
                        placeholder="Post-match VOD link"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-titan-purple focus:outline-none placeholder-white/20"
                    />
                </div>
                <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <KeyRound size={10} />Spectator Code
                    </label>
                    <input
                        value={form.spectatorCode}
                        onChange={e => setForm(f => ({ ...f, spectatorCode: e.target.value }))}
                        placeholder="In-game observer password"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-titan-purple focus:outline-none placeholder-white/20"
                    />
                </div>
            </div>

            <div className="mt-3">
                <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, isLive: !f.isLive }))}
                    className="inline-flex items-center gap-2 text-xs text-white/70 cursor-pointer"
                >
                    {form.isLive ? '✓' : '□'}
                    Mark stream as live now
                </button>
            </div>

            {/* Save */}
            <div className="flex justify-end mt-3">
                <button
                    onClick={handleSave}
                    disabled={saving || !isDirty}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all
                        ${saveButtonClass}`}
                >
                    {saveLabel}
                </button>
            </div>
        </motion.div>
    )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function HostManageStream() {
    const { tournamentId } = useParams()
    const navigate = useNavigate()
    const [matches, setMatches] = useState([])
    const [tournament, setTournament] = useState(null)
    const [tournamentStreamForm, setTournamentStreamForm] = useState({
        streamUrl: '',
        streamIsLive: false,
        streamScope: 'TOURNAMENT',
    })
    const [savingTournamentStream, setSavingTournamentStream] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [tournamentId])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [matchRes, tournRes] = await Promise.all([
                api.get(`/matches/tournament/${tournamentId}`),
                api.get(`/tournaments/${tournamentId}`),
            ])
            setMatches(matchRes.data.data || [])
            const tournamentData = tournRes.data.data || tournRes.data
            setTournament(tournamentData)
            setTournamentStreamForm({
                streamUrl: tournamentData?.streamUrl || '',
                streamIsLive: Boolean(tournamentData?.streamIsLive),
                streamScope: tournamentData?.streamScope || 'TOURNAMENT',
            })
        } catch (err) {
            console.error('Failed to load tournament matches:', err);
            toast.error('Failed to load tournament matches')
        } finally {
            setLoading(false)
        }
    }

    const saveTournamentStream = async () => {
        setSavingTournamentStream(true)
        try {
            const response = await api.patch(`/tournaments/${tournamentId}/stream`, tournamentStreamForm)
            const updated = response.data?.data
            if (updated) {
                setTournament(updated)
                setTournamentStreamForm({
                    streamUrl: updated.streamUrl || '',
                    streamIsLive: Boolean(updated.streamIsLive),
                    streamScope: updated.streamScope || 'TOURNAMENT',
                })
            }
            toast.success('Tournament stream updated')
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save tournament stream')
        } finally {
            setSavingTournamentStream(false)
        }
    }

    // Group by round
    const rounds = matches.reduce((acc, m) => {
        const r = m.round ?? 1
        if (!acc[r]) acc[r] = []
        acc[r].push(m)
        return acc
    }, {})

    return (
        <div className="min-h-screen bg-titan-bg px-4 pt-8 pb-16 max-w-5xl mx-auto">
            <button onClick={() => navigate('/host')}
                className="flex items-center gap-1 text-white/30 hover:text-white text-sm mb-6 transition-colors">
                <ChevronLeft size={16} />
                Host Dashboard
            </button>

            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                <h1 className="font-display text-3xl font-bold mb-1">
                    <GradientText>Stream Management</GradientText>
                </h1>
                <p className="text-white/40 text-sm">
                    {tournament?.name || `Tournament #${tournamentId}`} · Set live stream URLs and spectator codes per match.
                </p>
            </motion.div>

            {/* Info Banner */}
            <div className="flex items-center gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 mb-6 text-sm text-blue-300/70">
                <Info size={16} className="flex-shrink-0 text-blue-400" />
                <p>
                    Stream URLs support <strong className="text-blue-300">Twitch</strong> and <strong className="text-blue-300">YouTube</strong> — they will be embedded directly on the Live page.
                    Spectator codes are hidden from viewers until they reveal them.
                </p>
            </div>

            <div className="bg-titan-bg-card border border-white/5 rounded-2xl p-5 mb-6">
                <h2 className="font-heading text-sm font-bold text-white/50 uppercase tracking-widest mb-3">
                    Tournament-wide stream
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Tv2 size={10} />Global stream URL
                        </label>
                        <input
                            value={tournamentStreamForm.streamUrl}
                            onChange={(e) => setTournamentStreamForm((prev) => ({ ...prev, streamUrl: e.target.value }))}
                            placeholder="https://twitch.tv/... or youtube.com/..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-titan-purple focus:outline-none placeholder-white/20"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <LinkIcon size={10} />Scope
                        </label>
                        <select
                            value={tournamentStreamForm.streamScope}
                            onChange={(e) => setTournamentStreamForm((prev) => ({ ...prev, streamScope: e.target.value }))}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-titan-purple focus:outline-none"
                        >
                            <option value="TOURNAMENT">TOURNAMENT</option>
                            <option value="MATCH">MATCH</option>
                        </select>
                    </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                    <button
                        type="button"
                        onClick={() => setTournamentStreamForm((prev) => ({ ...prev, streamIsLive: !prev.streamIsLive }))}
                        className="inline-flex items-center gap-2 text-xs text-white/70 cursor-pointer"
                    >
                        {tournamentStreamForm.streamIsLive ? '✓' : '□'}
                        Mark tournament stream as live
                    </button>
                    <button
                        onClick={saveTournamentStream}
                        disabled={savingTournamentStream}
                        className="btn-neon px-4 py-2 text-xs"
                    >
                        {savingTournamentStream ? 'Saving…' : 'Save Tournament Stream'}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 gap-3 text-white/30">
                    <Loader2 size={22} className="animate-spin" />
                    <span className="font-heading">Loading matches…</span>
                </div>
            ) : (
                <>
                    {matches.length === 0 ? (
                        <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl">
                            <Trophy size={40} className="mx-auto text-white/10 mb-3" />
                            <p className="text-white/30">No matches found. Generate the bracket first.</p>
                        </div>
                    ) : (
                Object.entries(rounds)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([round, roundMatches]) => (
                        <div key={round} className="mb-8">
                            <h2 className="font-heading text-sm font-bold text-white/40 uppercase tracking-widest mb-3">
                                Round {round}
                            </h2>
                            <div className="space-y-3">
                                {roundMatches
                                    .filter(m => !m.isBye)
                                    .map((match, i) => (
                                        <MatchRow key={match.id} match={match} index={i} />
                                    ))}
                            </div>
                        </div>
                    ))
                    )}
                </>
            )}
        </div>
    )
}
