import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    Wallet as WalletIcon,
    Plus,
    ArrowUpRight,
    ArrowDownLeft,
    Trophy,
    RefreshCw,
    Clock
} from 'lucide-react'
import toast from 'react-hot-toast'
import { SpotlightCard, GradientText, TiltedCard } from '../components/effects/ReactBits'
import api from '../lib/api'

export default function WalletPage() {
    const [wallet, setWallet] = useState({ balance: 0, locked: 0, availableBalance: 0 })
    const [transactions, setTransactions] = useState([])
    const [loading, setLoading] = useState(true)
    const [depositAmount, setDepositAmount] = useState('')

    useEffect(() => {
        fetchWallet()
        fetchTransactions()
    }, [])

    const fetchWallet = async () => {
        try {
            const res = await api.get('/wallet')
            setWallet(res.data.data || { balance: 0, locked: 0, availableBalance: 0 })
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

    const handleDeposit = async () => {
        const amount = parseInt(depositAmount) * 100 // Convert to paise
        if (!amount || amount < 100) {
            toast.error('Minimum deposit is ₹1')
            return
        }

        try {
            // This would integrate with a payment gateway
            toast.success('Deposit flow would start here')
            setDepositAmount('')
        } catch (error) {
            toast.error('Deposit failed')
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

    // Mock transactions
    const mockTransactions = [
        { id: '1', type: 'DEPOSIT', amount: 100000, message: 'Deposit via UPI', createdAt: new Date().toISOString() },
        { id: '2', type: 'ENTRY_FEE', amount: -5000, message: 'Entry fee for BGMI Pro League', createdAt: new Date(Date.now() - 86400000).toISOString() },
        { id: '3', type: 'PRIZE', amount: 15000, message: '2nd place in Valorant Cup', createdAt: new Date(Date.now() - 172800000).toISOString() },
        { id: '4', type: 'REFUND', amount: 2500, message: 'Tournament canceled refund', createdAt: new Date(Date.now() - 259200000).toISOString() },
    ]

    const displayTransactions = transactions.length > 0 ? transactions : mockTransactions

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

                            <div className="flex gap-3">
                                <button className="btn-neon flex-1 flex items-center justify-center gap-2">
                                    <Plus size={18} />
                                    Add Money
                                </button>
                                <button className="btn-glass flex-1 flex items-center justify-center gap-2">
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
                    <div className="flex gap-3 flex-wrap">
                        {[100, 500, 1000, 2000].map(amount => (
                            <button
                                key={amount}
                                onClick={() => setDepositAmount(String(amount))}
                                className="px-6 py-3 glass-card-hover font-heading font-semibold"
                            >
                                ₹{amount}
                            </button>
                        ))}
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
        </div>
    )
}
