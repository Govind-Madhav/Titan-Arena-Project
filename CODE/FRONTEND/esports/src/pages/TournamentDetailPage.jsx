import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    Trophy,
    Users,
    Calendar,
    Clock,
    Wallet,
    ChevronLeft,
    Share2,
    Medal,
    Swords
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'
import { SpotlightCard, GradientText, TiltedCard, GlowBorder } from '../components/effects/ReactBits'
import api from '../lib/api'

export default function TournamentDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { isAuthenticated } = useAuthStore()
    const [tournament, setTournament] = useState(null)
    const [loading, setLoading] = useState(true)
    const [registering, setRegistering] = useState(false)

    useEffect(() => {
        fetchTournament()
    }, [id])

    const fetchTournament = async () => {
        try {
            const res = await api.get(`/tournaments/${id}`)
            setTournament(res.data.data)
        } catch (error) {
            console.error('Failed to fetch tournament:', error)
            // Use mock data
            setTournament({
                id,
                name: 'BGMI Pro League Season 1',
                game: 'BGMI',
                description: 'The ultimate BGMI showdown! Compete against the best players and teams for glory and prizes. Registration is open for all skill levels.',
                prizePool: 100000,
                entryFee: 5000,
                status: 'UPCOMING',
                type: 'SQUAD',
                teamSize: 4,
                startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                registrationEnd: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                host: { username: 'TitanArena' },
                payouts: [
                    { position: 1, amount: 50000 },
                    { position: 2, amount: 30000 },
                    { position: 3, amount: 20000 },
                ],
                registrations: [],
                _count: { registrations: 48 },
            })
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async () => {
        if (!isAuthenticated) {
            navigate('/auth', { state: { from: location } })
            return
        }

        setRegistering(true)
        try {
            await api.post(`/tournaments/${id}/register`)
            toast.success('Registered successfully!')
            fetchTournament()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration failed')
        } finally {
            setRegistering(false)
        }
    }

    const formatCurrency = (paise) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format((paise || 0) / 100)
    }

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-titan-bg py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="glass-card h-96 animate-pulse" />
                </div>
            </div>
        )
    }

    if (!tournament) {
        return (
            <div className="min-h-screen bg-titan-bg py-8 px-4 flex items-center justify-center">
                <div className="text-center">
                    <Trophy size={48} className="text-white/20 mx-auto mb-4" />
                    <h2 className="font-heading text-xl font-semibold mb-2">Tournament not found</h2>
                    <button onClick={() => navigate('/tournaments')} className="btn-neon mt-4">
                        Browse Tournaments
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-titan-bg py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Back Button */}
                <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
                >
                    <ChevronLeft size={20} />
                    Back
                </motion.button>

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 ${tournament.status === 'ONGOING' ? 'badge-live' :
                                    tournament.status === 'UPCOMING' ? 'badge-open' :
                                        'badge-completed'
                                }`}>
                                {tournament.status}
                            </span>
                            <h1 className="font-display text-3xl sm:text-4xl font-bold">
                                {tournament.name}
                            </h1>
                            <p className="text-white/40 mt-2">
                                Hosted by <span className="text-titan-purple">{tournament.host?.username}</span>
                            </p>
                        </div>
                        <button className="p-3 glass-card hover:bg-white/10 transition-colors">
                            <Share2 size={20} />
                        </button>
                    </div>
                </motion.div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Info Cards */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
                        >
                            <SpotlightCard className="p-4 text-center">
                                <Trophy size={24} className="text-titan-purple mx-auto mb-2" />
                                <p className="font-display text-xl font-bold">{formatCurrency(tournament.prizePool)}</p>
                                <p className="text-xs text-white/40">Prize Pool</p>
                            </SpotlightCard>
                            <SpotlightCard className="p-4 text-center">
                                <Wallet size={24} className="text-titan-success mx-auto mb-2" />
                                <p className="font-display text-xl font-bold">{formatCurrency(tournament.entryFee)}</p>
                                <p className="text-xs text-white/40">Entry Fee</p>
                            </SpotlightCard>
                            <SpotlightCard className="p-4 text-center">
                                <Users size={24} className="text-titan-blue mx-auto mb-2" />
                                <p className="font-display text-xl font-bold">{tournament._count?.registrations || 0}</p>
                                <p className="text-xs text-white/40">Registered</p>
                            </SpotlightCard>
                            <SpotlightCard className="p-4 text-center">
                                <Swords size={24} className="text-titan-warning mx-auto mb-2" />
                                <p className="font-heading text-lg font-bold">{tournament.type}</p>
                                <p className="text-xs text-white/40">{tournament.teamSize ? `${tournament.teamSize} players` : 'Format'}</p>
                            </SpotlightCard>
                        </motion.div>

                        {/* Description */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <SpotlightCard className="p-6">
                                <h2 className="font-heading text-lg font-semibold mb-4">About</h2>
                                <p className="text-white/60 leading-relaxed">
                                    {tournament.description || 'No description provided.'}
                                </p>
                            </SpotlightCard>
                        </motion.div>

                        {/* Schedule */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <SpotlightCard className="p-6">
                                <h2 className="font-heading text-lg font-semibold mb-4">Schedule</h2>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-titan-purple/20 flex items-center justify-center">
                                            <Clock size={20} className="text-titan-purple" />
                                        </div>
                                        <div>
                                            <p className="font-heading font-semibold">Registration Ends</p>
                                            <p className="text-sm text-white/40">{formatDate(tournament.registrationEnd)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-titan-success/20 flex items-center justify-center">
                                            <Calendar size={20} className="text-titan-success" />
                                        </div>
                                        <div>
                                            <p className="font-heading font-semibold">Tournament Starts</p>
                                            <p className="text-sm text-white/40">{formatDate(tournament.startTime)}</p>
                                        </div>
                                    </div>
                                </div>
                            </SpotlightCard>
                        </motion.div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Register Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <GlowBorder className="p-6">
                                <h3 className="font-heading text-lg font-semibold mb-4">Join Tournament</h3>
                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between">
                                        <span className="text-white/60">Entry Fee</span>
                                        <span className="font-heading font-bold">{formatCurrency(tournament.entryFee)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/60">Format</span>
                                        <span className="font-heading font-bold">{tournament.type}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/60">Game</span>
                                        <span className="font-heading font-bold">{tournament.game}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleRegister}
                                    disabled={registering || tournament.status !== 'UPCOMING'}
                                    className="btn-neon w-full disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {registering ? 'Registering...' :
                                        tournament.status !== 'UPCOMING' ? 'Registration Closed' :
                                            'Register Now'}
                                </button>
                            </GlowBorder>
                        </motion.div>

                        {/* Prize Breakdown */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <SpotlightCard className="p-6">
                                <h3 className="font-heading text-lg font-semibold mb-4">Prize Breakdown</h3>
                                <div className="space-y-3">
                                    {(tournament.payouts || []).map((payout, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                            <div className="flex items-center gap-3">
                                                <Medal size={18} className={
                                                    payout.position === 1 ? 'text-yellow-400' :
                                                        payout.position === 2 ? 'text-gray-300' :
                                                            payout.position === 3 ? 'text-orange-400' :
                                                                'text-white/40'
                                                } />
                                                <span className="font-heading">#{payout.position}</span>
                                            </div>
                                            <span className="font-display font-bold">{formatCurrency(payout.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </SpotlightCard>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}
