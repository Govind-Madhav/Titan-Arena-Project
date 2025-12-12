/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../../store/authStore'

const SessionWarning = () => {
    const [showWarning, setShowWarning] = useState(false)
    const [timeLeft, setTimeLeft] = useState(0)
    const { tokenExpiresAt, refreshAuth, sessionWarningShown } = useAuthStore()

    useEffect(() => {
        if (!tokenExpiresAt || sessionWarningShown) return

        const checkExpiry = () => {
            const expiresAt = new Date(tokenExpiresAt).getTime()
            const now = Date.now()
            const timeUntilExpiry = expiresAt - now

            // Show warning 2 minutes before expiry
            if (timeUntilExpiry > 0 && timeUntilExpiry <= 2 * 60 * 1000) {
                setShowWarning(true)
                setTimeLeft(Math.floor(timeUntilExpiry / 1000))
            } else {
                setShowWarning(false)
            }
        }

        checkExpiry()
        const interval = setInterval(checkExpiry, 1000)

        return () => clearInterval(interval)
    }, [tokenExpiresAt, sessionWarningShown])

    const handleExtendSession = async () => {
        setShowWarning(false)
        await refreshAuth()
    }

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <AnimatePresence>
            {showWarning && (
                <motion.div
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    className="fixed top-4 right-4 z-50 bg-gradient-to-r from-orange-500/90 to-red-500/90 backdrop-blur-lg text-white p-4 rounded-lg shadow-2xl border border-orange-400/30 max-w-md"
                >
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                            <svg
                                className="w-6 h-6 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg mb-1">Session Expiring Soon</h3>
                            <p className="text-sm text-white/90 mb-3">
                                Your session will expire in{' '}
                                <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
                            </p>
                            <button
                                onClick={handleExtendSession}
                                className="bg-white text-orange-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-orange-50 transition-colors"
                            >
                                Extend Session
                            </button>
                        </div>
                        <button
                            onClick={() => setShowWarning(false)}
                            className="flex-shrink-0 text-white/80 hover:text-white"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default SessionWarning
