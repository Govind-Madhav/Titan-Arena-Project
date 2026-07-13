/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    Trophy,
    Users,
    Zap,
    ChevronRight,
    Gamepad2,
    Crown,
    Target,
    Flame,
    Play
} from 'lucide-react'
import { useEffect, useState } from 'react'
import useAuthStore from '../store/authStore'
import Navbar from '../Components/layout/Navbar'
import TournamentCard from '../Components/tournament/TournamentCard'

import {
    TiltedCard,
    SpotlightCard,
    GlowBorder,
    GradientText
} from '../Components/effects/ReactBits'
import api from '../lib/api'

// Background - Premium Aurora CSS (no WebGL)
function HeroBackground() {
    return (
        <div className="fixed inset-0 overflow-hidden z-0 bg-titan-bg">
            {/* Aurora gradient layers */}
            <div className="absolute inset-0 opacity-70">
                {/* Top left glow */}
                <div
                    className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full animate-float"
                    style={{
                        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)'
                    }}
                />
                {/* Top right glow */}
                <div
                    className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full animate-float"
                    style={{
                        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
                        animationDelay: '2s',
                        animationDirection: 'reverse'
                    }}
                />
                {/* Center glow */}
                <div
                    className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full animate-aurora"
                    style={{
                        background: 'radial-gradient(ellipse, rgba(139, 92, 246, 0.25) 0%, transparent 60%)'
                    }}
                />
                {/* Bottom accent */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-[300px]"
                    style={{
                        background: 'linear-gradient(to top, rgba(139, 92, 246, 0.15), transparent)'
                    }}
                />
            </div>

            {/* Gradient overlay for blend */}
            <div className="absolute inset-0 bg-gradient-to-b from-titan-bg/30 via-transparent to-titan-bg" />
        </div>
    )
}


