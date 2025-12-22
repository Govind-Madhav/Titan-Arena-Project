/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { useState, useEffect } from 'react';
import {
  DollarSign,
  CreditCard,
  Calendar,
  Search,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import Layout from '../../Components/layout/Layout';
import { GradientText, SpotlightCard } from '../../Components/effects/ReactBits';
import useAuthStore from '../../store/authStore';

const HostUserPayments = () => {
  const [transactions, setTransactions] = useState([]);
  const [walletStats, setWalletStats] = useState({
    balance: 0,
    locked: 0,
    totalEarnings: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Wallet Stats
        const walletRes = await api.get('/wallet/');
        if (walletRes.data.success) {
          const w = walletRes.data.data;
          setWalletStats({
            balance: w.balance || 0,
            locked: w.locked || 0,
            totalEarnings: 0 // TODO: Add backend support for total earnings calc
          });
        }

        // Fetch Transactions
        const txRes = await api.get('/wallet/transactions?limit=20');
        if (txRes.data.success) {
          setTransactions(txRes.data.data.transactions || []);
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to fetch wallet details.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, navigate]);

  return (
    <Layout userRole="HOST">
      <div className="min-h-screen bg-titan-bg py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="font-display text-4xl font-bold mb-4">
              Payment <GradientText>History</GradientText>
            </h1>
            <p className="text-white/40 text-lg">
              Track all withdrawals and tournament earnings.
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <SpotlightCard className="bg-titan-bg-card border-white/10 p-6 flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-xl text-green-400">
                <DollarSign size={32} />
              </div>
              <div>
                <p className="text-white/40 text-sm">Available Balance</p>
                <h3 className="text-2xl font-bold text-white">₹{(walletStats.balance / 100).toLocaleString()}</h3> {/* Assuming paise */}
              </div>
            </SpotlightCard>
            <SpotlightCard className="bg-titan-bg-card border-white/10 p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                <CreditCard size={32} />
              </div>
              <div>
                <p className="text-white/40 text-sm">Total Transactions</p>
                <h3 className="text-2xl font-bold text-white">{transactions.length}</h3>
              </div>
            </SpotlightCard>
            <SpotlightCard className="bg-titan-bg-card border-white/10 p-6 flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-xl text-titan-purple">
                <Wallet size={32} />
              </div>
              <div>
                <p className="text-white/40 text-sm">Locked (Pending)</p>
                <h3 className="text-2xl font-bold text-white">₹{(walletStats.locked / 100).toLocaleString()}</h3>
              </div>
            </SpotlightCard>
          </div>

          {/* Transactions List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-titan-purple mx-auto mb-4"></div>
                <p className="text-white/40">Loading payments...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl">
                <CreditCard className="mx-auto text-white/20 mb-4" size={48} />
                <h3 className="text-xl font-bold text-white mb-2">No Transactions Found</h3>
                <p className="text-white/40">No payments have been made yet.</p>
              </div>
            ) : (
              <div className="bg-titan-bg-card/50 border border-white/10 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="p-6 text-sm font-bold text-white/60">Date</th>
                        <th className="p-6 text-sm font-bold text-white/60">Type</th>
                        <th className="p-6 text-sm font-bold text-white/60">Source</th>
                        <th className="p-6 text-sm font-bold text-white/60">Amount</th>
                        <th className="p-6 text-sm font-bold text-white/60">Status</th>
                        <th className="p-6 text-sm font-bold text-white/60">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-6 text-sm text-white/60">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-6">
                            <span className={`inline-flex items-center gap-1 text-sm font-medium ${tx.type === 'CREDIT' ? 'text-green-400' : 'text-red-400'
                              }`}>
                              {tx.type === 'CREDIT' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                              {tx.type}
                            </span>
                          </td>
                          <td className="p-6 text-sm text-white/80 font-mono">{tx.source}</td>
                          <td className={`p-6 text-sm font-bold ${tx.type === 'CREDIT' ? 'text-green-400' : 'text-white'
                            }`}>
                            ₹{(Math.abs(tx.amount) / 100).toFixed(2)}
                          </td>
                          <td className="p-6">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tx.status === 'COMPLETED'
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                              : tx.status === 'PENDING'
                                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="p-6 text-sm text-white/40 max-w-xs truncate">
                            {tx.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HostUserPayments;
