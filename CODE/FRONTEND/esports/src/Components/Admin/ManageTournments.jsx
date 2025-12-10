import React, { useState, useEffect } from 'react';
import '@fontsource/poppins';
import { FaCheckCircle, FaTimesCircle, FaUsersCog, FaTrophy, FaSignOutAlt, FaSun, FaMoon, FaTwitter, FaInstagram, FaFacebookF, FaYoutube } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ManageTournamentsPage = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [tournaments, setTournaments] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setFetchLoading(true);
      const res = await axios.get('http://localhost:8080/api/admin/get-tournaments');
      setTournaments(res.data.data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      toast.error('Failed to fetch tournaments!');
    } finally {
      setFetchLoading(false);
    }
  };

  const toggleTournamentStatus = async (id, isActive) => {
    try {
      setLoadingId(id);
      await axios.put(`http://localhost:8080/api/admin/toggle-tournament-status/${id}?isActive=${isActive}`);
      toast.success(`Tournament ${isActive ? 'activated' : 'deactivated'} successfully!`);
      fetchTournaments();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to update status!');
    } finally {
      setLoadingId(null);
    }
  };

  const deleteTournament = async (id) => {
    try {
      setLoadingId(id);
      await axios.delete(`http://localhost:8080/api/admin/delete-tournament/${id}`);
      toast.success('Tournament deleted successfully!');
      fetchTournaments();
    } catch (error) {
      console.error('Error deleting tournament:', error);
      toast.error('Failed to delete tournament!');
    } finally {
      setLoadingId(null);
    }
  };

  const calculateCountdown = (startDate) => {
    const now = new Date();
    const start = new Date(startDate);
    const diff = start - now;

    if (diff <= 0) return 'Tournament started!';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <div className={`${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-black'} font-poppins min-h-screen flex flex-col transition-colors duration-300`}>
      <ToastContainer position="top-center" autoClose={3000} />

      {/* 🌐 Navbar */}
      <nav className={`${darkMode ? 'bg-gray-900' : 'bg-gray-100'} shadow-md py-4 px-8 flex justify-between items-center`}>
        <div className="flex items-center space-x-3">
          <FaTrophy className={`text-3xl ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
          <Link to={"/adminPage"}>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>Manage Tournaments</h1>
          </Link>
        </div>
        <div className="space-x-6 flex items-center">
          <Link to={"/manageUsers"}><button className="transition">Players</button></Link>
          <Link to={"/manageHosts"}><button className="transition">Hosts</button></Link>
          <Link to={"/manageTourn"}><button className="transition">Tournaments</button></Link>
          <Link to={"/manageTrans"}><button className="transition">Transactions</button></Link>
          <button onClick={() => setDarkMode(!darkMode)} className="ml-4 p-2 rounded-full border border-gray-400">{darkMode ? <FaSun /> : <FaMoon />}</button>
        </div>
      </nav>

      {/* 🧑‍💻 Header */}
      <section className="py-8 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Manage Tournaments</h2>
          <p className="text-lg leading-relaxed">Activate, deactivate or delete tournaments easily.</p>
        </div>
      </section>

      {/* 🎯 Tournament Cards */}
      <section className="py-8 px-8">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-semibold mb-4">Tournaments</h3>

          {fetchLoading ? (
            <div className="text-center py-20">
              <div className="animate-spin h-10 w-10 border-t-2 border-b-2 border-yellow-400 rounded-full mx-auto"></div>
              <p className="mt-4 text-lg font-semibold">Loading tournaments...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {tournaments.map(tournament => (
                <div key={tournament.id} className="p-6 rounded-lg shadow-lg bg-gray-700">
                  <img
                    src={tournament.imageUrl || '/public/tourn1.avif'}
                    alt={tournament.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                  <h4 className="text-xl font-semibold mb-2">{tournament.name}</h4>
                  <p className="mb-2">{tournament.description}</p>
                  <p><strong>Host ID:</strong> {tournament.hostId}</p>
                  <p><strong>Game Type:</strong> {tournament.gameType}</p>
                  <p><strong>Joining Fee:</strong> ₹{tournament.joiningFee}</p>
                  <p><strong>Start:</strong> {tournament.startDate}</p>
                  <p><strong>End:</strong> {tournament.endDate}</p>
                  <p><strong>Countdown:</strong> {calculateCountdown(tournament.startDate)}</p>
                  <p className={`font-semibold ${tournament.active ? 'text-green-400' : 'text-red-400'}`}>
                    {tournament.active ? 'Active' : 'Inactive'}
                  </p>

                  <div className="flex justify-between mt-4">
                    <button
                      onClick={() => toggleTournamentStatus(tournament.id, !tournament.active)}
                      disabled={loadingId === tournament.id}
                      className="text-green-400 hover:text-green-600"
                    >
                      {loadingId === tournament.id ? 'Updating...' : (tournament.active ? 'Deactivate' : 'Activate')}
                    </button>

                    <button
                      onClick={() => deleteTournament(tournament.id)}
                      disabled={loadingId === tournament.id}
                      className="text-red-400 hover:text-red-600"
                    >
                      {loadingId === tournament.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 📎 Footer */}
      <footer className="py-8 mt-12 border-t border-gray-800">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <h3 className="text-2xl font-bold">Titan E-sports</h3>
            <p className="text-sm">© 2025 Titan E-sports. All rights reserved.</p>
          </div>
          <div className="flex space-x-6">
            <a href="https://twitter.com" className="transition text-xl"><FaTwitter /></a>
            <a href="https://instagram.com" className="transition text-xl"><FaInstagram /></a>
            <a href="https://facebook.com" className="transition text-xl"><FaFacebookF /></a>
            <a href="https://youtube.com" className="transition text-xl"><FaYoutube /></a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ManageTournamentsPage;
