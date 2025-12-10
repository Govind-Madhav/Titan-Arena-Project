import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    Trophy,
    Users,
    Swords,
    Wallet,
    Bell,
    User,
    Menu,
    X,
    LogOut,
    LayoutDashboard
} from 'lucide-react'
import { useState } from 'react'
import useAuthStore from '../../store/authStore'

export default function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const { isAuthenticated, user, logout } = useAuthStore()
    const location = useLocation()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate('/')
    }

    const navLinks = [
        { name: 'Tournaments', path: '/tournaments', icon: Trophy },
        { name: 'Teams', path: '/teams', icon: Users },
        { name: 'Matches', path: '/matches', icon: Swords },
    ]

    const isActive = (path) => location.pathname === path

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-titan-bg/80 backdrop-blur-lg border-b border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-titan-purple to-titan-blue flex items-center justify-center shadow-neon-sm">
                            <span className="font-display font-black text-white text-lg">T</span>
                        </div>
                        <div className="hidden sm:block">
                            <span className="font-display font-bold text-xl tracking-wider text-white group-hover:text-aurora transition-colors">
                                TITAN
                            </span>
                            <span className="font-display font-bold text-xl tracking-wider text-titan-purple ml-1">
                                ARENA
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`relative px-4 py-2 rounded-lg font-heading font-semibold text-sm tracking-wide transition-all duration-200 flex items-center gap-2 ${isActive(link.path)
                                        ? 'text-white bg-titan-purple/20'
                                        : 'text-white/60 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <link.icon size={16} />
                                {link.name}
                                {isActive(link.path) && (
                                    <motion.div
                                        layoutId="navbar-indicator"
                                        className="absolute inset-0 rounded-lg bg-titan-purple/20 border border-titan-purple/30"
                                        style={{ zIndex: -1 }}
                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </Link>
                        ))}
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-3">
                        {isAuthenticated ? (
                            <>
                                {/* Notifications */}
                                <button className="relative p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all">
                                    <Bell size={20} />
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-titan-purple rounded-full" />
                                </button>

                                {/* Wallet */}
                                <Link
                                    to="/wallet"
                                    className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-titan-bg-light border border-white/10 hover:border-titan-purple/30 transition-all"
                                >
                                    <Wallet size={16} className="text-titan-purple" />
                                    <span className="font-heading font-semibold text-sm">₹0</span>
                                </Link>

                                {/* Dashboard */}
                                <Link
                                    to="/dashboard"
                                    className={`p-2 rounded-lg transition-all ${isActive('/dashboard')
                                            ? 'bg-titan-purple/20 text-white'
                                            : 'text-white/60 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <LayoutDashboard size={20} />
                                </Link>

                                {/* User Menu */}
                                <div className="relative group">
                                    <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-all">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-titan-purple to-titan-blue flex items-center justify-center">
                                            <User size={16} className="text-white" />
                                        </div>
                                        <span className="hidden sm:block font-heading font-semibold text-sm text-white">
                                            {user?.username || 'Player'}
                                        </span>
                                    </button>

                                    {/* Dropdown */}
                                    <div className="absolute right-0 top-full mt-2 w-48 py-2 bg-titan-bg-card border border-white/10 rounded-xl shadow-glass opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                        <Link
                                            to="/dashboard"
                                            className="flex items-center gap-3 px-4 py-2 text-white/70 hover:text-white hover:bg-white/5 transition-all"
                                        >
                                            <LayoutDashboard size={16} />
                                            Dashboard
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                                        >
                                            <LogOut size={16} />
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <Link to="/auth" className="btn-neon text-sm">
                                Sign In
                            </Link>
                        )}

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all"
                        >
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="md:hidden bg-titan-bg-card border-t border-white/5"
                >
                    <div className="px-4 py-4 space-y-2">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-heading font-semibold transition-all ${isActive(link.path)
                                        ? 'bg-titan-purple/20 text-white'
                                        : 'text-white/60 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <link.icon size={20} />
                                {link.name}
                            </Link>
                        ))}
                        {isAuthenticated && (
                            <Link
                                to="/wallet"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 rounded-lg font-heading font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-all"
                            >
                                <Wallet size={20} />
                                Wallet
                            </Link>
                        )}
                    </div>
                </motion.div>
            )}
        </nav>
    )
}
