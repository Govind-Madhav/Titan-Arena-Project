/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Search, Filter, Shield, User } from 'lucide-react'
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import Layout from '../../Components/layout/Layout';
import { GradientText } from '../../Components/effects/ReactBits';

const ManageUsersPage = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [buttonLoadingId, setButtonLoadingId] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    try {
      setFetchLoading(true);
      await Promise.all([fetchPendingUsers(), fetchApprovedUsers()]);
    } finally {
      setFetchLoading(false);
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const res = await api.get('/admin/pending-players');
      setPendingUsers(res.data.data || []);
    } catch (e) { console.error(e) }
  };

  const fetchApprovedUsers = async () => {
    try {
      const res = await api.get('/admin/verified-players');
      setApprovedUsers(res.data.data || []);
    } catch (e) { console.error(e) }
  };

  const handleApprove = async (id) => {
    try {
      setButtonLoadingId(id);
      await api.put(`/admin/approve-player/${id}`);
      toast.success('Player approved successfully!');
      refreshData();
    } catch (error) {
      toast.error('Failed to approve player!');
    } finally {
      setButtonLoadingId(null);
    }
  };

  const handleReject = async (id) => {
    try {
      setButtonLoadingId(id);
      await api.delete(`/admin/delete-player/${id}`);
      toast.success('Player rejected and deleted!');
      refreshData();
    } catch (error) {
      toast.error('Failed to delete player!');
    } finally {
      setButtonLoadingId(null);
    }
  };

  return (
    <Layout userRole="ADMIN">
      <div className="min-h-screen bg-titan-bg py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="font-display text-4xl font-bold mb-4">
              Player <GradientText>Management</GradientText>
            </h1>
            <p className="text-white/40 text-lg">
              Oversee player registrations and active accounts.
            </p>
          </div>

          {/* Pending Requests */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="text-yellow-400" size={24} />
              <h2 className="font-heading text-2xl font-bold text-white">Pending Requests</h2>
              <span className="bg-yellow-400/10 text-yellow-400 px-3 py-1 rounded-full text-xs font-bold border border-yellow-400/20">
                {pendingUsers.length}
              </span>
            </div>

            {fetchLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-titan-purple"></div>
              </div>
            ) : pendingUsers.length === 0 ? (
              <div className="bg-titan-bg-card border border-white/5 rounded-2xl p-8 text-center">
                <p className="text-white/40">No pending requests at the moment.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {pendingUsers.map(user => (
                  <div key={user.id} className="bg-titan-bg-card border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-white/10 transition-all">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className="w-16 h-16 rounded-full bg-white/5 p-1">
                        <img src={user.imageUrl || 'https://via.placeholder.com/150'} alt="" className="w-full h-full rounded-full object-cover" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg">{user.fullName}</h3>
                        <p className="text-white/40 text-sm">{user.email}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="bg-white/5 text-white/60 px-2 py-1 rounded text-xs">Player</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                      <button
                        onClick={() => handleReject(user.id)}
                        disabled={buttonLoadingId === user.id}
                        className="px-6 py-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                      >
                        {buttonLoadingId === user.id ? '...' : <><XCircle size={18} /> Reject</>}
                      </button>
                      <button
                        onClick={() => handleApprove(user.id)}
                        disabled={buttonLoadingId === user.id}
                        className="px-6 py-2 rounded-xl bg-titan-purple hover:bg-titan-purple-dark text-white shadow-neon-sm transition-all flex items-center gap-2"
                      >
                        {buttonLoadingId === user.id ? 'Processing...' : <><CheckCircle size={18} /> Approve</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Active Players */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <User className="text-blue-400" size={24} />
                <h2 className="font-heading text-2xl font-bold text-white">Active Players</h2>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                  <input
                    type="text"
                    placeholder="Search players..."
                    className="bg-titan-bg-card border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-titan-purple/50"
                  />
                </div>
              </div>
            </div>

            <div className="bg-titan-bg-card border border-white/5 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-white/5 text-white/40 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4 font-medium">Player</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Joined</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {approvedUsers.map(user => (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={user.imageUrl} alt="" className="w-8 h-8 rounded-full" />
                          <div>
                            <p className="font-medium text-white">{user.fullName}</p>
                            <p className="text-xs text-white/40">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          Verified
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-white/60">
                        {new Date().toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-white/40 hover:text-white transition-colors">
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default ManageUsersPage;
