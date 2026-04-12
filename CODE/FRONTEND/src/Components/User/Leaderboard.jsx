/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import React, { useState, useEffect } from 'react';
import { FaTrophy, FaSun, FaMoon, FaTwitter, FaInstagram, FaFacebookF, FaYoutube } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import api from '../../lib/api';

const byTheme = (isDark, darkClass, lightClass) => (isDark ? darkClass : lightClass);

const LeaderboardPage = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [players, setPlayers] = useState([]);  // Ensure players is an empty array by default
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerClass = `${byTheme(darkMode, 'bg-gray-950 text-white', 'bg-white text-black')} font-poppins min-h-screen flex flex-col transition-colors duration-300`;
  const navClass = `${byTheme(darkMode, 'bg-gray-900', 'bg-gray-100')} shadow-md py-4 px-8 flex justify-between items-center`;
  const sectionClass = `py-16 px-8 ${byTheme(darkMode, 'bg-gray-900 text-white', 'bg-gray-100 text-black')}`;
  const footerClass = `${byTheme(darkMode, 'bg-gray-900', 'bg-gray-100')} py-8 mt-12 border-t border-gray-800`;
  const titleClass = `text-2xl font-bold ${byTheme(darkMode, 'text-yellow-400', 'text-yellow-600')}`;
  const navLinkClass = `transition ${byTheme(darkMode, 'text-white hover:text-yellow-400', 'text-gray-800 hover:text-yellow-600')}`;
  const activeLinkClass = `transition ${byTheme(darkMode, 'text-yellow-400', 'text-gray-800 hover:text-yellow-600')}`;
  const socialClass = `transition text-xl ${byTheme(darkMode, 'text-gray-400 hover:text-yellow-400', 'text-gray-600 hover:text-yellow-600')}`;
  const footerTitleClass = `text-2xl font-bold ${byTheme(darkMode, 'text-yellow-400', 'text-yellow-600')}`;
  const footerTextClass = `text-sm ${byTheme(darkMode, 'text-gray-400', 'text-gray-600')}`;

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await api.get('/stats/leaderboard?limit=50');
        if (response.data?.data) {
          const normalized = (response.data.data || []).map((player, index) => ({
            rank: player.rank || index + 1,
            fullName: player.username || player.name || 'Player',
            prizeAmount: player.points || player.score || 0,
          }));
          setPlayers(normalized);
        } else {
          setError("No data found");
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard data:', err);
        setError('Failed to fetch leaderboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const renderLeaderboardContent = () => {
    if (loading) {
      return <div className="text-center text-xl">Loading leaderboard...</div>;
    }

    if (error) {
      return <div className="text-center text-red-500">{error}</div>;
    }

    if (!Array.isArray(players) || players.length === 0) {
      return <div className="text-center text-gray-500">No leaderboard data available.</div>;
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {players.map((player) => (
          <div key={player.rank} className="bg-gray-700 p-6 rounded-lg shadow-lg flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold text-yellow-400">#{player.rank}</div>
              <div className="text-lg font-semibold">{player.fullName}</div>
            </div>
            <div className="text-xl font-bold">{player.prizeAmount} pts</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={containerClass}>
      {/* 🌐 Navbar */}
      <nav className={navClass}>
        <div className="flex items-center space-x-3">
          <FaTrophy className={`text-3xl ${byTheme(darkMode, 'text-yellow-400', 'text-yellow-600')}`} />
          <h1 className={titleClass}>Leaderboard</h1>
        </div>
        <div className="space-x-6 flex items-center">
          <Link to="/viewTourn" className={navLinkClass}>View Tournaments</Link>
          <Link to="/userPaidTourn" className={navLinkClass}>Paid Tournaments</Link>
          <Link to="/leaderboard" className={activeLinkClass}>Leaderboard</Link>
          <Link to="/profile" className={navLinkClass}>Profile</Link>
          <button onClick={() => setDarkMode(!darkMode)} className="ml-4 p-2 rounded-full border border-gray-400">
            {darkMode ? <FaSun className="text-yellow-300" /> : <FaMoon className="text-gray-800" />}
          </button>
        </div>
      </nav>

      {/* 🏆 Leaderboard Section */}
      <section className={sectionClass}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Top Players</h2>
          {renderLeaderboardContent()}
        </div>
      </section>

      {/* 📎 Footer */}
      <footer className={footerClass}>
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <h3 className={footerTitleClass}>Titan E-sports</h3>
            <p className={footerTextClass}>© 2025 Titan E-sports. All rights reserved.</p>
          </div>
          <div className="flex space-x-6">
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className={socialClass}>
              <FaTwitter />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className={socialClass}>
              <FaInstagram />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className={socialClass}>
              <FaFacebookF />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className={socialClass}>
              <FaYoutube />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LeaderboardPage;
