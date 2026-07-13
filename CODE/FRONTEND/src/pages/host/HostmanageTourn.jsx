/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Calendar,
  DollarSign,
  Gamepad2,
  Pen,
  Plus,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import Layout from '../../Components/layout/Layout';
import { GradientText, SpotlightCard } from '../../Components/effects/ReactBits';
import useAuthStore from '../../store/authStore';

const initialFormState = {
  name: '',
  description: '',
  game: '',
  startTime: '',
  durationDays: 1,
  entryFee: '',
  prizePool: '',
  maxParticipants: '',
  rules: '',
  type: 'SOLO',
  format: 'SINGLE_ELIMINATION',
};

const stripDurationLine = (value = '') => value
  .split('\n')
  .filter(line => !/^Duration\s*:/i.test(line.trim()))
  .join('\n')
  .trim();

const withDurationLine = (rules = '', durationDays = 1) => {
  const base = stripDurationLine(rules);
  const durationLine = `Duration: ${durationDays} day${durationDays > 1 ? 's' : ''}`;
  return base ? `${base}\n${durationLine}` : durationLine;
};

const parseDurationFromRules = (rules = '') => {
  const durationRegex = /Duration\s*:\s*(\d+)/i;
  const match = durationRegex.exec(rules);
  const parsed = Number(match?.[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const getApprovalModeLabel = (mode) => {
  if (mode === 'auto') return 'Auto';
  if (mode === 'semi-auto') return 'Semi-auto';
  return 'Manual review';
};

const ManageTournamentsPage = () => {
  const { user } = useAuthStore();
  const isAdminUser = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN' || user?.isAdmin;
  const canModifyTournament = (tournament) => isAdminUser || tournament?.hostId === user?.id;
  const [tournaments, setTournaments] = useState([]);
  const [games, setGames] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [editing, setEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [currentBanner, setCurrentBanner] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const tournamentRequest = isAdminUser
        ? api.get('/admin/tournaments', { params: { page: 1, limit: 500 } })
        : api.get('/tournaments/host/dashboard');

      const [tournRes, gameRes] = await Promise.all([
        tournamentRequest,
        api.get('/games'),
      ]);

      setTournaments(tournRes.data.data.tournaments || []);
      setGames(gameRes.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [isAdminUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormData(initialFormState);
    setEditing(false);
    setEditId(null);
    setBannerFile(null);
    setBannerPreview(null);
    setCurrentBanner(null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    const numericFields = ['entryFee', 'maxParticipants', 'durationDays'];
    let processedValue = value;
    if (numericFields.includes(name)) {
      processedValue = value === '' ? '' : Number(value);
    }
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleBannerSelect = (event) => {
    const file = event.target.files?.[0] || null;
    setBannerFile(file);
    if (bannerPreview) {
      URL.revokeObjectURL(bannerPreview);
      setBannerPreview(null);
    }
    if (file) {
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const uploadBannerForTournament = async (tournamentId) => {
    if (!bannerFile || !tournamentId) {
      return;
    }

    const formData = new FormData();
    formData.append('image', bannerFile);
    await api.post(`/tournaments/${tournamentId}/upload-banner`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const startDate = formData.startTime ? new Date(formData.startTime) : null;
      const parsedEntryFee = Number(formData.entryFee);
      const parsedMaxParticipants = Number(formData.maxParticipants);
      const parsedDurationDays = Number(formData.durationDays || 1);

      if (!startDate || Number.isNaN(startDate.getTime())) {
        toast.error('Please select a valid tournament start date and time.');
        return;
      }

      if (!Number.isFinite(parsedEntryFee) || parsedEntryFee < 0) {
        toast.error('Entry fee must be a valid non-negative number.');
        return;
      }

      if (!Number.isFinite(parsedMaxParticipants) || parsedMaxParticipants < 2) {
        toast.error('Max players must be at least 2.');
        return;
      }

      const submitData = {
        name: String(formData.name || '').trim(),
        description: String(formData.description || '').trim(),
        game: formData.game,
        type: formData.type,
        format: formData.format,
        startTime: startDate.toISOString(),
        registrationEnd: new Date(startDate.getTime() - (60 * 60 * 1000)).toISOString(),
        entryFee: parsedEntryFee,
        maxParticipants: parsedMaxParticipants,
        rules: withDurationLine(formData.rules, parsedDurationDays),
      };

      if (isAdminUser) {
        const parsedPrizePool = Number(formData.prizePool);
        if (!Number.isFinite(parsedPrizePool) || parsedPrizePool < 0) {
          toast.error('Prize pool must be a valid non-negative number.');
          return;
        }
        submitData.prizePool = parsedPrizePool;
      }

      let tournamentId = editId;

      if (editing) {
        await api.put(`/tournaments/${editId}`, submitData);
        toast.success('Tournament updated');
      } else {
        const createResponse = await api.post('/tournaments', submitData);
        tournamentId = createResponse.data?.data?.id;
        toast.success('Tournament created');
      }

      await uploadBannerForTournament(tournamentId);
      resetForm();
      fetchData();
    } catch (error) {
      console.error(error);
      const backendErrors = error.response?.data?.errors;
      if (Array.isArray(backendErrors) && backendErrors.length > 0) {
        toast.error(backendErrors[0]?.message || error.response?.data?.message || 'Failed to save tournament');
      } else {
        toast.error(error.response?.data?.message || 'Failed to save tournament');
      }
    }
  };

  const handleEdit = (tournamentId) => {
    const tournament = tournaments.find(item => item.id === tournamentId);
    if (!tournament) {
      return;
    }

    if (!canModifyTournament(tournament)) {
      toast.error('You can only edit tournaments you own or manage as an admin.');
      return;
    }

    setEditing(true);
    setEditId(tournamentId);
    setFormData({
      name: tournament.name || '',
      description: tournament.description || '',
      game: tournament.game || '',
      startTime: tournament.startTime ? new Date(tournament.startTime).toISOString().slice(0, 16) : '',
      durationDays: parseDurationFromRules(tournament.rules || ''),
      entryFee: tournament.entryFee ?? '',
        prizePool: tournament.prizePool ?? '',
      maxParticipants: tournament.maxParticipants ?? '',
      rules: stripDurationLine(tournament.rules || ''),
      type: tournament.type || 'SOLO',
      format: tournament.format || 'SINGLE_ELIMINATION',
    });
    setCurrentBanner(tournament.bannerUrl || null);
    setBannerFile(null);
    if (bannerPreview) {
      URL.revokeObjectURL(bannerPreview);
      setBannerPreview(null);
    }
  };

  const handleDelete = async (tournamentId) => {
    const tournament = tournaments.find(item => item.id === tournamentId);
    if (!tournament || !canModifyTournament(tournament)) {
      toast.error('You can only delete tournaments you own or manage as an admin.');
      return;
    }

    if (!globalThis.confirm('Delete this tournament?')) {
      return;
    }

    try {
      await api.delete(`/tournaments/${tournamentId}`);
      toast.success('Tournament deleted');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete tournament');
    }
  };

  const getTournamentStatusClass = (status) => {
    if (status === 'REGISTRATION') return 'bg-green-500/20 text-green-400';
    if (status === 'ONGOING') return 'bg-blue-500/20 text-blue-400';
    return 'bg-white/10 text-white/40';
  };

  const hasNoTournaments = tournaments.length === 0;
  const durationDaysValue = Number(formData.durationDays || 1);
  const endDatePreview = formData.startTime
    ? new Date(new Date(formData.startTime).getTime() + (durationDaysValue * 24 * 60 * 60 * 1000))
    : null;

  let tournamentsContent;
  if (loading) {
    tournamentsContent = (
      <div className="col-span-full text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-titan-purple mx-auto mb-4"></div>
        <p className="text-white/40">Loading tournaments...</p>
      </div>
    );
  } else if (hasNoTournaments) {
    tournamentsContent = (
      <div className="col-span-full text-center py-20 border border-dashed border-white/10 rounded-3xl">
        <Trophy className="mx-auto text-white/20 mb-4" size={48} />
        <h3 className="text-xl font-bold text-white mb-2">No Tournaments Yet</h3>
        <p className="text-white/40">Create your first tournament to get started.</p>
      </div>
    );
  } else {
    tournamentsContent = tournaments.map(tournament => (
      <SpotlightCard key={tournament.id} className="bg-titan-bg-card/50 border-white/5 flex flex-col h-full group hover:border-titan-purple/30">
        <div className="relative h-48 w-full rounded-xl overflow-hidden mb-5 bg-gray-900">
          <img
            src={tournament.bannerUrl || tournament.imageUrl || '/card1.avif'}
            alt={tournament.name}
            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
          <div className="absolute top-3 right-3 flex gap-2">
            <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10">{tournament.game}</span>
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="font-heading font-bold text-xl text-white truncate">{tournament.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${getTournamentStatusClass(tournament.status)}`}>{tournament.status}</span>
              <span className="text-white/40 text-[10px] uppercase">{tournament.type}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-6 flex-1 px-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/40 flex items-center gap-2"><Calendar size={14} /> Date</span>
            <span className="text-white font-medium text-xs">{new Date(tournament.startTime).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/40 flex items-center gap-2"><DollarSign size={14} /> Entry</span>
            <span className="text-titan-purple font-bold">₹{tournament.entryFee / 100}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/40 flex items-center gap-2"><Trophy size={14} /> Prize</span>
            <span className="text-green-400 font-bold">₹{tournament.prizePool / 100}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/40 flex items-center gap-2"><Users size={14} /> Joined</span>
            <span className="text-titan-cyan font-bold">
              {Number(tournament.currentParticipants || 0)} / {Number(tournament.maxParticipants || tournament.minTeamsRequired || 0)}
            </span>
          </div>
        </div>

        {canModifyTournament(tournament) && (
          <div className="flex gap-2 pt-4 border-t border-white/5 mt-auto">
            <button onClick={() => handleEdit(tournament.id)} className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-blue-500/20 text-white/60 hover:text-blue-400 font-medium text-sm transition-all flex items-center justify-center gap-2">
              <Pen size={14} /> Edit
            </button>
            <button onClick={() => handleDelete(tournament.id)} className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 font-medium text-sm transition-all flex items-center justify-center gap-2">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </SpotlightCard>
    ));
  }

  return (
    <Layout userRole={isAdminUser ? 'ADMIN' : 'HOST'}>
      <div className="min-h-screen bg-titan-bg py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h1 className="font-display text-4xl font-bold mb-4">
              Manage <GradientText>Tournaments</GradientText>
            </h1>
            <p className="text-white/40 text-lg">Create, update, and monitor tournament events.</p>
          </div>

          {user?.hostTrust && !isAdminUser && (
            <div className="mb-8 rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-white/70">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div>
                  <p className="font-semibold text-white">Host Trust Level: {user.hostTrust.label}</p>
                  <p className="text-white/50">
                    Completed tournaments: {user.hostTrust.completedTournaments} • Approval mode: {getApprovalModeLabel(user.hostTrust.activationMode)}
                  </p>
                </div>
                <div className="text-white/50">
                  {user.hostTrust.level === 0 && 'Trial hosts must stay within low entry limits and await manual review.'}
                  {user.hostTrust.level === 1 && 'Trial passed: small tournaments may auto-activate; larger ones need review.'}
                  {user.hostTrust.level === 2 && 'Verified hosts auto-activate tournaments, subject to platform monitoring.'}
                </div>
              </div>
            </div>
          )}

          <div className="mb-12">
            <SpotlightCard className="bg-titan-bg-card border-white/10 p-8">
              <h2 className="font-heading text-2xl font-bold text-white mb-6 flex items-center gap-2">
                {editing ? <Pen className="text-titan-purple" /> : <Plus className="text-titan-purple" />}
                {editing ? 'Edit Tournament' : 'Create New Tournament'}
              </h2>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="tournament-name" className="block text-sm font-medium text-white/60 mb-1">Tournament Name</label>
                    <input id="tournament-name" type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-titan-purple focus:outline-none transition-colors" placeholder="e.g. Summer Championship 2024" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="game-title" className="block text-sm font-medium text-white/60 mb-1">Game Title</label>
                      <div className="relative">
                        <Gamepad2 className="absolute left-3 top-3.5 text-white/40" size={18} />
                        <select id="game-title" name="game" value={formData.game} onChange={handleChange} required className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:border-titan-purple focus:outline-none appearance-none cursor-pointer">
                          <option value="" disabled className="bg-gray-900">Select Game</option>
                          {games.map(game => (<option key={game.id} value={game.name} className="bg-gray-900">{game.name}</option>))}
                          <option value="Other" className="bg-gray-900">Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="team-format" className="block text-sm font-medium text-white/60 mb-1">Team Format</label>
                      <select id="team-format" name="type" value={formData.type} onChange={handleChange} required className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-titan-purple focus:outline-none appearance-none cursor-pointer">
                        <option value="SOLO" className="bg-gray-900">Solo</option>
                        <option value="DUO" className="bg-gray-900">Duo</option>
                        <option value="SQUAD" className="bg-gray-900">Squad</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="bracket-format" className="block text-sm font-medium text-white/60 mb-1">Bracket Format</label>
                    <select id="bracket-format" name="format" value={formData.format} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-titan-purple focus:outline-none appearance-none cursor-pointer">
                      <option value="SINGLE_ELIMINATION" className="bg-gray-900">Single Elimination</option>
                      <option value="DOUBLE_ELIMINATION" className="bg-gray-900">Double Elimination</option>
                      <option value="ROUND_ROBIN" className="bg-gray-900">Round Robin</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="start-time" className="block text-sm font-medium text-white/60 mb-1">Start Date & Time</label>
                      <input id="start-time" type="datetime-local" name="startTime" value={formData.startTime} onChange={handleChange} required className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-titan-purple focus:outline-none" />
                    </div>
                    <div>
                      <label htmlFor="duration-days" className="block text-sm font-medium text-white/60 mb-1">Duration</label>
                      <select
                        id="duration-days"
                        name="durationDays"
                        value={formData.durationDays}
                        onChange={handleChange}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-titan-purple focus:outline-none appearance-none cursor-pointer"
                      >
                        <option value={1} className="bg-gray-900">1 Day</option>
                        <option value={3} className="bg-gray-900">3 Days</option>
                        <option value={5} className="bg-gray-900">5 Days</option>
                        <option value={7} className="bg-gray-900">1 Week</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="max-players" className="block text-sm font-medium text-white/60 mb-1">Max Players</label>
                      <input id="max-players" type="number" name="maxParticipants" value={formData.maxParticipants} onChange={handleChange} required className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-titan-purple focus:outline-none" placeholder="100" />
                    </div>
                  </div>

                  <p className="text-xs text-white/50">
                    {endDatePreview
                      ? `Estimated end: ${endDatePreview.toLocaleString()}`
                      : 'Select a start date to preview estimated end time.'}
                  </p>

                  <div>
                    <label htmlFor="banner-file" className="block text-sm font-medium text-white/60 mb-1">Tournament Banner</label>
                    <div className="space-y-3">
                      {(bannerPreview || currentBanner) && (
                        <div className="rounded-lg overflow-hidden h-32 bg-black/40 border border-white/10">
                          <img src={bannerPreview || currentBanner} alt="Banner Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 border border-white/10 hover:border-titan-purple cursor-pointer transition-colors w-full">
                        <Plus size={18} className="text-titan-purple" />
                        <span className="text-sm text-white">{bannerFile ? bannerFile.name : 'Choose Banner Image'}</span>
                        <input id="banner-file" type="file" accept="image/*" onChange={handleBannerSelect} className="hidden" />
                      </label>
                      <p className="text-xs text-white/40">The banner will be attached when you save the tournament.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="entry-fee" className="block text-sm font-medium text-white/60 mb-1">Entry Fee (₹)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3.5 text-white/40" size={18} />
                        <input id="entry-fee" type="number" name="entryFee" value={formData.entryFee} onChange={handleChange} required className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:border-titan-purple focus:outline-none" placeholder="0" />
                      </div>
                    </div>
                    {isAdminUser && (
                      <div>
                        <label htmlFor="prize-pool" className="block text-sm font-medium text-white/60 mb-1">Prize Pool (₹)</label>
                        <div className="relative">
                          <Trophy className="absolute left-3 top-3.5 text-white/40" size={18} />
                          <input
                            id="prize-pool"
                            type="number"
                            name="prizePool"
                            value={formData.prizePool}
                            onChange={handleChange}
                            required
                            className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:border-titan-purple focus:outline-none"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="tournament-description" className="block text-sm font-medium text-white/60 mb-1">Rules & Description</label>
                    <textarea id="tournament-description" name="description" value={formData.description} onChange={handleChange} required rows="4" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-titan-purple focus:outline-none resize-none" placeholder="Tournament rules, prize distribution, etc." />
                    {!isAdminUser && (
                      <p className="text-xs text-amber-300/80 mt-2">Prize pool is managed by the platform for host-created tournaments.</p>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-white/5">
                  {editing && (
                    <button type="button" onClick={resetForm} className="px-6 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
                  )}
                  <button type="submit" className="btn-neon px-8 py-2 flex items-center gap-2">
                    {editing ? <Pen size={18} /> : <Plus size={18} />}
                    {editing ? 'Update Tournament' : 'Create Tournament'}
                  </button>
                </div>
              </form>
            </SpotlightCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {tournamentsContent}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ManageTournamentsPage;
