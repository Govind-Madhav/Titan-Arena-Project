/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 *
 * AchievementsPage — Full player achievement showcase.
 * Route: /achievements (protected)
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Trophy, Zap, Swords, Star, Shield, Flame,
    Target, Medal, Lock, Award, TrendingUp, Loader2
} from 'lucide-react'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import { GradientText } from '../../Components/effects/ReactBits'

// ─── Achievement Catalogue (mirrors backend ACHIEVEMENT_DEFS) ──────────────────
const ALL_ACHIEVEMENTS = [
    {
        id: 'FIRST_BLOOD',
        name: 'First Blood',
        description: 'Win your very first match.',
        tier: 'BRONZE',
        points: 10,
        icon: Swords,
        color: 'from-amber-700 to-amber-500',
        glow: 'shadow-amber-700/40',
    },
    {
        id: 'HAT_TRICK',
        name: 'Hat Trick',
        description: 'Win 3 matches in a row.',
        tier: 'SILVER',
        points: 25,
        icon: Target,
        color: 'from-slate-400 to-slate-300',
        glow: 'shadow-slate-400/40',
    },
    {
        id: 'ON_FIRE',
        name: 'On Fire',
        description: 'Win 5 matches in a row.',
        tier: 'GOLD',
        points: 50,
        icon: Flame,
        color: 'from-orange-500 to-yellow-400',
        glow: 'shadow-orange-500/40',
    },
    {
        id: 'CHAMPION',
        name: 'Champion',
        description: 'Win a tournament.',
        tier: 'GOLD',
        points: 100,
        icon: Trophy,
        color: 'from-yellow-500 to-amber-400',
        glow: 'shadow-yellow-400/50',
    },
    {
        id: 'PODIUM',
        name: 'Podium Finish',
        description: 'Finish in the top 3 of a tournament.',
        tier: 'SILVER',
        points: 40,
        icon: Medal,
        color: 'from-slate-400 to-slate-300',
        glow: 'shadow-slate-400/40',
    },
    {
        id: 'VETERAN',
        name: 'Veteran',
        description: 'Play 50 matches.',
        tier: 'SILVER',
        points: 30,
        icon: Shield,
        color: 'from-blue-500 to-blue-400',
        glow: 'shadow-blue-500/40',
    },
    {
        id: 'UNTOUCHABLE',
        name: 'Untouchable',
        description: 'Win a tournament without a single loss.',
        tier: 'LEGENDARY',
        points: 200,
        icon: Star,
        color: 'from-purple-500 via-titan-pink to-violet-400',
        glow: 'shadow-purple-500/60',
    },
    {
        id: 'GIANT_SLAYER',
        name: 'Giant Slayer',
        description: 'Beat an opponent rated 200+ higher than you.',
        tier: 'GOLD',
        points: 75,
        icon: Zap,
        color: 'from-emerald-500 to-teal-400',
        glow: 'shadow-emerald-500/40',
    },
]

// ─── Tier config ───────────────────────────────────────────────────────────────
const TIER_CONFIG = {
    BRONZE: { label: 'Bronze', classes: 'text-amber-700 bg-amber-700/10 border-amber-700/30' },
    SILVER: { label: 'Silver', classes: 'text-slate-300 bg-slate-400/10 border-slate-400/30' },
    GOLD: { label: 'Gold', classes: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
    LEGENDARY: { label: 'Legendary', classes: 'text-purple-300 bg-purple-500/10 border-purple-500/40' },
}

// ─── XP Progress Bar ──────────────────────────────────────────────────────────
function XpBar({ earned, total }) {
    const pct = total === 0 ? 0 : Math.round((earned / total) * 100)
    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-white/40">{earned} / {total} XP earned</span>
                <span className="text-xs font-bold text-titan-purple">{pct}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-titan-purple to-titan-pink"
                />
            </div>
        </div>
    )
}

