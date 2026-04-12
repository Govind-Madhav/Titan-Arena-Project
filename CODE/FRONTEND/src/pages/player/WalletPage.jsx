/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Wallet as WalletIcon,
    Plus,
    ArrowUpRight,
    ArrowDownLeft,
    Trophy,
    RefreshCw,
    Clock,
    X,
    Smartphone
} from 'lucide-react'
import toast from 'react-hot-toast'
import { SpotlightCard, GradientText, TiltedCard } from '../../Components/effects/ReactBits'
import api from '../../lib/api'

export default function WalletPage() {
    const [wallet, setWallet] = useState({ balance: 0, locked: 0, availableBalance: 0 })
    const [activation, setActivation] = useState({
        isActivated: false,
        kycApproved: false,
        hasBillingAddress: false,
        missingItems: []
    })
    const [transactions, setTransactions] = useState([])
    const [loading, setLoading] = useState(true)
    const [depositAmount, setDepositAmount] = useState('')
    const [customAmount, setCustomAmount] = useState('')
    const [withdrawModal, setWithdrawModal] = useState(false)
    const [withdrawAmount, setWithdrawAmount] = useState('')
    const [upiId, setUpiId] = useState('')
    const [paying, setPaying] = useState(false)
    const [showActivationModal, setShowActivationModal] = useState(false)

    useEffect(() => {
        fetchWallet()
        fetchTransactions()
    }, [])

    const fetchWallet = async () => {
        try {
            const res = await api.get('/wallet')
            const data = res.data.data || { balance: 0, locked: 0, availableBalance: 0 }
            setWallet(data)
            // Store activation status
            if (data.activation) {
                setActivation(data.activation)
            }
        } catch (error) {
            console.error('Failed to fetch wallet:', error)
        }
    }

    const fetchTransactions = async () => {
        try {
            const res = await api.get('/wallet/transactions?limit=10')
            setTransactions(res.data.data || [])
        } catch (error) {
            console.error('Failed to fetch transactions:', error)
        } finally {
            setLoading(false)
        }
    }

    // Load Razorpay checkout script dynamically
    const loadRazorpayScript = () => new Promise((resolve) => {
        if (document.getElementById('razorpay-script')) return resolve(true)
        const script = document.createElement('script')
        script.id = 'razorpay-script'
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.body.appendChild(script)
    })

    const handleDeposit = async () => {
        const amount = parseInt(customAmount || depositAmount)
        if (!amount || amount < 10) {
            toast.error('Minimum deposit is ₹10')
            return
        }

        // Check wallet activation
        if (!activation.isActivated) {
            setShowActivationModal(true)
            return
        }

        // In dev mode, just use the simulator for speed
        if (import.meta.env.DEV) {
            const toastId = toast.loading('Simulating deposit...')
            try {
                const res = await api.post('/wallet/test-deposit', { amount: amount * 100 })
                if (res.data.success) {
                    toast.success('Test deposit successful!', { id: toastId })
                    fetchWallet(); fetchTransactions()
                    setDepositAmount(''); setCustomAmount('')
                }
            } catch (error) {
                toast.error(error.response?.data?.message || 'Deposit failed', { id: toastId })
            }
            return
        }

        // Production: real Razorpay flow
        setPaying(true)
        try {
            const loaded = await loadRazorpayScript()
            if (!loaded) { toast.error('Failed to load Razorpay. Check your connection.'); return }

            // Step 1: Create order on backend
            const orderRes = await api.post('/wallet/deposit/init', { amount })
            if (!orderRes.data.success) {
                if (orderRes.data.code === 'WALLET_NOT_ACTIVATED') {
                    setShowActivationModal(true)
                    return
                }
                throw new Error(orderRes.data.message)
            }
            const { orderId, key, currency } = orderRes.data.data

            // Step 2: Open Razorpay checkout modal
            const options = {
                key,
                amount: amount * 100,
                currency,
                name: 'Titan Arena',
                description: 'Wallet Top-Up',
                order_id: orderId,
                handler: async (response) => {
                    // Step 3: Verify payment on backend and credit wallet
                    const toastId = toast.loading('Confirming payment...')
                    try {
                        const verifyRes = await api.post('/wallet/deposit/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        })
                        if (verifyRes.data.success) {
                            toast.success(verifyRes.data.message, { id: toastId })
                            fetchWallet(); fetchTransactions()
                            setDepositAmount(''); setCustomAmount('')
                        }
                    } catch {
                        toast.error('Payment verification failed. Contact support.', { id: toastId })
                    }
                },
                prefill: {},
                theme: { color: '#7C3AED' }, // Titan purple
                modal: { ondismiss: () => setPaying(false) }
            }
            const rzp = new window.Razorpay(options)
            rzp.open()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to initiate payment')
        } finally {
            setPaying(false)
        }
    }

    const handleWithdraw = async () => {
        const amount = parseInt(withdrawAmount)
        if (!amount || amount < 100) {
            toast.error('Minimum withdrawal is ₹100')
            return
        }
        if (!upiId || !upiId.includes('@')) {
            toast.error('Enter a valid UPI ID (e.g. name@upi)')
            return
        }

        // Check wallet activation
        if (!activation.isActivated) {
            setShowActivationModal(true)
            return
        }

        if (import.meta.env.DEV) {
            const toastId = toast.loading('Simulating withdrawal...')
            try {
                const res = await api.post('/wallet/test-withdraw', { amount: amount * 100 })
                if (res.data.success) {
                    toast.success('Test withdrawal successful!', { id: toastId })
                    fetchWallet(); fetchTransactions()
                    setWithdrawModal(false); setWithdrawAmount(''); setUpiId('')
                }
            } catch (error) {
                toast.error(error.response?.data?.message || 'Withdrawal failed', { id: toastId })
            }
            return
        }

        try {
            const res = await api.post('/wallet/withdraw', { amount, upiId })
            if (res.data.success) {
                toast.success(res.data.message)
                fetchWallet(); fetchTransactions()
                setWithdrawModal(false); setWithdrawAmount(''); setUpiId('')
            }
        } catch (error) {
            const errData = error.response?.data
            if (errData?.code === 'WALLET_NOT_ACTIVATED') {
                setShowActivationModal(true)
            } else {
                toast.error(errData?.message || 'Withdrawal failed')
            }
        }
    }

    const formatCurrency = (paise) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format((paise || 0) / 100)
    }

    const getTransactionIcon = (type) => {
        switch (type) {
            case 'DEPOSIT': return <ArrowDownLeft className="text-titan-success" />
            case 'WITHDRAW': return <ArrowUpRight className="text-titan-error" />
            case 'PRIZE': return <Trophy className="text-titan-warning" />
            case 'REFUND': return <RefreshCw className="text-titan-blue" />
            default: return <WalletIcon className="text-titan-purple" />
        }
    }

    const displayTransactions = transactions;

    return (
        <div className="min-h-screen bg-titan-bg py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">
                        <WalletIcon className="inline-block mr-3 text-titan-purple" />
                        <GradientText>Wallet</GradientText>
                    </h1>
                    <p className="text-white/40">Manage your funds</p>
                    {import.meta.env.DEV && (
                        <div className="mt-2 inline-block px-3 py-1 bg-titan-warning/20 border border-titan-warning/50 rounded-full text-titan-warning text-xs font-bold uppercase tracking-wider">
                            Test Mode Active
                        </div>
                    )}
                </motion.div>

                {/* Balance Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-8"
                >
                    <TiltedCard maxTilt={4}>
                        <div className="glass-card p-8 bg-gradient-to-br from-titan-purple/20 to-titan-blue/10">
                            <p className="text-white/60 font-heading mb-2">Available Balance</p>
                            <p className="font-display text-4xl sm:text-5xl font-black text-white mb-4">
                                {formatCurrency(wallet.availableBalance || wallet.balance)}
                            </p>

                            <div className="flex gap-6 mb-6">
                                <div>
                                    <p className="text-sm text-white/40">Total Balance</p>
                                    <p className="font-heading font-bold">{formatCurrency(wallet.balance)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-white/40">Locked</p>
                                    <p className="font-heading font-bold text-titan-warning">{formatCurrency(wallet.locked)}</p>
                                </div>
                            </div>

                            {/* Activation Status Indicator */}
                            {!activation.isActivated && (
                                <div className="mb-6 p-4 bg-titan-warning/10 border border-titan-warning/30 rounded-lg">
                                    <p className="font-semibold text-titan-warning mb-2">⚠️ Wallet Not Activated</p>
                                    <p className="text-sm text-white/60 mb-3">Complete the following to activate:</p>
                                    <ul className="text-sm text-white/60 space-y-1 mb-3">
                                        {!activation.kycApproved && <li>• KYC verification (required)</li>}
                                        {!activation.hasBillingAddress && <li>• Billing address (required)</li>}
                                    </ul>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button onClick={handleDeposit} disabled={paying} className="btn-neon flex-1 flex items-center justify-center gap-2">
                                    <Plus size={18} />
                                    {paying ? 'Processing...' : 'Add Money'}
                                </button>
                                <button onClick={() => setWithdrawModal(true)} className="btn-glass flex-1 flex items-center justify-center gap-2">
                                    <ArrowUpRight size={18} />
                                    Withdraw
                                </button>
                            </div>
                        </div>
                    </TiltedCard>
                </motion.div>

                {/* Quick Add */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-8"
                >
                    <h2 className="font-heading text-xl font-semibold mb-4">Quick Add</h2>
                    <div className="flex gap-3 flex-wrap mb-3">
                        {[100, 500, 1000, 2000].map(amount => (
                            <button
                                key={amount}
                                onClick={() => { setDepositAmount(String(amount)); setCustomAmount('') }}
                                className={`px-6 py-3 font-heading font-semibold transition-all ${depositAmount === String(amount) ? 'glass-card border border-titan-purple/60 text-titan-purple' : 'glass-card-hover'
                                    }`}
                            >
                                ₹{amount}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-3">
                        <input
                            type="number"
                            placeholder="Or enter custom amount (₹)"
                            value={customAmount}
                            onChange={e => { setCustomAmount(e.target.value); setDepositAmount('') }}
                            className="input-field flex-1"
                            min="10"
                        />
                        <button onClick={handleDeposit} disabled={paying} className="btn-neon px-6">
                            {paying ? '...' : 'Deposit'}
                        </button>
                    </div>
                </motion.div>

                {/* Transaction History */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <h2 className="font-heading text-xl font-semibold mb-4">Recent Transactions</h2>

                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="glass-card h-20 animate-pulse" />
                            ))}
                        </div>
                    ) : displayTransactions.length === 0 ? (
                        <div className="text-center py-12 glass-card">
                            <Clock size={48} className="text-white/20 mx-auto mb-4" />
                            <p className="text-white/40">No transactions yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {displayTransactions.map((tx, i) => (
                                <motion.div
                                    key={tx.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <SpotlightCard className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                                    {getTransactionIcon(tx.type)}
                                                </div>
                                                <div>
                                                    <p className="font-heading font-semibold">{tx.type.replace('_', ' ')}</p>
                                                    <p className="text-sm text-white/40">{tx.message}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-display font-bold ${tx.amount >= 0 ? 'text-titan-success' : 'text-titan-error'
                                                    }`}>
                                                    {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                                                </p>
                                                <p className="text-xs text-white/30">
                                                    {new Date(tx.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </SpotlightCard>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Wallet Activation Modal */}
            <AnimatePresence>
                {showActivationModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
                        onClick={() => setShowActivationModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card p-8 max-w-md w-full"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="font-display text-2xl font-bold">Activate Your Wallet</h2>
                                <button onClick={() => setShowActivationModal(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <p className="text-white/70 mb-4">To use your wallet for deposits and withdrawals, please complete the following:</p>

                                {/* KYC Status */}
                                <div className={`p-4 rounded-lg border ${activation.kycApproved ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                    <div className="flex items-start gap-3">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${activation.kycApproved ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'}`}>
                                            {activation.kycApproved ? '✓' : '○'}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-white">KYC Verification</p>
                                            <p className="text-sm text-white/60 mt-1">
                                                {activation.kycApproved ? 'Verified' : 'Not yet verified. Go to Settings to complete KYC.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Billing Address Status */}
                                <div className={`p-4 rounded-lg border ${activation.hasBillingAddress ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                    <div className="flex items-start gap-3">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${activation.hasBillingAddress ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'}`}>
                                            {activation.hasBillingAddress ? '✓' : '○'}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-white">Billing Address</p>
                                            <p className="text-sm text-white/60 mt-1">
                                                {activation.hasBillingAddress ? 'Added' : 'Not yet added. Go to Settings to add billing address.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setShowActivationModal(false)
                                        window.location.href = '/settings#wallet' // Navigate to settings wallet section
                                    }}
                                    className="btn-neon w-full py-3 mt-6"
                                >
                                    Go to Settings
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Withdrawal Modal */}
            <AnimatePresence>
                {withdrawModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
                        onClick={() => setWithdrawModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card p-8 max-w-md w-full"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="font-display text-2xl font-bold">Withdraw Funds</h2>
                                <button onClick={() => setWithdrawModal(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={withdrawAmount}
                                        onChange={e => setWithdrawAmount(e.target.value)}
                                        placeholder="Minimum ₹100"
                                        className="input-field w-full"
                                        min="100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">
                                        <Smartphone size={14} className="inline mr-1" />
                                        UPI ID
                                    </label>
                                    <input
                                        type="text"
                                        value={upiId}
                                        onChange={e => setUpiId(e.target.value)}
                                        placeholder="yourname@upi"
                                        className="input-field w-full"
                                    />
                                    <p className="text-xs text-white/30 mt-1">e.g. name@okicici, name@ybl, number@paytm</p>
                                </div>
                                <div className="glass-card p-3 rounded-lg bg-titan-warning/5 border border-titan-warning/20">
                                    <p className="text-xs text-titan-warning">⚡ Processing time: 24–48 hours. Minimum withdrawal: ₹100.</p>
                                </div>
                                <button onClick={handleWithdraw} className="btn-neon w-full py-3">
                                    Submit Withdrawal Request
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
