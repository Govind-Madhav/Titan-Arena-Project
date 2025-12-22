/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Search, Filter, Shield, User, Phone, Mail } from 'lucide-react'
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import Layout from '../../Components/layout/Layout';
import { GradientText } from '../../Components/effects/ReactBits';

const ManageHostsPage = () => {
  const [pendingHosts, setPendingHosts] = useState([]);
  const [approvedHosts, setApprovedHosts] = useState([]);
  const [buttonLoadingId, setButtonLoadingId] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    try {
      setFetchLoading(true);
      await Promise.all([fetchPendingHosts(), fetchApprovedHosts()]);
    } finally {
      setFetchLoading(false);
    }
  };

  const fetchPendingHosts = async () => {
    try {
      const res = await api.get('/admin/pending-hosts');
      setPendingHosts(res.data.data || []);
    } catch (e) { console.error(e) }
  };

  const fetchApprovedHosts = async () => {
    try {
      const res = await api.get('/admin/verified-hosts');
      setApprovedHosts(res.data.data || []);
    } catch (e) { console.error(e) }
  };

  const handleApprove = async (id) => {
    try {
      setButtonLoadingId(id);
      await api.put(`/admin/approve-host/${id}`);
      toast.success('Host approved successfully!');
      refreshData();
    } catch (error) {
      toast.error('Failed to approve host!');
    } finally {
      setButtonLoadingId(null);
    }
  };

  const handleReject = async (id) => {
    try {
      setButtonLoadingId(id);
      await api.delete(`/admin/delete-host/${id}`);
      toast.success('Host rejected and deleted!');
      refreshData();
    } catch (error) {
      toast.error('Failed to delete host!');
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
              Host <GradientText>Verification</GradientText>
            </h1>
            <p className="text-white/40 text-lg">
              Review and approve tournament organizer applications.
            </p>
          </div>

          {/* Pending Requests */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="text-yellow-400" size={24} />
              <h2 className="font-heading text-2xl font-bold text-white">Pending Applications</h2>
              <span className="bg-yellow-400/10 text-yellow-400 px-3 py-1 rounded-full text-xs font-bold border border-yellow-400/20">
                {pendingHosts.length}
              </span>
            </div>

            {fetchLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-titan-purple"></div>
              </div>
            ) : pendingHosts.length === 0 ? (
              <div className="bg-titan-bg-card border border-white/5 rounded-2xl p-8 text-center">
                <p className="text-white/40">No pending host applications.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {pendingHosts.map(host => (
                  <div key={host.id} className="bg-titan-bg-card border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-white/10 transition-all">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className="w-16 h-16 rounded-full bg-white/5 p-1">
                        <img src={host.imageUrl || 'https://via.placeholder.com/150'} alt="" className="w-full h-full rounded-full object-cover" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg">{host.fullName}</h3>
                        <div className="flex flex-col gap-1 mt-1">
                          <span className="flex items-center gap-2 text-white/40 text-sm"><Mail size={12} /> {host.email}</span>
                          <span className="flex items-center gap-2 text-white/40 text-sm"><Phone size={12} /> {host.mobile}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                      <button
                        onClick={() => handleReject(host.id)}
                        disabled={buttonLoadingId === host.id}
                        className="px-6 py-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                      >
                        {buttonLoadingId === host.id ? '...' : <><XCircle size={18} /> Reject</>}
                      </button>
                      <button
                        onClick={() => handleApprove(host.id)}
                        disabled={buttonLoadingId === host.id}
                        className="px-6 py-2 rounded-xl bg-titan-purple hover:bg-titan-purple-dark text-white shadow-neon-sm transition-all flex items-center gap-2"
                      >
                        {buttonLoadingId === host.id ? 'Processing...' : <><CheckCircle size={18} /> Approve</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Approved Hosts */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <User className="text-blue-400" size={24} />
                <h2 className="font-heading text-2xl font-bold text-white">Verified Hosts</h2>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                  <input
                    type="text"
                    placeholder="Search hosts..."
                    className="bg-titan-bg-card border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-titan-purple/50"
                  />
                </div>
              </div>
            </div>

            <div className="bg-titan-bg-card border border-white/5 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-white/5 text-white/40 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4 font-medium">Host Profile</th>
                    <th className="px-6 py-4 font-medium">Contact</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {approvedHosts.map(host => (
                    <tr key={host.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={host.imageUrl} alt="" className="w-10 h-10 rounded-full" />
                          <div>
                            <p className="font-medium text-white">{host.fullName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-sm text-white/60">
                          <span>{host.email}</span>
                          <span>{host.mobile}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          Organizer
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-white/40 hover:text-white transition-colors">
                          Details
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

export default ManageHostsPage;
