/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Gamepad2, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'
import { Particles, GradientText } from '../Components/effects/ReactBits'
import TargetCursor from '../Components/effects/TargetCursor'

export default function AuthPage() {
    const [showCursor, setShowCursor] = useState(false)

    useEffect(() => {
        const isMobile = window.innerWidth < 768
        const hasTouch = 'ontouchstart' in window
        setShowCursor(!isMobile && !hasTouch)
    }, [])

    const [isLogin, setIsLogin] = useState(true)
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        username: ''
    })

    const { login, signup, isLoading } = useAuthStore()
    const navigate = useNavigate()
    const location = useLocation()
    const from = location.state?.from?.pathname || '/'

    // Clear form when switching between login/signup
    useEffect(() => {
        setFormData({
            email: '',
            password: '',
            username: ''
        })
    }, [isLogin])

    const handleSubmit = async (e) => {
        e.preventDefault()

        let result
        if (isLogin) {
            result = await login(formData.email, formData.password, rememberMe)
        } else {
            result = await signup(formData.email, formData.password, formData.username)
        }

        if (result.success) {
            toast.success(isLogin ? 'Welcome back!' : 'Account created!')
            navigate(from, { replace: true })
        } else {
            toast.error(result.message)
        }
    }

    return (
        <div className="min-h-screen bg-titan-bg flex items-center justify-center relative overflow-hidden">
            {/* GSAP Target Cursor */}
            {showCursor && (
                <TargetCursor
                    targetSelector=".cursor-target"
                    spinDuration={2}
                    hideDefaultCursor={true}
                    parallaxOn={true}
                />
            )}

            <Particles count={40} color="rgba(139, 92, 246, 1)" />

            {/* Background glow */}
            <div className="absolute inset-0 bg-neon-glow opacity-20" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-md p-8"
            >
                {/* Logo */}
                <Link to="/" className="flex items-center justify-center gap-3 mb-8 cursor-target">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-titan-purple to-titan-blue flex items-center justify-center shadow-neon">
                        <Gamepad2 className="text-white" size={24} />
                    </div>
                    <span className="font-display font-bold text-2xl tracking-wider">
                        TITAN <span className="text-titan-purple">ARENA</span>
                    </span>
                </Link>

                {/* Card */}
                <div className="glass-card p-8">
                    <h1 className="font-display text-2xl font-bold text-center mb-2">
                        {isLogin ? 'Welcome Back' : 'Join the Arena'}
                    </h1>
                    <p className="text-white/40 text-center mb-8">
                        {isLogin ? 'Sign in to continue' : 'Create your account'}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="relative">
                                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                                <input
                                    type="text"
                                    placeholder="Username"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="input-dark pl-12 cursor-target"
                                    autoComplete="off"
                                    required={!isLogin}
                                />
                            </div>
                        )}

                        <div className="relative">
                            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                            <input
                                type="email"
                                placeholder="Email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="input-dark pl-12 cursor-target"
                                autoComplete="off"
                                required
                            />
                        </div>

                        <div className="relative">
                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="input-dark pl-12 pr-12 cursor-target"
                                autoComplete="new-password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-target"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {isLogin && (
                            <div className="flex items-center justify-between text-sm">
                                <label className="flex items-center gap-2 cursor-pointer group cursor-target">
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${rememberMe
                                        ? 'bg-titan-purple border-titan-purple'
                                        : 'border-white/30 group-hover:border-white/50'
                                        }`}>
                                        {rememberMe && <Check size={12} className="text-white" />}
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="hidden"
                                    />
                                    <span className="text-white/60 group-hover:text-white/80 transition-colors">Remember me</span>
                                </label>
                                <button type="button" className="text-titan-purple hover:text-titan-purple-light transition-colors cursor-target">
                                    Forgot Password?
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-neon w-full flex items-center justify-center gap-2 cursor-target"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {isLogin ? 'Sign In' : 'Create Account'}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <span className="text-white/40">
                            {isLogin ? "Don't have an account? " : 'Already have an account? '}
                        </span>
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-titan-purple hover:text-titan-purple-light font-semibold"
                        >
                            {isLogin ? 'Sign Up' : 'Sign In'}
                        </button>
                    </div>
                </div>

                {/* Back to home */}
                <p className="text-center mt-6 text-white/40 text-sm">
                    <Link to="/" className="hover:text-white transition-colors">
                        ← Back to home
                    </Link>
                </p>
            </motion.div>
        </div>
    )
}
