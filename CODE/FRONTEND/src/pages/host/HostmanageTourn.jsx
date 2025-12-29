/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { useState, useEffect } from 'react';
import {
  Trophy,
  Calendar,
  DollarSign,
  Trash2,
  Pen,
  Plus,
  Gamepad2,
  Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import Layout from '../../Components/layout/Layout';
import { GradientText, SpotlightCard } from '../../Components/effects/ReactBits';

const ManageTournamentsPage = () => {
  const [tournaments, setTournaments] = useState([]);
  const [games, setGames] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    gameType: '',
    joiningFee: '',
    image: '',
    status: 'Active',
  });
  const [editing, setEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { user } = useAuthStore(); // Use global user state if needed

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch "My Tournaments" directly from the dashboard/host endpoint
      // Using /tournaments/host/dashboard which returns { tournaments, stats }
      const [tournRes, gameRes] = await Promise.all([
        api.get('/tournaments/host/dashboard'),
        api.get('/games')
      ]);

      // The endpoint returns { data: { tournaments: [], stats: {} } }
      setTournaments(tournRes.data.data.tournaments || []);
      setGames(gameRes.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/tournaments/${editId}`, formData);
        toast.success('Tournament updated');
      } else {
        await api.post('/tournaments', formData);
        toast.success('Tournament created');
      }
      resetForm();
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save tournament');
    }
  };

  const handleEdit = (id) => {
    const tournament = tournaments.find(t => t.id === id);
    if (!tournament) return;
    setFormData({
      name: tournament.name,
      description: tournament.description,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      gameType: tournament.gameType,
      joiningFee: tournament.joiningFee,
      image: tournament.imageUrl || '',
      status: tournament.active ? 'Active' : 'Inactive',
    });
    setEditing(true);
    setEditId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tournament?')) return;
    try {
      await api.delete(`/tournaments/${id}`);
      toast.success('Tournament deleted');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete tournament');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      gameType: '',
      joiningFee: '',
      image: '',
      status: 'Active',
    });
    setEditing(false);
    setEditId(null);
  };

  return (
    <Layout userRole="HOST">
      <div className="min-h-screen bg-titan-bg py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="font-display text-4xl font-bold mb-4">
              Manage <GradientText>Tournaments</GradientText>
            </h1>
            <p className="text-white/40 text-lg">
              Create, update, and monitor your competitive events.
            </p>
          </div>

          {/* Create/Edit Form */}
          <div className="mb-12">
            <SpotlightCard className="bg-titan-bg-card border-white/10 p-8">
              <h2 className="font-heading text-2xl font-bold text-white mb-6 flex items-center gap-2">
                {editing ? <Pen className="text-titan-purple" /> : <Plus className="text-titan-purple" />}
                {editing ? 'Edit Tournament' : 'Create New Tournament'}
              </h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-1">Tournament Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-titan-purple focus:outline-none transition-colors"
                      placeholder="e.g. Summer Championship 2024"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-1">Game Title</label>
                    <div className="relative">
                      <Gamepad2 className="absolute left-3 top-3.5 text-white/40" size={18} />
                      <select
                        name="gameType"
                        value={formData.gameType}
                        onChange={handleChange}
                        required
                        className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:border-titan-purple focus:outline-none appearance-none cursor-pointer"
                      >
                        <option value="" disabled className="bg-gray-900">Select Game</option>
                        {games.map(game => (
                          <option key={game.id} value={game.name} className="bg-gray-900">{game.name}</option>
                        ))}
                        <option value="Other" className="bg-gray-900">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-1">Start Date</label>
                      <input
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleChange}
                        required
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-titan-purple focus:outline-none cancel-calendar-icon"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-1">End Date</label>
                      <input
                        type="date"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleChange}
                        required
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-titan-purple focus:outline-none cancel-calendar-icon"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-1">Joining Fee (₹)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3.5 text-white/40" size={18} />
                      <input
                        type="number"
                        name="joiningFee"
                        value={formData.joiningFee}
                        onChange={handleChange}
                        required
                        className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:border-titan-purple focus:outline-none"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-1">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      required
                      rows="4"
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-titan-purple focus:outline-none resize-none"
                      placeholder="Tournament rules, prize distribution, etc."
                    />
                  </div>
                </div>
                <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-white/5">
                  {editing && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn-neon px-8 py-2 flex items-center gap-2"
                  >
                    {editing ? <Pen size={18} /> : <Plus size={18} />}
                    {editing ? 'Update Tournament' : 'Create Tournament'}
                  </button>
                </div>
              </form>
            </SpotlightCard>
          </div>

          {/* Tournaments List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-titan-purple mx-auto mb-4"></div>
                <p className="text-white/40">Loading tournaments...</p>
              </div>
            ) : tournaments.length === 0 ? (
              <div className="col-span-full text-center py-20 border border-dashed border-white/10 rounded-3xl">
                <Trophy className="mx-auto text-white/20 mb-4" size={48} />
                <h3 className="text-xl font-bold text-white mb-2">No Tournaments Yet</h3>
                <p className="text-white/40">Create your first tournament to get started.</p>
              </div>
            ) : (
              tournaments.map(tournament => (
                <SpotlightCard key={tournament.id} className="bg-titan-bg-card/50 border-white/5 flex flex-col h-full group hover:border-titan-purple/30">
                  <div className="relative h-48 w-full rounded-xl overflow-hidden mb-5 bg-gray-900">
                    <img
                      src={tournament.imageUrl || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80"}
                      alt={tournament.name}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                    <div className="absolute top-3 right-3 flex gap-2">
                      <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10">
                        {tournament.gameType}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="font-heading font-bold text-xl text-white truncate">{tournament.name}</h3>
                      <p className="text-white/60 text-xs line-clamp-1">{tournament.description}</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6 flex-1 px-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/40 flex items-center gap-2"><Calendar size={14} /> Schedule</span>
                      <span className="text-white font-medium text-xs">
                        {new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/40 flex items-center gap-2"><DollarSign size={14} /> Entry</span>
                      <span className="text-titan-purple font-bold">₹{tournament.joiningFee}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-white/5 mt-auto">
                    <button
                      onClick={() => handleEdit(tournament.id)}
                      className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-blue-500/20 text-white/60 hover:text-blue-400 font-medium text-sm transition-all flex items-center justify-center gap-2"
                    >
                      <Pen size={14} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(tournament.id)}
                      className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 font-medium text-sm transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </SpotlightCard>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ManageTournamentsPage;
