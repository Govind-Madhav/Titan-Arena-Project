/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Check, X, FileText, Calendar, User, Clock } from 'lucide-react';

const ManageApplications = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchApplications = async () => {
        try {
            const response = await api.get('/admin/applications');
            setApplications(response.data.data);
        } catch (error) {
            toast.error('Failed to fetch applications');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, []);

    const handleApprove = async (id) => {
        if (!window.confirm('Approve this host application? This will generate a HOST CODE.')) return;
        try {
            await api.post(`/admin/applications/${id}/approve`);
            toast.success('Application Approved');
            fetchApplications(); // Refresh list
        } catch (error) {
            toast.error(error.response?.data?.message || 'Approval Failed');
        }
    };

    const handleReject = async (id) => {
        const reason = window.prompt('Enter rejection reason:');
        if (reason === null) return; // Cancelled

        try {
            await api.post(`/admin/applications/${id}/reject`, { reason });
            toast.success('Application Rejected');
            fetchApplications();
        } catch (error) {
            toast.error('Rejection Failed');
        }
    };

    if (loading) return <div className="p-8 text-white">Loading applications...</div>;

    return (
        <div className="p-6 bg-titan-dark min-h-screen text-white">
            <h1 className="text-3xl font-bold font-display mb-8">Pending Host Applications</h1>

            {applications.length === 0 ? (
                <div className="text-center p-12 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-white/40">No pending applications</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {applications.map((app) => (
                        <div key={app.id} className="bg-black/30 border border-white/10 rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

                            <div className="space-y-4 flex-1">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-titan-gold/20 flex items-center justify-center text-titan-gold font-bold text-xl">
                                        {app.username[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{app.username}</h3>
                                        <p className="text-sm text-white/50">{app.email}</p>
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs border border-yellow-500/20 font-mono">
                                        PENDING
                                    </span>
                                </div>

                                <div className="bg-black/40 rounded-lg p-4 border border-white/5">
                                    <div className="flex items-start gap-2 mb-2">
                                        <FileText className="w-4 h-4 text-titan-cyan mt-1" />
                                        <span className="text-sm text-white/80 italic">"{app.notes}"</span>
                                    </div>
                                    {app.documentsUrl && (
                                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                                            <span className="text-xs text-titan-cyan uppercase tracking-wider">Portfolio:</span>
                                            <a href={app.documentsUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300 underline">
                                                {app.documentsUrl}
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 text-xs text-white/40">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Applied: {new Date(app.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleReject(app.id)}
                                    className="flex items-center gap-2 px-6 py-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-all font-bold"
                                >
                                    <X className="w-5 h-5" />
                                    Reject
                                </button>
                                <button
                                    onClick={() => handleApprove(app.id)}
                                    className="flex items-center gap-2 px-6 py-3 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 transition-all font-bold"
                                >
                                    <Check className="w-5 h-5" />
                                    Approve
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ManageApplications;
