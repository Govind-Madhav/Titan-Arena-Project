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
    const { forgotPassword, isLoading } = useAuthStore()

    // Status: 'idle' | 'success'
    const [status, setStatus] = useState('idle')
    const [email, setEmail] = useState('')

    const handleRequestReset = async (e) => {
        e.preventDefault()
        if (!email) {
            toast.error('Please enter your email address')
            return
        }

        const result = await forgotPassword(email)
        if (result.success) {
            setStatus('success')
            toast.success('Reset link dispatched to your inbox!')
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
                                {status === 'success' ? <CheckCircle size={32} className="text-titan-cyan" /> : <Key size={32} />}
                            </div>
                            <h2 className="font-display text-3xl font-bold mb-2">
                                {status === 'success' ? 'Link Dispatched' : 'Reset Password'}
                            </h2>
                            <p className="text-white/40 font-mono text-sm leading-relaxed px-4">
                                {status === 'success'
                                    ? `A secure reset protocol has been sent to ${email}. Check your comms.`
                                    : 'Enter your verified email to receive a secure reset link.'}
                            </p>
                        </div>

                        <AnimatePresence mode="wait">
                            {status === 'idle' ? (
                                <motion.form
                                    key="request"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-4"
                                    onSubmit={handleRequestReset}
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
                                            <>SEND RESET LINK <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                                        }
                                    </button>
                                </motion.form>
                            ) : (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center space-y-6"
                                >
                                    <div className="p-4 bg-titan-cyan/5 border border-titan-cyan/20 rounded-lg text-titan-cyan text-sm font-mono">
                                        The reset link will expire in 1 hour.
                                    </div>
                                    <button
                                        onClick={() => navigate('/auth')}
                                        className="btn-neon w-full h-12 flex items-center justify-center gap-2"
                                    >
                                        RETURN TO LOGIN <ArrowLeft size={18} />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="mt-8 pt-6 border-t border-white/5 text-center">
                            <Link to="/auth" className="text-white/40 hover:text-white text-sm transition-colors flex items-center justify-center gap-2 group">
                                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Authenticator
                            </Link>
                        </div>

                    </div>
                </motion.div>
            </div>
        </div>
    )
}
