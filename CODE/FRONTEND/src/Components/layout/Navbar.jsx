/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

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
    LayoutDashboard,
    Crown
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import useAuthStore from '../../store/authStore'

const NotificationDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const { getNotifications } = useAuthStore();
    const dropdownRef = useRef(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            if (isOpen) {
                const res = await getNotifications();
                if (res.success) setNotifications(res.data);
            }
        }
        fetchNotifications();
    }, [isOpen, getNotifications]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-titan-purple rounded-full animate-pulse" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-titan-bg-card border border-white/10 rounded-xl shadow-glass overflow-hidden z-20">
                    <div className="p-3 border-b border-white/10 flex justify-between items-center">
                        <h4 className="font-bold text-white text-sm">Notifications</h4>
                        <span className="text-xs text-titan-purple cursor-pointer hover:underline">Mark all read</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-4 text-center text-white/40 text-sm">No new notifications</div>
                        ) : (
                            notifications.map(n => (
                                <div key={n.id} className={`p-3 border-b border-white/5 hover:bg-white/5 transition-colors ${!n.isRead ? 'bg-white/[0.02]' : ''}`}>
                                    <p className="text-sm text-white font-medium mb-1">{n.title}</p>
                                    <p className="text-xs text-white/60">{n.message}</p>
                                    <span className="text-[10px] text-white/30 mt-2 block">{new Date(n.createdAt).toLocaleTimeString()}</span>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-2 border-t border-white/10 text-center">
                        <Link to="/profile" className="text-xs text-titan-purple hover:text-white transition-colors" onClick={() => setIsOpen(false)}>View all activity</Link>
                    </div>
                </div>
            )}
        </div>
    )
}

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
                                <NotificationDropdown />

                                {/* Wallet */}
                                <Link
                                    to="/wallet"
                                    className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-titan-bg-light border border-white/10 hover:border-titan-purple/30 transition-all"
                                >
                                    <Wallet size={16} className="text-titan-purple" />
                                    <span className="font-heading font-semibold text-sm">₹0</span>
                                </Link>

                                {/* Dashboard removed (merged into profile) */}

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

                                    <div className="absolute right-0 top-full mt-2 w-48 py-2 bg-titan-bg-card border border-white/10 rounded-xl shadow-glass opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                        {(user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') && (
                                            <Link
                                                to="/admin"
                                                className="flex items-center gap-3 px-4 py-2 text-white/70 hover:text-white hover:bg-white/5 transition-all"
                                            >
                                                <LayoutDashboard size={16} />
                                                Admin Dashboard
                                            </Link>
                                        )}

                                        {(user?.role === 'HOST' || user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') && (
                                            <Link
                                                to="/host"
                                                className="flex items-center gap-3 px-4 py-2 text-white/70 hover:text-white hover:bg-white/5 transition-all"
                                            >
                                                <Crown size={16} />
                                                Host Dashboard
                                            </Link>
                                        )}
                                        <Link
                                            to="/profile"
                                            className="flex items-center gap-3 px-4 py-2 text-white/70 hover:text-white hover:bg-white/5 transition-all"
                                        >
                                            <User size={16} />
                                            Profile
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