// ─── Achievement Card ─────────────────────────────────────────────────────────
function AchievementCard({ def, unlocked, unlockedAt, delay = 0 }) {
    const Icon = def.icon
    const tier = TIER_CONFIG[def.tier] || TIER_CONFIG.BRONZE

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, duration: 0.3, type: 'spring' }}
            className={`relative rounded-2xl border p-5 flex flex-col gap-3 transition-all duration-300
                ${unlocked
                    ? 'bg-titan-bg-card border-white/10 hover:border-white/20 shadow-lg ' + def.glow
                    : 'bg-black/20 border-white/5 opacity-55 saturate-0'
                }`}
        >
            {/* Glow effect for unlocked */}
            {unlocked && (
                <div className={`absolute inset-0 rounded-2xl opacity-[0.06] bg-gradient-to-br ${def.color} pointer-events-none`} />
            )}

            {/* Icon */}
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 relative bg-gradient-to-br ${unlocked ? def.color : 'from-white/5 to-white/5'}`}>
                {unlocked
                    ? <Icon size={26} className="text-white drop-shadow" />
                    : <Lock size={22} className="text-white/20" />
                }
            </div>

            {/* Info */}
            <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                    <h3 className={`font-heading font-bold text-base leading-tight ${unlocked ? 'text-white' : 'text-white/30'}`}>
                        {def.name}
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider flex-shrink-0 ${tier.classes}`}>
                        {tier.label}
                    </span>
                </div>
                <p className={`text-xs mt-1 leading-relaxed ${unlocked ? 'text-white/50' : 'text-white/20'}`}>
                    {def.description}
                </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex items-center gap-1">
                    <Star size={11} className={unlocked ? 'text-yellow-400' : 'text-white/20'} />
                    <span className={`text-xs font-bold ${unlocked ? 'text-yellow-400' : 'text-white/20'}`}>
                        {def.points} XP
                    </span>
                </div>
                {unlocked && unlockedAt ? (
                    <span className="text-[10px] text-white/30">
                        {new Date(unlockedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </span>
                ) : !unlocked ? (
                    <span className="text-[10px] text-white/20 italic">Locked</span>
                ) : null}
            </div>
        </motion.div>
    )
}

