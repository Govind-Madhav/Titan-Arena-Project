/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy,
  Users,
  Calendar,
  DollarSign,
  Crown,
  ArrowUpRight,
  TrendingUp,
  Target,
  Activity,
  Gamepad
} from 'lucide-react';
import Layout from '../../Components/layout/Layout';
import useAuthStore from '../../store/authStore';
import { GradientText, SpotlightCard } from '../../Components/effects/ReactBits';

const HostDashboard = () => {
  const { user, getHostDashboard } = useAuthStore();
  const [stats, setStats] = useState({
    activeTournaments: 0,
    totalPlayers: 0,
    prizePool: 0,
    successRate: "0%"
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await getHostDashboard();
        if (result && result.success && result.data && result.data.stats) {
          setStats(result.data.stats);
        }
      } catch (error) {
        console.error("Dashboard fetch error", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [getHostDashboard]);

  const formatCurrency = (amount) => {
    if (typeof amount !== 'number') return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Layout userRole="HOST">
      <div className="min-h-screen bg-titan-bg py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background Effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-titan-purple/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-titan-blue/10 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header */}
          <div className="mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
                Host <GradientText>Control Panel</GradientText>
              </h1>
              <p className="text-white/40 text-lg max-w-2xl">
                Welcome back, {user?.username || 'Organizer'}. Manage your tournaments and engage with the community.
              </p>
            </motion.div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <StatsCard
              title="Active Tournaments"
              value={loading ? "..." : stats.activeTournaments}
              icon={Trophy}
              color="text-yellow-400"
              border="border-yellow-500/20"
            />
            <StatsCard
              title="Total Players"
              value={loading ? "..." : stats.totalPlayers}
              icon={Users}
              color="text-blue-400"
              trend=""
            />
            <StatsCard
              title="Prize Pool"
              value={loading ? "..." : formatCurrency(stats.prizePool)}
              icon={DollarSign}
              color="text-green-400"
              trend=""
            />
            <StatsCard
              title="Success Rate"
              value={loading ? "..." : (stats.successRate || "100%")}
              icon={Activity}
              color="text-purple-400"
            />
          </div>

          {/* Quick Actions */}
          <section className="mb-12">
            <h2 className="font-heading text-2xl font-bold mb-6 flex items-center gap-2">
              <Target className="text-titan-purple" />
              Organizer Tools
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <ActionCard
                to="/hostTourn"
                title="Manage Events"
                desc="Create and edit tournaments."
                icon={Calendar}
                color="bg-yellow-500/10 hover:bg-yellow-500/20"
                border="border-yellow-500/20"
              />
              <ActionCard
                to="/hostUsers"
                title="Player Management"
                desc="View registered participants."
                icon={Users}
                color="bg-blue-500/10 hover:bg-blue-500/20"
                border="border-blue-500/20"
              />
              <ActionCard
                to="/hostUsersPayment"
                title="Payments"
                desc="Track entry fees and payouts."
                icon={DollarSign}
                color="bg-green-500/10 hover:bg-green-500/20"
                border="border-green-500/20"
              />
              <ActionCard
                to="/declare-winners"
                title="Declare Winners"
                desc="Finalize results and rankings."
                icon={Crown}
                color="bg-purple-500/10 hover:bg-purple-500/20"
                border="border-purple-500/20"
              />
            </div>
          </section>

          {/* Join Tournaments CTA */}
          <section>
            <h2 className="font-heading text-2xl font-bold mb-6 flex items-center gap-2">
              <Gamepad className="text-titan-purple" />
              Compete
            </h2>
            <Link to="/tournaments">
              <SpotlightCard className="bg-titan-bg-card border-white/10 p-8 flex items-center justify-between group cursor-pointer hover:border-titan-purple/50">
                <div>
                  <h3 className="font-heading font-bold text-2xl text-white mb-2">Join Other Tournaments</h3>
                  <p className="text-white/40">Want to play instead of host? Browse active tournaments.</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-titan-purple/20 transition-colors">
                  <ArrowUpRight className="text-white group-hover:text-titan-purple" />
                </div>
              </SpotlightCard>
            </Link>
          </section>
        </div>
      </div>
    </Layout>
  );
};

// Reusable Components
const StatsCard = ({ title, value, icon: Icon, color, trend, border = "border-white/5" }) => (
  <div className={`bg-titan-bg-card border ${border} p-6 rounded-2xl relative overflow-hidden group`}>
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
      <Icon size={64} />
    </div>
    <div className="relative z-10">
      <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-4 ${color}`}>
        <Icon size={20} />
      </div>
      <p className="text-white/40 text-sm mb-1">{title}</p>
      <h3 className="text-2xl font-display font-bold text-white">{value}</h3>
      {trend && <p className="text-xs text-green-400 mt-2 flex items-center gap-1"><TrendingUp size={12} /> {trend}</p>}
    </div>
  </div>
);

const ActionCard = ({ to, title, desc, icon: Icon, color, border }) => (
  <Link to={to} className={`block p-6 rounded-2xl border ${border} ${color} transition-all group`}>
    <div className="flex items-start justify-between">
      <div>
        <h3 className="font-heading font-bold text-lg text-white mb-1 group-hover:text-titan-purple transition-colors">{title}</h3>
        <p className="text-sm text-white/50">{desc}</p>
      </div>
      <ArrowUpRight className="text-white/20 group-hover:text-white transition-colors" />
    </div>
  </Link>
);

export default HostDashboard;
