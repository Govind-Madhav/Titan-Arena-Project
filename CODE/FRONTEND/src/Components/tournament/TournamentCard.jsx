import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Trophy, Users, Calendar, Clock, ChevronRight } from 'lucide-react'
import Countdown from '../effects/Countdown'

export default function TournamentCard({ tournament }) {
    const {
        id,
        name,
        game,
        prizePool,
        entryFee,
        status,
        startTime,
        registrationStart,
        registrationEnd,
        type,
        _count,
    } = tournament

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount / 100)
    }

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const getStatusBadge = () => {
        switch (status) {
            case 'ONGOING':
                return <span className="badge-live">LIVE</span>
            case 'UPCOMING':
                return <span className="badge-open">OPEN</span>
            case 'COMPLETED':
                return <span className="badge-completed">ENDED</span>
            default:
                return <span className="badge-completed">{status}</span>
        }
    }

    const getGameColor = () => {
        const colors = {
            BGMI: 'from-yellow-500/20 to-orange-500/10',
            Valorant: 'from-red-500/20 to-pink-500/10',
            'Free Fire': 'from-orange-500/20 to-red-500/10',
            CS2: 'from-yellow-600/20 to-amber-500/10',
            'COD Mobile': 'from-green-500/20 to-teal-500/10',
        }
        return colors[game] || 'from-titan-purple/20 to-titan-blue/10'
    }

    // Countdown Logic
    const getCountdownTarget = () => {
        if (status !== 'UPCOMING' && status !== 'ONGOING') return null;

        const now = new Date().getTime();
        const start = startTime ? new Date(startTime).getTime() : null;
        const regStart = registrationStart ? new Date(registrationStart).getTime() : null;
        const regEnd = registrationEnd ? new Date(registrationEnd).getTime() : null;

        // 1. If Reg hasn't started
        if (regStart && now < regStart) {
            return { date: registrationStart, label: 'Registration Opens In' };
        }
        // 2. If Reg is open (between start and end)
        if (regEnd && now < regEnd) {
            return { date: registrationEnd, label: 'Registration Ends In' };
        }
        // 3. If Reg ended, waiting for tournament start
        if (start && now < start && (!regEnd || now > regEnd)) {
            return { date: startTime, label: 'Tournament Starts In' };
        }

        return null;
    };

    const target = getCountdownTarget();

    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ duration: 0.2 }}
        >
            <Link
                to={`/tournament/${id}`}
                className="block glass-card overflow-hidden group"
            >
                {/* Image/Banner Section */}
                <div className={`relative h-40 bg-gradient-to-br ${getGameColor()}`}>
                    {/* Game Overlay Pattern */}
                    <div
                        className="absolute inset-0 opacity-20"
                        style={{
                            backgroundImage: `radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.4) 0%, transparent 50%)`,
                        }}
                    />

                    {/* Status Badge */}
                    <div className="absolute top-4 left-4">
                        {getStatusBadge()}
                    </div>

                    {/* Game Name */}
                    <div className="absolute bottom-4 left-4">
                        <span className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white/80 text-sm font-heading font-semibold">
                            {game}
                        </span>
                    </div>

                    {/* Prize Pool Badge */}
                    <div className="absolute top-4 right-4 px-3 py-1 rounded-lg bg-titan-purple/80 backdrop-blur-sm">
                        <span className="text-white font-heading font-bold text-sm">
                            {formatCurrency(prizePool)}
                        </span>
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-titan-purple/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Content */}
                <div className="p-5">
                    <h3 className="font-heading font-bold text-lg text-white mb-3 group-hover:text-titan-purple-light transition-colors">
                        {name}
                    </h3>

                    <div className="space-y-3 mb-4">
                        {/* Countdown integration */}
                        {target ? (
                            <div className="bg-titan-bg-light/50 p-2 rounded-lg border border-white/5">
                                <Countdown targetDate={target.date} label={target.label} fontSize={14} />
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-white/60 text-sm py-1">
                                <Calendar size={14} className="text-titan-purple" />
                                <span>{formatDate(startTime)}</span>
                            </div>
                        )}

                        <div className="flex items-center justify-between text-white/60 text-sm">
                            <div className="flex items-center gap-2">
                                <Trophy size={14} className="text-titan-purple" />
                                <span>Entry: {formatCurrency(entryFee)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users size={14} className="text-titan-purple" />
                                <span>{type} • {_count?.registrations || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <span className="text-titan-purple font-heading font-semibold text-sm">
                            View Details
                        </span>
                        <ChevronRight
                            size={18}
                            className="text-titan-purple group-hover:translate-x-1 transition-transform"
                        />
                    </div>
                </div>

                {/* Bottom Neon Border on Hover */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-titan-purple to-titan-blue opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
        </motion.div>
    )
}

