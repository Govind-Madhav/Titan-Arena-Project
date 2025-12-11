/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { useState } from 'react';
import {
  User,
  CheckCircle,
  XCircle,
  Search,
  Users,
  Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Layout from '../../Components/layout/Layout';
import { GradientText, SpotlightCard } from '../../Components/effects/ReactBits';

const HostManageUser = () => {
  const [users, setUsers] = useState([]);
  const [tournamentId, setTournamentId] = useState('');
  const [inputTournamentId, setInputTournamentId] = useState('');
  const [loading, setLoading] = useState(false);

  // In real app, we might get tournament ID from props or context
  // or select from a dropdown of host's tournaments

  const fetchPlayers = async () => {
    if (!inputTournamentId) {
      toast.error('Please enter a tournament ID');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:8080/api/host/players/${inputTournamentId}`);
      if (response.data.status === 'success') {
        const playersWithStatus = response.data.data.map(player => ({
          ...player,
          status: 'Pending' // Default status initially if not provided by backend
        }));
        setUsers(playersWithStatus);
        setTournamentId(inputTournamentId);
        toast.success('Players fetched');
      } else {
        toast.error('Failed to fetch players');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error fetching players');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (playerId) => {
    try {
      await axios.put(`http://localhost:8080/api/host/approve-reject/${playerId}/${tournamentId}?isApproved=true`);
      setUsers(users.map(user => user.id === playerId ? { ...user, status: 'Approved' } : user));
      toast.success('Player approved');
    } catch (error) {
      console.error(error);
      toast.error('Failed to approve player');
    }
  };

  const handleReject = async (playerId) => {
    try {
      await axios.put(`http://localhost:8080/api/host/approve-reject/${playerId}/${tournamentId}?isApproved=false`);
      setUsers(users.map(user => user.id === playerId ? { ...user, status: 'Rejected' } : user));
      toast.success('Player rejected');
    } catch (error) {
      console.error(error);
      toast.error('Failed to reject player');
    }
  };

  return (
    <Layout userRole="HOST">
      <div className="min-h-screen bg-titan-bg py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="font-display text-4xl font-bold mb-4">
              Player <GradientText>Management</GradientText>
            </h1>
            <p className="text-white/40 text-lg">
              Review and manage participants for your tournaments.
            </p>
          </div>

          {/* Search / Filter */}
          <div className="mb-12">
            <SpotlightCard className="bg-titan-bg-card border-white/10 p-8">
              <h2 className="font-heading text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Search className="text-titan-purple" />
                Find Tournament Players
              </h2>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Enter Tournament ID"
                    value={inputTournamentId}
                    onChange={(e) => setInputTournamentId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-6 py-4 text-white focus:border-titan-purple focus:outline-none transition-colors"
                  />
                  <div className="absolute right-4 top-4 text-white/20">
                    <Shield size={20} />
                  </div>
                </div>
                <button
                  onClick={fetchPlayers}
                  disabled={loading}
                  className="btn-neon px-8 py-4 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Users size={20} />
                      Fetch Players
                    </>
                  )}
                </button>
              </div>
            </SpotlightCard>
          </div>

          {/* Results */}
          {tournamentId && (
            <div className="mb-8 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                Players in Tournament <span className="text-titan-purple">#{tournamentId}</span>
              </h3>
              <span className="text-sm text-white/40">{users.length} participants</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
              <SpotlightCard key={user.id} className="bg-titan-bg-card/50 border-white/5 flex flex-col group hover:border-titan-purple/30">
                <div className="p-6 flex items-start gap-4">
                  <div className="h-16 w-16 rounded-xl bg-gray-800 overflow-hidden flex-shrink-0 border border-white/10">
                    <img
                      src={user.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || 'user'}`}
                      alt={user.fullName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-heading font-bold text-lg text-white truncate">{user.fullName || 'Unknown Player'}</h4>
                    <p className="text-sm text-white/40 truncate">{user.email}</p>
                    <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${user.status === 'Approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        user.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                      }`}>
                      {user.status === 'Approved' && <CheckCircle size={12} />}
                      {user.status === 'Rejected' && <XCircle size={12} />}
                      {user.status === 'Pending' && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />}
                      {user.status}
                    </div>
                  </div>
                </div>

                {user.status === 'Pending' && (
                  <div className="flex border-t border-white/5 divide-x divide-white/5 mt-auto">
                    <button
                      onClick={() => handleApprove(user.id)}
                      className="flex-1 py-3 bg-green-500/5 hover:bg-green-500/20 text-green-400/80 hover:text-green-400 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={16} /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(user.id)}
                      className="flex-1 py-3 bg-red-500/5 hover:bg-red-500/20 text-red-400/80 hover:text-red-400 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                )}
              </SpotlightCard>
            ))}
          </div>

          {users.length === 0 && tournamentId && !loading && (
            <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl">
              <Users className="mx-auto text-white/20 mb-4" size={48} />
              <h3 className="text-xl font-bold text-white mb-2">No Players Found</h3>
              <p className="text-white/40">Try a different tournament ID.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default HostManageUser;
