/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { useEffect, useState } from 'react'
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion'
import {
    Wallet as WalletIcon,
    Plus,
    ArrowUpRight,
    ArrowDownLeft,
    Trophy,
    RefreshCw,
    Clock,
    X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { GradientText, SpotlightCard, TiltedCard } from '../../Components/effects/ReactBits'
import api from '../../lib/api'

export default function WalletPage() {
    const [wallet, setWallet] = useState({ balance: 0, locked: 0, availableBalance: 0 })
    const [activation, setActivation] = useState({
        isActivated: false,
        kycApproved: false,
        hasBillingAddress: false,
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
        const amount = Number.parseInt(customAmount || depositAmount, 10)
        if (!amount || amount < 10) {
            toast.error('Minimum deposit is ₹10')
            return
        }

        if (!activation.isActivated) {
            setShowActivationModal(true)
            return
        }

        if (import.meta.env.DEV) {
            const toastId = toast.loading('Simulating deposit...')
            try {
                const res = await api.post('/wallet/test-deposit', { amount: amount * 100 })
                if (res.data.success) {
                    toast.success('Test deposit successful!', { id: toastId })
                    fetchWallet()
                    fetchTransactions()
                    setDepositAmount('')
                    setCustomAmount('')
                }
            } catch (error) {
                toast.error(error.response?.data?.message || 'Deposit failed', { id: toastId })
            }
            return
        }

        setPaying(true)
        try {
            const loaded = await loadRazorpayScript()
            if (!loaded) {
                toast.error('Failed to load Razorpay. Check your connection.')
                return
            }

            const orderRes = await api.post('/wallet/deposit/init', { amount })
            if (!orderRes.data.success) {
                if (orderRes.data.code === 'WALLET_NOT_ACTIVATED') {
                    setShowActivationModal(true)
                    return
                }
                throw new Error(orderRes.data.message)
            }

            const { orderId, key, currency } = orderRes.data.data
            const options = {
                key,
                amount: amount * 100,
                currency,
                name: 'Titan Arena',
                description: 'Wallet Top-Up',
                order_id: orderId,
                handler: async (response) => {
                    const toastId = toast.loading('Confirming payment...')
                    try {
                        const verifyRes = await api.post('/wallet/deposit/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        })
                        if (verifyRes.data.success) {
                            toast.success(verifyRes.data.message, { id: toastId })
                            fetchWallet()
                            fetchTransactions()
                            setDepositAmount('')
                            setCustomAmount('')
                        }
                    } catch {
                        toast.error('Payment verification failed. Contact support.', { id: toastId })
                    }
                },
                prefill: {},
                theme: { color: '#7C3AED' },
                modal: { ondismiss: () => setPaying(false) },
            }

            const rzp = new globalThis.Razorpay(options)
            rzp.open()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to initiate payment')
        } finally {
            setPaying(false)
        }
    }

    const handleWithdraw = async () => {
        const amount = Number.parseInt(withdrawAmount, 10)
        if (!amount || amount < 100) {
            toast.error('Minimum withdrawal is ₹100')
            return
        }

        if (!upiId?.includes('@')) {
            toast.error('Enter a valid UPI ID (e.g. name@upi)')
            return
        }

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
                    fetchWallet()
                    fetchTransactions()
                    setWithdrawModal(false)
                    setWithdrawAmount('')
                    setUpiId('')
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
                fetchWallet()
                fetchTransactions()
                setWithdrawModal(false)
                setWithdrawAmount('')
                setUpiId('')
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

    const formatCurrency = (paise) => new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format((paise || 0) / 100)

    const getTransactionIcon = (type) => {
        switch (type) {
            case 'DEPOSIT':
                return <ArrowDownLeft className="text-titan-success" />
            case 'WITHDRAW':
                return <ArrowUpRight className="text-titan-error" />
            case 'PRIZE':
                return <Trophy className="text-titan-warning" />
            case 'REFUND':
                return <RefreshCw className="text-titan-blue" />
            default:
                return <WalletIcon className="text-titan-purple" />
        }
    }

    let transactionHistorySection = null
    if (loading) {
        transactionHistorySection = (
            <div className="space-y-3">
                {[1, 2, 3].map((item) => <div key={item} className="glass-card h-20 animate-pulse" />)}
            </div>
        )
    } else if (transactions.length === 0) {
        transactionHistorySection = (
            <div className="text-center py-12 glass-card">
                <Clock size={48} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/40">No transactions yet</p>
            </div>
        )
    } else {
        transactionHistorySection = (
            <div className="space-y-3">
                {transactions.map((tx, index) => (
                    <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <SpotlightCard className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                                        {getTransactionIcon(tx.type)}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white">{tx.description || tx.type}</p>
                                        <p className="text-sm text-white/40">{new Date(tx.createdAt).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-semibold ${tx.amount >= 0 ? 'text-titan-success' : 'text-titan-error'}`}>
                                        {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                                    </p>
                                    <p className="text-xs text-white/40">{tx.status}</p>
                                </div>
                            </div>
                        </SpotlightCard>
                    </motion.div>
                ))}
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-titan-bg py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">
                        <WalletIcon className="inline-block mr-3 text-titan-purple" />
                        <GradientText>Wallet</GradientText>
                    </h1>
                    <p className="text-white/40">Manage your funds</p>
                    {import.meta.env.DEV && (
                        <div className="mt-2 inline-block px-3 py-1 bg-titan-warning/20 border border-titan-warning/50 rounded-full text-titan-warning text-xs font-bold uppercase tracking-wider">
                            Dev Mode - Test deposits and withdrawals enabled
                        </div>
                    )}
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
                        <TiltedCard className="p-6 bg-titan-bg-card border border-white/10 rounded-2xl">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="glass-card p-4">
                                    <p className="text-white/40 text-sm">Available</p>
                                    <p className="text-2xl font-bold text-white">{formatCurrency(wallet.availableBalance)}</p>
                                </div>
                                <div className="glass-card p-4">
                                    <p className="text-white/40 text-sm">Locked</p>
                                    <p className="text-2xl font-bold text-white">{formatCurrency(wallet.locked)}</p>
                                </div>
                                <div className="glass-card p-4">
                                    <p className="text-white/40 text-sm">Total</p>
                                    <p className="text-2xl font-bold text-white">{formatCurrency(wallet.balance)}</p>
                                </div>
                            </div>

                            <div className="mt-6 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <input
                                        value={depositAmount}
                                        onChange={(event) => setDepositAmount(event.target.value)}
                                        placeholder="Deposit amount"
                                        className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none"
                                    />
                                    <input
                                        value={customAmount}
                                        onChange={(event) => setCustomAmount(event.target.value)}
                                        placeholder="Custom amount"
                                        className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none"
                                    />
                                </div>

                                <div className="flex gap-3 flex-wrap">
                                    <button onClick={handleDeposit} disabled={paying} className="btn-neon px-4 py-2 flex items-center gap-2">
                                        <Plus size={16} /> Deposit
                                    </button>
                                    <button onClick={() => setWithdrawModal(true)} className="btn-secondary px-4 py-2 flex items-center gap-2">
                                        <ArrowUpRight size={16} /> Withdraw
                                    </button>
                                </div>
                            </div>
                        </TiltedCard>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <SpotlightCard className="bg-titan-bg-card border-white/10 p-6 h-full">
                            <h2 className="font-heading text-xl font-semibold mb-4">Activation</h2>
                            <p className="text-white/40 text-sm mb-4">
                                {activation.isActivated ? 'Wallet active' : 'Complete KYC and billing to activate wallet'}
                            </p>
                            <div className="space-y-2 text-sm text-white/60">
                                <p>KYC: {activation.kycApproved ? 'Approved' : 'Pending'}</p>
                                <p>Billing: {activation.hasBillingAddress ? 'Added' : 'Missing'}</p>
                            </div>
                        </SpotlightCard>
                    </motion.div>
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <h2 className="font-heading text-xl font-semibold mb-4">Recent Transactions</h2>
                    {transactionHistorySection}
                </motion.div>
            </div>

            <AnimatePresence>
                {withdrawModal && (
                    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-titan-bg-card border border-white/10 rounded-2xl p-6 max-w-md w-full relative"
                        >
                            <button onClick={() => setWithdrawModal(false)} className="absolute top-4 right-4 text-white/40 hover:text-white">
                                <X size={18} />
                            </button>
                            <h3 className="text-xl font-bold text-white mb-4">Withdraw Funds</h3>
                            <div className="space-y-4">
                                <input
                                    value={withdrawAmount}
                                    onChange={(event) => setWithdrawAmount(event.target.value)}
                                    placeholder="Amount"
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none"
                                />
                                <input
                                    value={upiId}
                                    onChange={(event) => setUpiId(event.target.value)}
                                    placeholder="UPI ID"
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none"
                                />
                                <button onClick={handleWithdraw} className="btn-neon w-full py-2.5">Submit Withdrawal</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {showActivationModal && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
                    <div className="bg-titan-bg-card border border-white/10 rounded-2xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-white mb-2">Wallet Not Activated</h3>
                        <p className="text-white/60">Complete KYC and billing address setup before using the wallet.</p>
                        <button onClick={() => setShowActivationModal(false)} className="btn-neon w-full py-2.5 mt-4">Close</button>
                    </div>
                </div>
            )}
        </div>
    )
}
