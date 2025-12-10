import React, { useState, useEffect } from 'react';
import '@fontsource/poppins';
import { FaTrophy, FaSignOutAlt, FaSun, FaMoon, FaTwitter, FaInstagram, FaFacebookF, FaYoutube } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import axios from 'axios';

const LeaderboardPage = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [players, setPlayers] = useState([]);  // Ensure players is an empty array by default
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const tournamentId = 1; // Replace with actual tournamentId or pass it dynamically
        const response = await axios.get(`http://localhost:8080/api/player/view-leaderboard/${tournamentId}`);
        if (response.data && response.data.data) {
          setPlayers(response.data.data);  // Set players data
        } else {
          setError("No data found");
        }
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch leaderboard data');
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className={`${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-black'} font-poppins min-h-screen flex flex-col transition-colors duration-300`}>
      {/* 🌐 Navbar */}
      <nav className={`${darkMode ? 'bg-gray-900' : 'bg-gray-100'} shadow-md py-4 px-8 flex justify-between items-center`}>
        <div className="flex items-center space-x-3">
          <FaTrophy className={`text-3xl ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>Leaderboard</h1>
        </div>
        <div className="space-x-6 flex items-center">
          <Link to="/viewTourn" className={`transition ${darkMode ? 'text-white hover:text-yellow-400' : 'text-gray-800 hover:text-yellow-600'}`}>View Tournaments</Link>
          <Link to="/userPaidTourn" className={`transition ${darkMode ? 'text-white hover:text-yellow-400' : 'text-gray-800 hover:text-yellow-600'}`}>Paid Tournaments</Link>
          <Link to="/leaderboard" className={`transition ${darkMode ? 'text-yellow-400' : 'text-gray-800 hover:text-yellow-600'}`}>Leaderboard</Link>
          <Link to="/profile" className={`transition ${darkMode ? 'text-white hover:text-yellow-400' : 'text-gray-800 hover:text-yellow-600'}`}>Profile</Link>
          <button onClick={() => setDarkMode(!darkMode)} className="ml-4 p-2 rounded-full border border-gray-400">
            {darkMode ? <FaSun className="text-yellow-300" /> : <FaMoon className="text-gray-800" />}
          </button>
        </div>
      </nav>

      {/* 🏆 Leaderboard Section */}
      <section className={`py-16 px-8 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-black'}`}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Top Players</h2>
          {loading ? (
            <div className="text-center text-xl">Loading leaderboard...</div>
          ) : error ? (
            <div className="text-center text-red-500">{error}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {Array.isArray(players) && players.length > 0 ? (
                players.map((player) => (
                  <div key={player.rank} className="bg-gray-700 p-6 rounded-lg shadow-lg flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-yellow-400">#{player.rank}</div>
                      <div className="text-lg font-semibold">{player.fullName}</div>
                    </div>
                    <div className="text-xl font-bold">{player.prizeAmount} pts</div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500">No leaderboard data available.</div>
              )}
            </div>
          )}
        </div>
      </section>

       {/* 📎 Footer */}
                  <footer className={`${darkMode ? 'bg-gray-900' : 'bg-gray-100'} py-8 mt-12 border-t border-gray-800`}>
                    <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
                      <div className="text-center md:text-left mb-4 md:mb-0">
                        <h3 className={`text-2xl font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>Titan E-sports</h3>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>© 2025 Titan E-sports. All rights reserved.</p>
                      </div>
                      <div className="flex space-x-6">
                        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className={`transition text-xl ${darkMode ? 'text-gray-400 hover:text-yellow-400' : 'text-gray-600 hover:text-yellow-600'}`}>
                          <FaTwitter />
                        </a>
                        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className={`transition text-xl ${darkMode ? 'text-gray-400 hover:text-yellow-400' : 'text-gray-600 hover:text-yellow-600'}`}>
                          <FaInstagram />
                        </a>
                        <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className={`transition text-xl ${darkMode ? 'text-gray-400 hover:text-yellow-400' : 'text-gray-600 hover:text-yellow-600'}`}>
                          <FaFacebookF />
                        </a>
                        <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className={`transition text-xl ${darkMode ? 'text-gray-400 hover:text-yellow-400' : 'text-gray-600 hover:text-yellow-600'}`}>
                          <FaYoutube />
                        </a>
                      </div>
                    </div>
                  </footer>
    </div>
  );
};

export default LeaderboardPage;
