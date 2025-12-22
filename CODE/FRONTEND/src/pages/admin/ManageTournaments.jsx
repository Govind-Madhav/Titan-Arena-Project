/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { useState, useEffect } from 'react';
import {
    Trophy,
    Calendar,
    Users,
    DollarSign,
    Trash2,
    Power,
    Search,
    AlertCircle,
    CheckCircle,
    XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import Layout from '../../Components/layout/Layout';
import { GradientText, SpotlightCard } from '../../Components/effects/ReactBits';

const ManageTournaments = () => {
    const [tournaments, setTournaments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState(null);

    useEffect(() => {
        fetchTournaments();
    }, []);

    const fetchTournaments = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/tournaments');
            setTournaments(res.data.data || []);
        } catch (error) {
            console.error('Error fetching tournaments:', error);
            toast.error('Failed to load tournaments');
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            setActionLoadingId(id);
            await api.put(`/admin/toggle-tournament-status/${id}?isActive=${!currentStatus}`);
            toast.success(`Tournament ${!currentStatus ? 'activated' : 'deactivated'}`);
            fetchTournaments();
        } catch (error) {
            toast.error('Failed to update status');
        } finally {
            setActionLoadingId(null);
        }
    };

    const deleteTournament = async (id) => {
        if (!window.confirm('Are you sure? This cannot be undone.')) return;

        try {
            setActionLoadingId(id);
            await api.delete(`/admin/delete-tournament/${id}`);
            toast.success('Tournament deleted');
            fetchTournaments();
        } catch (error) {
            toast.error('Failed to delete tournament');
        } finally {
            setActionLoadingId(null);
        }
    };

    return (
        <Layout userRole="ADMIN">
            <div className="min-h-screen bg-titan-bg py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="font-display text-4xl font-bold mb-4">
                                Tournament <GradientText>Oversight</GradientText>
                            </h1>
                            <p className="text-white/40 text-lg">
                                Manage active competitions and monitor platform events.
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <div className="bg-titan-bg-card border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3">
                                <Trophy className="text-titan-purple" />
                                <div>
                                    <p className="text-xs text-white/40 uppercase font-bold">Total Events</p>
                                    <p className="font-display font-bold text-xl text-white">{tournaments.length}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-titan-purple"></div>
                        </div>
                    ) : tournaments.length === 0 ? (
                        <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl">
                            <Trophy className="mx-auto text-white/20 mb-4" size={48} />
                            <h3 className="text-xl font-bold text-white mb-2">No Tournaments Found</h3>
                            <p className="text-white/40">Platform seems quiet today.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {tournaments.map(tournament => (
                                <SpotlightCard key={tournament.id} className="flex flex-col h-full border-white/5 bg-titan-bg-card/50">
                                    {/* Card Image */}
                                    <div className="relative h-48 w-full rounded-xl overflow-hidden mb-5 group">
                                        <img
                                            src={tournament.imageUrl || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80"}
                                            alt={tournament.name}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                        <div className="absolute top-3 right-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${tournament.active
                                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                                : 'bg-red-500/20 text-red-400 border-red-500/30'
                                                }`}>
                                                {tournament.active ? 'Active' : 'Offline'}
                                            </span>
                                        </div>
                                        <div className="absolute bottom-3 left-3 right-3">
                                            <h3 className="font-heading font-bold text-xl text-white truncate">{tournament.name}</h3>
                                            <p className="text-white/60 text-sm">{tournament.gameType}</p>
                                        </div>
                                    </div>

                                    {/* Card Details */}
                                    <div className="space-y-3 mb-6 flex-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-white/40 flex items-center gap-2"><DollarSign size={14} /> Entry Fee</span>
                                            <span className="text-white font-medium">₹{tournament.joiningFee}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-white/40 flex items-center gap-2"><Calendar size={14} /> Start Date</span>
                                            <span className="text-white font-medium">{new Date(tournament.startDate).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-white/40 flex items-center gap-2"><Trophy size={14} /> Prize Pool</span>
                                            <span className="text-titan-purple font-bold">₹{tournament.prizePool || '10,000'}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3 pt-4 border-t border-white/5">
                                        <button
                                            onClick={() => toggleStatus(tournament.id, tournament.active)}
                                            disabled={actionLoadingId === tournament.id}
                                            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${tournament.active
                                                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                                : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                                }`}
                                        >
                                            <Power size={16} />
                                            {tournament.active ? 'Disable' : 'Enable'}
                                        </button>
                                        <button
                                            onClick={() => deleteTournament(tournament.id)}
                                            disabled={actionLoadingId === tournament.id}
                                            className="px-4 py-2 rounded-xl bg-white/5 text-white/40 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </SpotlightCard>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default ManageTournaments;
