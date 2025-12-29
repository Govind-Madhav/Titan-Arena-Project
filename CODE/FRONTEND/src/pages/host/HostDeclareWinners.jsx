/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { useState } from 'react';
import {
  Trophy,
  Plus,
  Trash2,
  Save,
  Medal,
  AlertCircle
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import Layout from '../../Components/layout/Layout';
import { GradientText, SpotlightCard } from '../../Components/effects/ReactBits';

const HostDeclareWinners = () => {
  const [tournamentId, setTournamentId] = useState('');
  const [winners, setWinners] = useState([{ playerId: '', rank: '', prizeAmount: '', remarks: '' }]);
  const [loading, setLoading] = useState(false);

  // Handle input changes for winners
  const handleWinnerChange = (index, event) => {
    const { name, value } = event.target;
    const newWinners = [...winners];
    newWinners[index][name] = value;
    setWinners(newWinners);
  };

  // Add new major winner form field
  const handleAddWinner = () => {
    setWinners([
      ...winners,
      { playerId: '', rank: '', prizeAmount: '', remarks: '' },
    ]);
  };

  // Remove winner form field
  const handleRemoveWinner = (index) => {
    const newWinners = winners.filter((_, i) => i !== index);
    setWinners(newWinners);
  };

  // Handle form submission for declaring winners
  const handleDeclareWinners = async (e) => {
    e.preventDefault();

    if (!tournamentId) {
      toast.error('Please provide a tournament ID');
      return;
    }

    // Ensure all winners' details are valid
    const isValid = winners.every(
      (winner) =>
        winner.playerId &&
        winner.rank &&
        winner.prizeAmount &&
        winner.remarks
    );

    if (!isValid) {
      toast.error('Please fill in all winner details');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(
        `/tournaments/${tournamentId}/winners`,
        { winners }
      );

      if (response.data.status === 'success') {
        toast.success('Winners declared successfully!');
        setWinners([{ playerId: '', rank: '', prizeAmount: '', remarks: '' }]); // Clear form
        setTournamentId('');
      } else {
        toast.error('Failed to declare winners: ' + response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred while declaring winners');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout userRole="HOST">
      <div className="min-h-screen bg-titan-bg py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="font-display text-4xl font-bold mb-4">
              Declare <GradientText>Winners</GradientText>
            </h1>
            <p className="text-white/40 text-lg">
              Finalize tournament results and distribute prizes.
            </p>
          </div>

          <form onSubmit={handleDeclareWinners}>
            <SpotlightCard className="bg-titan-bg-card border-white/10 p-8 mb-8">
              <div className="mb-8">
                <label className="block text-sm font-medium text-white/60 mb-2">Tournament ID</label>
                <div className="relative">
                  <Trophy className="absolute left-3 top-3.5 text-white/40" size={18} />
                  <input
                    type="number"
                    value={tournamentId}
                    onChange={(e) => setTournamentId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-titan-purple focus:outline-none transition-colors"
                    placeholder="Enter Tournament ID"
                    required
                  />
                </div>
              </div>

              <div className="space-y-6">
                {winners.map((winner, index) => (
                  <div key={index} className="p-6 bg-white/5 rounded-xl border border-white/5 relative group hover:border-white/10 transition-colors">
                    <div className="absolute top-4 right-4 text-white/10 font-display text-4xl font-bold select-none">
                      #{index + 1}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                      <div>
                        <label className="block text-xs font-medium text-white/40 mb-1">Player ID</label>
                        <input
                          type="number"
                          name="playerId"
                          placeholder="Player ID"
                          value={winner.playerId}
                          onChange={(e) => handleWinnerChange(index, e)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-titan-purple focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white/40 mb-1">Rank</label>
                        <div className="relative">
                          <Medal className="absolute left-3 top-2.5 text-white/40" size={14} />
                          <input
                            type="number"
                            name="rank"
                            placeholder="Rank"
                            value={winner.rank}
                            onChange={(e) => handleWinnerChange(index, e)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-white focus:border-titan-purple focus:outline-none"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white/40 mb-1">Prize Amount</label>
                        <input
                          type="number"
                          name="prizeAmount"
                          placeholder="₹ Prize Amount"
                          value={winner.prizeAmount}
                          onChange={(e) => handleWinnerChange(index, e)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-titan-purple focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white/40 mb-1">Remarks</label>
                        <input
                          type="text"
                          name="remarks"
                          placeholder="Remarks (e.g. Winner, Runner-up)"
                          value={winner.remarks}
                          onChange={(e) => handleWinnerChange(index, e)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-titan-purple focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    {winners.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveWinner(index)}
                        className="mt-4 flex items-center gap-1 text-red-400/60 hover:text-red-400 text-sm transition-colors"
                      >
                        <Trash2 size={14} /> Remove Winner
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col md:flex-row gap-4">
                <button
                  type="button"
                  onClick={handleAddWinner}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-white transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Add Another Winner
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-neon py-3 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={18} /> Submit Results
                    </>
                  )}
                </button>
              </div>
            </SpotlightCard>
          </form>

          <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <AlertCircle className="text-yellow-500 shrink-0" size={20} />
            <p className="text-sm text-yellow-200/80">
              <strong>Note:</strong> Submitting these results will finalize the tournament. Ensure all ranks and prizes are correct before proceeding.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HostDeclareWinners;
