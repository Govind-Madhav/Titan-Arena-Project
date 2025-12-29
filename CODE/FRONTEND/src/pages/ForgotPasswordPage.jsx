/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, ArrowRight, ArrowLeft, Key, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'
import Navbar from '../Components/layout/Navbar'

export default function ForgotPasswordPage() {
    const navigate = useNavigate()
    const { forgotPassword, resetPassword, isLoading } = useAuthStore()

    // Steps: 1 = Email, 2 = OTP & New Password
    const [step, setStep] = useState(1)

    // Form Data
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    // Cooldown for resend
    const [cooldown, setCooldown] = useState(0)

    useEffect(() => {
        let timer
        if (cooldown > 0) {
            timer = setInterval(() => setCooldown(c => c - 1), 1000)
        }
        return () => clearInterval(timer)
    }, [cooldown])

    const handleRequestOtp = async (e) => {
        e.preventDefault()
        if (!email) {
            toast.error('Please enter your email address')
            return
        }

        const result = await forgotPassword(email)
        if (result.success) {
            // Success (or fake success for enumeration protection)
            // But if it's rate limited, we get 429 message.
            toast.success('If account exists, code sent!')
            setStep(2)
            setCooldown(60) // 60s cooldown
        } else {
            toast.error(result.message)
        }
    }

    const handleResetPassword = async (e) => {
        e.preventDefault()
        if (!otp || !newPassword) {
            toast.error('Please fill in all fields')
            return
        }
        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters')
            return
        }
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        const result = await resetPassword(email, otp, newPassword)
        if (result.success) {
            toast.success('Password reset successfully!')
            navigate('/auth')
        } else {
            toast.error(result.message)
        }
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white overflow-hidden flex flex-col relative">
            <Navbar />

            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-titan-purple/10 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-titan-cyan/10 blur-[150px] rounded-full" />
            </div>

            <div className="flex-1 flex items-center justify-center p-4 z-10 pt-20">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md relative"
                >
                    <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-8">

                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-titan-purple/20 mb-4 border border-titan-purple/30 text-titan-purple shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                                <Key size={32} />
                            </div>
                            <h2 className="font-display text-3xl font-bold mb-2">Reset Password</h2>
                            <p className="text-white/40 font-mono text-sm">
                                {step === 1 ? 'Enter email to receive protocol key.' : 'Enter key & secure credentials.'}
                            </p>
                        </div>

                        <AnimatePresence mode="wait">
                            {step === 1 ? (
                                <motion.form
                                    key="step1"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                    onSubmit={handleRequestOtp}
                                >
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-titan-cyan transition-colors" size={18} />
                                        <input
                                            type="email"
                                            placeholder="Email Address"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-12 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-titan-purple/50 focus:bg-white/10 transition-all font-mono text-sm"
                                            required
                                            autoFocus
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading || !email}
                                        className="btn-neon w-full h-12 flex items-center justify-center gap-2 group"
                                    >
                                        {isLoading ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> :
                                            <>SEND CODE <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                                        }
                                    </button>
                                </motion.form>
                            ) : (
                                <motion.form
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-4"
                                    onSubmit={handleResetPassword}
                                >
                                    <div className="relative group">
                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-titan-purple to-titan-cyan rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                                        <input
                                            type="text"
                                            placeholder="XXXXXX"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            className="relative w-full bg-black/80 border border-white/10 text-center text-2xl tracking-[0.5em] font-mono py-3 rounded-lg text-titan-cyan focus:outline-none focus:border-titan-cyan/50 focus:text-white transition-all placeholder-white/10"
                                            autoComplete="off"
                                            required
                                            maxLength={6}
                                            autoFocus
                                        />
                                    </div>

                                    <div className="space-y-3 mt-4">
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-titan-cyan transition-colors" size={18} />
                                            <input
                                                type="password"
                                                placeholder="New Password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-12 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-titan-purple/50 focus:bg-white/10 transition-all font-mono text-sm"
                                                required
                                            />
                                        </div>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-titan-cyan transition-colors" size={18} />
                                            <input
                                                type="password"
                                                placeholder="Confirm Password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-12 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-titan-purple/50 focus:bg-white/10 transition-all font-mono text-sm"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="btn-neon w-full h-12 flex items-center justify-center gap-2 mt-4"
                                    >
                                        {isLoading ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> :
                                            <>RESET PASSWORD <CheckCircle size={18} /></>
                                        }
                                    </button>

                                    <div className="flex items-center justify-between mt-4">
                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="text-xs text-white/40 hover:text-white flex items-center gap-1 transition-colors"
                                        >
                                            <ArrowLeft size={12} /> BACK
                                        </button>

                                        {cooldown > 0 ? (
                                            <span className="text-xs text-white/30 font-mono">Resend in {cooldown}s</span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleRequestOtp}
                                                className="text-xs text-titan-purple hover:text-white transition-colors"
                                            >
                                                Resend Code
                                            </button>
                                        )}
                                    </div>
                                </motion.form>
                            )}
                        </AnimatePresence>

                        <div className="mt-8 pt-6 border-t border-white/5 text-center">
                            <Link to="/auth" className="text-white/40 hover:text-white text-sm transition-colors">
                                Return to Authenticator
                            </Link>
                        </div>

                    </div>
                </motion.div>
            </div>
        </div>
    )
}