// Hero Section with Combined Background
function HeroSection() {
    const { user } = useAuthStore()

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden z-10">

            {/* Grid Pattern */}
            <div
                className="absolute inset-0 opacity-5"
                style={{
                    backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px',
                }}
            />

            {/* Content */}
            <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-titan-purple/20 border border-titan-purple/30 mb-8 backdrop-blur-sm"
                    >
                        <Zap size={14} className="text-titan-purple" />
                        <span className="text-sm font-heading font-semibold text-titan-purple">
                            Season 1 Now Live
                        </span>
                    </motion.div>

                    {/* Main Title with Gradient */}
                    <h1 className="font-display font-black text-5xl sm:text-7xl lg:text-8xl tracking-wider mb-6">
                        <span className="text-white drop-shadow-lg">TITAN</span>
                        <GradientText className="ml-4">ARENA</GradientText>
                    </h1>

                    {/* Subtitle */}
                    <p className="font-heading font-semibold text-xl sm:text-2xl text-white/70 tracking-widest mb-4 uppercase">
                        Premium League • Global Competition
                    </p>

                    <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10">
                        Compete in elite esports tournaments. Win real prizes.
                        Join the arena where champions are forged.
                    </p>

                    {/* CTAs - Conditional based on Auth */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/tournaments"
                            className="cursor-target btn-neon text-lg px-8 py-4 flex items-center gap-2"
                        >
                            <Trophy size={20} />
                            {user ? 'Browse Tournaments' : 'Join Tournament'}
                            <ChevronRight size={18} />
                        </Link>
                        {user ? (
                            <Link to="/profile" className="btn-glass text-lg px-8 py-4 backdrop-blur-sm">
                                Go to Dashboard
                            </Link>
                        ) : (
                            <Link to="/auth" className="btn-glass text-lg px-8 py-4 backdrop-blur-sm">
                                Create Account
                            </Link>
                        )}
                    </div>
                </motion.div>

                {/* Stats with TiltedCard */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="grid grid-cols-3 gap-6 mt-20 max-w-3xl mx-auto"
                >
                    {[
                        { label: 'Active Players', value: '10K+', icon: Users },
                        { label: 'Prize Pool', value: '₹50L+', icon: Crown },
                        { label: 'Tournaments', value: '500+', icon: Target },
                    ].map((stat, i) => (
                        <TiltedCard key={stat.label} maxTilt={8}>
                            <div className="glass-card p-6 text-center cursor-target backdrop-blur-md">
                                <stat.icon size={28} className="text-titan-purple mx-auto mb-3" />
                                <div className="font-display text-2xl sm:text-3xl font-bold text-white">
                                    {stat.value}
                                </div>
                                <div className="text-sm text-white/50 font-heading">{stat.label}</div>
                            </div>
                        </TiltedCard>
                    ))}
                </motion.div>
            </div>

            {/* Scroll Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2"
            >
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2 backdrop-blur-sm"
                >
                    <motion.div className="w-1.5 h-3 bg-titan-purple rounded-full" />
                </motion.div>
            </motion.div>
        </section>
    )
}

// Games Section with SpotlightCard
function GamesSection() {
    const [games, setGames] = useState([])

    useEffect(() => {
        api.get('/games')
            .then(res => setGames(res.data.data || []))
            .catch(err => console.error('Failed to fetch games', err))
    }, [])

    if (games.length === 0) return null

    return (
        <section className="py-20 px-4 relative overflow-hidden z-10">
            <div className="max-w-6xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl md:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-titan-purple via-white to-titan-blue mb-6">
                        Supported Games
                    </h2>
                    <p className="text-white/60 max-w-2xl mx-auto">
                        Compete in major esports titles. From battle royales to tactical shooters,
                        we support the most popular competitive games.
                    </p>
                </motion.div>

                <div className="flex flex-wrap justify-center gap-6">
                    {games.map((game, i) => (
                        <motion.div
                            key={game.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <SpotlightCard className="px-8 py-5 cursor-pointer cursor-target min-w-[200px] flex justify-center">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-titan-purple/20 to-titan-blue/20 border border-white/10">
                                        {game.logoUrl ? (
                                            <img
                                                src={game.logoUrl}
                                                alt={game.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'flex';
                                                }}
                                            />
                                        ) : null}
                                        <div style={{ display: game.logoUrl ? 'none' : 'flex' }} className="w-full h-full flex items-center justify-center text-titan-purple">
                                            <Gamepad2 size={32} />
                                        </div>
                                    </div>
                                    <span className="font-heading font-semibold text-lg">{game.name}</span>
                                </div>
                            </SpotlightCard>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

// Featured Tournaments
function FeaturedTournaments() {
    const [tournaments, setTournaments] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get('/tournaments?limit=3')
            .then(res => setTournaments(res.data.data || []))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const renderTournamentContent = () => {
        if (loading) {
            return (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="glass-card h-80 animate-pulse" />
                    ))}
                </div>
            )
        }

        if (tournaments.length === 0) {
            return (
                <div className="text-center py-16 glass-card rounded-2xl">
                    <Trophy size={48} className="text-white/20 mx-auto mb-4" />
                    <h3 className="font-heading text-xl font-semibold mb-2">No Tournaments Currently Open</h3>
                    <p className="text-white/40">Check back later for new epic showdowns.</p>
                </div>
            )
        }

        return (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tournaments.map((tournament, i) => (
                    <motion.div
                        key={tournament.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <TiltedCard maxTilt={5}>
                            <TournamentCard tournament={tournament} />
                        </TiltedCard>
                    </motion.div>
                ))}
            </div>
        )
    }

    return (
        <section className="py-20 px-4 relative z-10">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="flex items-center justify-between mb-12"
                >
                    <div>
                        <h2 className="font-display text-3xl sm:text-4xl font-bold mb-2">
                            Featured <GradientText>Tournaments</GradientText>
                        </h2>
                        <p className="text-white/40">Join the competition</p>
                    </div>
                    <Link to="/tournaments" className="btn-glass flex items-center gap-2 cursor-target">
                        View All
                        <ChevronRight size={18} />
                    </Link>
                </motion.div>

                {renderTournamentContent()}
            </div>
        </section>
    )
}

// Live Highlights Section
function HighlightsSection() {
    const highlights = [
        {
            title: "Mortal 1v3 Clutch | Titan Cup",
            game: "VALORANT",
            views: "14.5K views",
            mediaUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop"
        },
        {
            title: "JONATHAN's Squad Wipe | BGMI",
            game: "BGMI",
            views: "32.0K views",
            mediaUrl: "https://images.unsplash.com/photo-1553481187-be93c21490a9?q=80&w=600&auto=format&fit=crop"
        },
        {
            title: "CS2 Grand Finals Winning Moment",
            game: "COUNTER-STRIKE 2",
            views: "45.2K views",
            mediaUrl: "https://images.unsplash.com/photo-1560253023-3ec5d502959f?q=80&w=600&auto=format&fit=crop"
        }
    ];

    return (
        <section className="py-20 px-4 relative z-10 bg-black/10">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="mb-12"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Flame className="text-orange-500 animate-pulse" />
                        <h2 className="font-display text-3xl sm:text-4xl font-bold">
                            Live <GradientText>Highlights</GradientText>
                        </h2>
                    </div>
                    <p className="text-white/40">Epic moments from recent matches</p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {highlights.map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-black/40 h-56"
                        >
                            <img 
                                src={item.mediaUrl} 
                                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" 
                                alt={item.title} 
                            />
                            {/* Play Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors duration-300">
                                <div className="w-12 h-12 rounded-full bg-titan-purple/90 group-hover:bg-titan-purple flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-all duration-300 shadow-lg shadow-titan-purple/30">
                                    <Play size={20} fill="white" className="ml-1" />
                                </div>
                            </div>
                            {/* Content Info */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent p-5 flex flex-col justify-end">
                                <span className="text-titan-purple text-xs font-bold tracking-widest uppercase mb-1">{item.game}</span>
                                <h3 className="text-white font-bold text-base line-clamp-1 mb-1">{item.title}</h3>
                                <span className="text-white/40 text-xs">{item.views}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

// Hall of Fame / Featured Players
function HallOfFameSection() {
    return (
        <section className="py-20 px-4 relative z-10">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
                        Featured <GradientText>Champions</GradientText>
                    </h2>
                    <p className="text-white/60">Top performers and rising stars of the season</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Featured Team */}
                    <div className="col-span-1 md:col-span-2 relative h-[300px] md:h-auto group overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                        <img src="https://images.unsplash.com/photo-1560272564-c83b66b1ad12?q=80&w=1600&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" alt="Team Alpha" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-8 flex flex-col justify-end">
                            <span className="text-titan-purple font-bold tracking-widest text-sm mb-2">TEAM OF THE MONTH</span>
                            <h3 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">Team Soul</h3>
                            <p className="text-white/70 max-w-md">Dominating the BGMI circuit with 3 consecutive tournament wins and a 85% win rate.</p>
                        </div>
                    </div>

                    {/* Featured Player */}
                    <div className="col-span-1 relative h-[300px] md:h-[400px] group overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                        <img src="https://images.unsplash.com/photo-1566577739112-5180d4bf9390?q=80&w=800&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" alt="Player One" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent p-8 flex flex-col justify-end">
                            <span className="text-blue-400 font-bold tracking-widest text-sm mb-2">MVP SPOTLIGHT</span>
                            <h3 className="text-3xl font-display font-bold text-white mb-1">Mortal</h3>
                            <div className="flex items-center gap-4 text-sm text-white/60">
                                <span>KD: 4.2</span>
                                <span>•</span>
                                <span>Sniper</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

// CTA Section with GlowBorder
function CTASection() {
    return (
        <section className="py-20 px-4 relative z-10">
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                >
                    <GlowBorder className="text-center">
                        <div className="p-12">
                            <Crown size={48} className="text-titan-purple mx-auto mb-6" />
                            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
                                Ready to become a <GradientText>Champion</GradientText>?
                            </h2>
                            <p className="text-white/60 max-w-xl mx-auto mb-8">
                                Create your account, build your team, and compete in tournaments
                                with players from around the world.
                            </p>
                            <div className="pt-2">
                                <Link to="/auth" className="btn-neon text-lg px-10 py-4 cursor-target inline-block">
                                    Get Started Free
                                </Link>
                            </div>
                        </div>
                    </GlowBorder>
                </motion.div>
            </div>
        </section>
    )
}

// Footer
function Footer() {
    return (
        <footer className="py-12 px-4 border-t border-white/5 relative z-10 bg-titan-bg">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-titan-purple to-titan-blue flex items-center justify-center">
                            <span className="font-display font-black text-white text-lg">T</span>
                        </div>
                        <span className="font-display font-bold text-xl tracking-wider">
                            TITAN <span className="text-titan-purple">ARENA</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-6 text-white/40 text-sm">
                        <Link to="#" className="hover:text-white transition-colors">Terms</Link>
                        <Link to="#" className="hover:text-white transition-colors">Privacy</Link>
                        <Link to="#" className="hover:text-white transition-colors">Support</Link>
                    </div>

                    <p className="text-white/40 text-sm">
                        © 2024 TITAN ARENA. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    )
}

// Main Landing Page
export default function LandingPage() {
    return (
        <div className="min-h-screen bg-transparent">
            {/* Fixed Background */}
            <HeroBackground />

            <Navbar />
            <HeroSection />
            <GamesSection />
            <HighlightsSection />
            <FeaturedTournaments />
            <HallOfFameSection />
            <CTASection />
            <Footer />
        </div>
    )
}