// ─── Animated Unlock Popup ────────────────────────────────────────────────────
function UnlockPopup({ achievement, onDismiss }) {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 4000)
        return () => clearTimeout(timer)
    }, [onDismiss])

    if (!achievement) return null
    const Icon = achievement.icon || Trophy
    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-4 rounded-2xl border border-yellow-400/30 bg-titan-bg-card/90 backdrop-blur-lg shadow-2xl shadow-yellow-400/10 cursor-pointer"
                onClick={onDismiss}
            >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${achievement.color || 'from-titan-purple to-titan-pink'}`}>
                    <Icon size={20} className="text-white" />
                </div>
                <div>
                    <p className="text-xs text-yellow-400 font-semibold tracking-widest uppercase mb-0.5">Achievement Unlocked!</p>
                    <p className="font-heading font-bold text-white text-sm">{achievement.name}</p>
                </div>
                <Star size={18} className="text-yellow-400 ml-2" />
            </motion.div>
        </AnimatePresence>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TIER_ORDER = { LEGENDARY: 0, GOLD: 1, SILVER: 2, BRONZE: 3 }

export default function AchievementsPage() {
    const { user } = useAuthStore()
    const navigate = useNavigate()

    const [unlocked, setUnlocked] = useState([]) // array from API
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('ALL') // ALL | UNLOCKED | LOCKED
    const [popup, setPopup] = useState(null)

    useEffect(() => { fetchAchievements() }, [])

    const fetchAchievements = async () => {
        setLoading(true)
        try {
            const res = await api.get('/users/me/achievements')
            setUnlocked(res.data.data || [])
        } catch {
            //
        } finally {
            setLoading(false)
        }
    }

    // Build a map of achievementId → unlockedAt for quick lookup
    const unlockedMap = Object.fromEntries(unlocked.map(u => [u.achievementId, u.unlockedAt]))

    const totalXP = ALL_ACHIEVEMENTS.reduce((s, a) => s + a.points, 0)
    const earnedXP = ALL_ACHIEVEMENTS
        .filter(a => unlockedMap[a.id])
        .reduce((s, a) => s + a.points, 0)
    const unlockedCount = Object.keys(unlockedMap).length

    // Apply filter
    const filtered = ALL_ACHIEVEMENTS
        .filter(a => {
            if (filter === 'UNLOCKED') return !!unlockedMap[a.id]
            if (filter === 'LOCKED') return !unlockedMap[a.id]
            return true
        })
        .sort((a, b) => {
            // Unlocked first within each tier
            const aU = !!unlockedMap[a.id], bU = !!unlockedMap[b.id]
            if (aU !== bU) return aU ? -1 : 1
            return (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9)
        })

    return (
        <div className="min-h-screen bg-titan-bg px-4 pt-8 pb-16 max-w-5xl mx-auto">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">
                    <GradientText>Achievements</GradientText>
                </h1>
                <p className="text-white/40 text-sm">Your journey, your glory. Earn XP by winning matches and tournaments.</p>
            </motion.div>

            {/* Stats Panel */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
            >
                {[
                    { icon: Award, label: 'Earned', value: unlockedCount, sub: `/ ${ALL_ACHIEVEMENTS.length} total`, color: 'text-titan-purple' },
                    { icon: Star, label: 'Total XP', value: earnedXP, sub: `/ ${totalXP} XP`, color: 'text-yellow-400' },
                    { icon: TrendingUp, label: 'Completion', value: ALL_ACHIEVEMENTS.length === 0 ? '0%' : `${Math.round(unlockedCount / ALL_ACHIEVEMENTS.length * 100)}%`, sub: 'of all badges', color: 'text-emerald-400' },
                ].map(({ icon: Icon, label, value, sub, color }) => (
                    <div key={label} className="bg-titan-bg-card border border-white/10 rounded-2xl px-5 py-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                            <Icon size={20} className={color} />
                        </div>
                        <div>
                            <p className="text-xs text-white/40">{label}</p>
                            <p className={`font-heading font-black text-xl ${color}`}>{value}</p>
                            <p className="text-[10px] text-white/20">{sub}</p>
                        </div>
                    </div>
                ))}
            </motion.div>

            {/* XP Progress */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-titan-bg-card border border-white/10 rounded-2xl px-5 py-4 mb-6"
            >
                <p className="text-xs text-white/40 font-semibold mb-3 uppercase tracking-widest">XP Progress</p>
                <XpBar earned={earnedXP} total={totalXP} />
            </motion.div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-5">
                {[
                    { value: 'ALL', label: `All (${ALL_ACHIEVEMENTS.length})` },
                    { value: 'UNLOCKED', label: `Unlocked (${unlockedCount})` },
                    { value: 'LOCKED', label: `Locked (${ALL_ACHIEVEMENTS.length - unlockedCount})` },
                ].map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setFilter(tab.value)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
                            ${filter === tab.value
                                ? 'bg-titan-purple/20 text-white border border-titan-purple/40'
                                : 'text-white/40 hover:text-white border border-white/5 hover:border-white/10'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Achievement Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20 gap-3 text-white/30">
                    <Loader2 size={24} className="animate-spin" />
                    <span className="font-heading">Loading achievements…</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map((def, i) => (
                        <AchievementCard
                            key={def.id}
                            def={def}
                            unlocked={!!unlockedMap[def.id]}
                            unlockedAt={unlockedMap[def.id]}
                            delay={i * 0.04}
                        />
                    ))}
                </div>
            )}

            {/* Streak encouragement */}
            {!loading && unlockedCount === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-8 p-6 rounded-2xl border border-dashed border-titan-purple/20 bg-titan-purple/5 text-center"
                >
                    <Trophy size={40} className="mx-auto text-titan-purple/40 mb-3" />
                    <h3 className="font-heading font-bold text-white mb-1">No Achievements Yet</h3>
                    <p className="text-white/30 text-sm mb-4">Win your first match to earn <span className="text-amber-500 font-semibold">First Blood</span>!</p>
                    <button onClick={() => navigate('/tournaments')} className="btn-neon px-6 py-2 text-sm">
                        Find a Tournament
                    </button>
                </motion.div>
            )}

            {/* Popup */}
            {popup && <UnlockPopup achievement={popup} onDismiss={() => setPopup(null)} />}
        </div>
    )
}
