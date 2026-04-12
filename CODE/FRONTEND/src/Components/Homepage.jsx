/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../lib/api';
import toast from 'react-hot-toast';

import { useAuth } from '../Context/AuthContext';
import StableCard from './StableCard';
import {
  FaTrophy, FaUsers, FaSun, FaMoon,
  FaTwitter,
  FaInstagram, FaFacebookF, FaYoutube,
  FaGamepad, FaCrown, FaFire, FaStar,
  FaCalendarAlt, FaClock, FaPlay, FaQuoteLeft
} from 'react-icons/fa';

const HomePage = () => {
  const aboutRef = useRef(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const [darkMode, setDarkMode] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false); // 🆕
  const [cardsLoaded, setCardsLoaded] = useState(false);
  const [upcomingTournaments, setUpcomingTournaments] = useState([]);
  const [topPlayers, setTopPlayers] = useState([]);

  const [selectedRole, setSelectedRole] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [registerFullName, setRegisterFullName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerMobile, setRegisterMobile] = useState('');
  const [registerFile, setRegisterFile] = useState(null);

  const [forgotEmail, setForgotEmail] = useState(''); // 🆕
  const [forgotNewPassword, setForgotNewPassword] = useState(''); // 🆕
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState(''); // 🆕

  const [loading, setLoading] = useState(false);

  // Ensure cards load properly
  useEffect(() => {
    const timer = setTimeout(() => {
      setCardsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchHomepageData = async () => {
      try {
        const [tournamentRes, leaderboardRes] = await Promise.all([
          api.get('/tournaments'),
          api.get('/stats/leaderboard?limit=6')
        ]);

        const tournamentList = Array.isArray(tournamentRes.data?.data)
          ? tournamentRes.data.data
          : [];
        const leaderboardList = Array.isArray(leaderboardRes.data?.data)
          ? leaderboardRes.data.data
          : [];

        setUpcomingTournaments(tournamentList.slice(0, 3));
        setTopPlayers(leaderboardList.slice(0, 6));
      } catch (error) {
        console.error('Failed to load homepage live data:', error);
        setUpcomingTournaments([]);
        setTopPlayers([]);
      }
    };

    fetchHomepageData();
  }, []);

  const handleScrollToAbout = () => {
    if (aboutRef.current) {
      aboutRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };


  const roles = [
    { label: 'Player', value: 'PLAYER' },
    { label: 'Host', value: 'HOST' }
  ];

  const getPlayerCardClass = (rankIndex) => {
    if (rankIndex === 0) return 'from-yellow-500/20 to-orange-500/20 border-yellow-400';
    if (rankIndex === 1) return 'from-gray-400/20 to-gray-500/20 border-gray-400';
    if (rankIndex === 2) return 'from-orange-600/20 to-orange-700/20 border-orange-600';
    return 'from-gray-700/20 to-gray-800/20 border-gray-600';
  };



  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    // Validate inputs
    if (!loginEmail || !loginPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    const loginData = {
      email: loginEmail,
      password: loginPassword
    };

    try {
      setLoading(true);
      console.log("Attempting login with:", loginData);
      const response = await api.post("/auth/login", loginData);
      console.log("Login response:", response.data);

      // Check if the login is successful and save data using AuthContext
      if (response.data?.success && response.data?.data) {
        const userData = response.data.data.user;
        const userRole = userData?.role;
        const token = response.data.data.accessToken;

        console.log("Login successful, user data:", userData);
        console.log("User role:", userRole);
        console.log("Token:", token);

        // Use AuthContext login method
        login(userData, token);

        console.log(`User data stored via AuthContext:`, userData);
        toast.success(`Login successful!`);

        setTimeout(() => {
          console.log("Navigating to:", userRole);
          if (userRole === 'ADMIN' || userRole === 'SUPERADMIN') {
            navigate('/admin');
          } else if (userRole === 'HOST') {
            navigate('/host');
          } else if (userRole === 'PLAYER') {
            navigate('/dashboard');
          }
        }, 1500);

        setLoginEmail('');
        setLoginPassword('');
      } else {
        console.log("Login failed - response:", response.data);
        toast.error(response.data?.message || "Login failed");
      }

    } catch (error) {
      console.error("Login Failed - Full error:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error message:", error.message);
      const errorMessage = error.response?.data?.message || "Login failed! Please check your credentials.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };




  // 🆕 Register Submit Function
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    // Validate all required fields
    if (!registerFullName || !registerEmail || !registerPassword || !registerMobile) {
      toast.warn("Please fill in all required fields!");
      return;
    }

    if (!selectedRole) {
      toast.warn("Please select a role before registering!");
      return;
    }

    if (!registerFile) {
      toast.warn("Please upload a file (image)!");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerEmail)) {
      toast.warn("Please enter a valid email address!");
      return;
    }

    // Validate password length
    if (registerPassword.length < 6) {
      toast.warn("Password must be at least 6 characters long!");
      return;
    }

    toast('Registration moved to the new auth flow. Redirecting...');
    setShowModal(false);
    navigate('/auth');
  };

  // 🆕 Forgot Password Submit Function
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();

    // Backend flow is email-based reset initiation from this screen.
    if (!forgotEmail) {
      toast.warn("Please enter your email!");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail)) {
      toast.warn("Please enter a valid email address!");
      return;
    }

    const forgotData = { email: forgotEmail };

    try {
      setLoading(true);
      const response = await api.post("/auth/forgot-password", forgotData);

      if (response.data?.success) {
        console.log("Password Reset Successful", response.data);
        toast.success("Password reset instructions sent to your email.");

        setShowForgotModal(false);
        setForgotEmail('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
      } else {
        toast.error(response.data?.message || "Password reset failed");
      }

    } catch (error) {
      console.error("Password Reset Failed:", error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || "Password reset failed! Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className={`${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-black'} font-poppins min-h-screen flex flex-col transition-colors duration-300`}>


      {/* 🎮 Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>

        {/* Floating Gaming Elements */}
        <div className="absolute top-20 left-10 animate-bounce">
          <FaGamepad className="text-yellow-400 text-4xl opacity-30" />
        </div>
        <div className="absolute top-40 right-20 animate-pulse">
          <FaTrophy className="text-blue-400 text-3xl opacity-30" />
        </div>
        <div className="absolute bottom-40 left-20 animate-bounce delay-1000">
          <FaCrown className="text-purple-400 text-3xl opacity-30" />
        </div>

        {/* Navbar */}
        <nav className="absolute top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-md border-b border-gray-800/50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <FaGamepad className="text-3xl text-yellow-400" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Titan Esports
              </h1>
            </div>
            <div className="space-x-6 flex items-center">
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-semibold rounded-lg hover:from-yellow-400 hover:to-orange-400 transition-all duration-300 transform hover:scale-105"
              >
                Register
              </button>
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-6 py-2 border-2 border-yellow-400 text-yellow-400 font-semibold rounded-lg hover:bg-yellow-400 hover:text-black transition-all duration-300"
              >
                Login
              </button>
              <button
                onClick={handleScrollToAbout}
                className="text-gray-300 hover:text-yellow-400 transition-colors duration-300"
              >
                About
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full border border-gray-600 hover:border-yellow-400 transition-colors duration-300"
              >
                {darkMode ? <FaSun className="text-yellow-300" /> : <FaMoon className="text-gray-300" />}
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-6xl mx-auto px-6 pt-24">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-6xl md:text-8xl font-bold mb-6">
              <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                Titan Esports
              </span>
            </h1>
            <p className="text-2xl md:text-3xl text-gray-300 mb-8 font-light">
              Battle Like a Pro
            </p>
            <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
              Join the ultimate competitive gaming platform. Host tournaments, compete with champions,
              and climb the leaderboards in the most intense esports battles.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowModal(true)}
                className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold text-lg rounded-xl hover:from-yellow-400 hover:to-orange-400 transition-all duration-300 shadow-2xl hover:shadow-yellow-500/25"
              >
                <FaGamepad className="inline mr-3" />
                Register as Player
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowModal(true)}
                className="px-8 py-4 border-2 border-blue-400 text-blue-400 font-bold text-lg rounded-xl hover:bg-blue-400 hover:text-black transition-all duration-300 shadow-2xl hover:shadow-blue-400/25"
              >
                <FaTrophy className="inline mr-3" />
                Host Tournament
              </motion.button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-400 mb-2">100+</div>
                <div className="text-gray-400">Tournaments Hosted</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-400 mb-2">10,000+</div>
                <div className="text-gray-400">Active Players</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-400 mb-2">$50K+</div>
                <div className="text-gray-400">Prize Pool</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 🔐 Register Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`rounded-xl p-8 w-full max-w-md ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'} shadow-2xl relative`}
          >
            <button onClick={() => setShowModal(false)} className="absolute top-2 right-4 text-2xl font-bold">×</button>
            <h2 className="text-2xl font-bold text-center mb-6">Create Your Account</h2>

            <form className="space-y-4" onSubmit={handleRegisterSubmit}>
              <input
                type="file"
                className="w-full border rounded p-2"
                accept="image/*"
                onChange={(e) => setRegisterFile(e.target.files[0])}
                required
              />
              <input
                type="text"
                placeholder="Full Name"
                className="w-full border rounded p-2 text-black"
                value={registerFullName}
                onChange={(e) => setRegisterFullName(e.target.value)}
                required
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full border rounded p-2 text-black"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full border rounded p-2 text-black"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                required
              />
              <input
                type="tel"
                placeholder="Mobile Number"
                className="w-full border rounded p-2 text-black"
                value={registerMobile}
                onChange={(e) => setRegisterMobile(e.target.value)}
                required
              />
              <div className="flex justify-between gap-2">
                {roles.map((role) => (
                  (() => {
                    const roleClass = selectedRole === role.value
                      ? 'bg-yellow-400 text-black'
                      : (darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800');

                    return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setSelectedRole(role.value)}
                    className={`flex-1 py-2 rounded-lg font-semibold border transition ${roleClass}`}
                  >
                    {role.label}
                  </button>
                    );
                  })()
                ))}
              </div>

              <button
                type="submit"
                className={`w-full py-2 rounded font-semibold flex items-center justify-center ${darkMode ? 'bg-yellow-400 text-black hover:bg-yellow-500' : 'bg-yellow-600 text-white hover:bg-yellow-700'}`}
                disabled={loading}
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 mr-3 border-t-2 border-b-2 border-gray-900 rounded-full" viewBox="0 0 24 24"></svg>
                ) : (
                  'Register'
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}


      {/* 🔐 Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`rounded-xl p-8 w-full max-w-md ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'} shadow-2xl relative`}
          >
            <button onClick={() => setShowLoginModal(false)} className="absolute top-2 right-4 text-2xl font-bold">×</button>
            <h2 className="text-2xl font-bold text-center mb-6">Login</h2>

            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              <input
                type="email"
                placeholder="Email"
                className="w-full border rounded p-2 text-black"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full border rounded p-2 text-black"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />

              {/* 🆕 Forgot Password Link */}
              <button
                type="button"
                className="block w-full text-center text-sm text-yellow-400 hover:underline"
                onClick={() => {
                  setShowForgotModal(true);
                  setShowLoginModal(false);
                }}
              >
                Forgot Password?
              </button>

              <button
                type="submit"
                className={`w-full py-2 rounded font-semibold flex items-center justify-center ${darkMode ? 'bg-yellow-400 text-black hover:bg-yellow-500' : 'bg-yellow-600 text-white hover:bg-yellow-700'}`}
                disabled={loading}
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 mr-3 border-t-2 border-b-2 border-gray-900 rounded-full" viewBox="0 0 24 24"></svg>
                ) : (
                  'Login'
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* 🔐 Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`rounded-xl p-8 w-full max-w-md ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'} shadow-2xl relative`}
          >
            <button onClick={() => setShowForgotModal(false)} className="absolute top-2 right-4 text-2xl font-bold">×</button>
            <h2 className="text-2xl font-bold text-center mb-6">Reset Password</h2>

            <form className="space-y-4" onSubmit={handleForgotPasswordSubmit}>
              <input
                type="email"
                placeholder="Email"
                className="w-full border rounded p-2 text-black"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="New Password"
                className="w-full border rounded p-2 text-black"
                value={forgotNewPassword}
                onChange={(e) => setForgotNewPassword(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Confirm Password"
                className="w-full border rounded p-2 text-black"
                value={forgotConfirmPassword}
                onChange={(e) => setForgotConfirmPassword(e.target.value)}
                required
              />

              <button
                type="submit"
                className={`w-full py-2 rounded font-semibold flex items-center justify-center ${darkMode ? 'bg-yellow-400 text-black hover:bg-yellow-500' : 'bg-yellow-600 text-white hover:bg-yellow-700'}`}
                disabled={loading}
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 mr-3 border-t-2 border-b-2 border-gray-900 rounded-full" viewBox="0 0 24 24"></svg>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}



      {/* 🎮 Features Section */}
      <section className="py-24 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Why Choose Titan?
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Experience the ultimate competitive gaming platform with cutting-edge features
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <FaGamepad className="text-5xl" />,
                title: "Host Tournaments",
                description: "Create and manage competitive events with professional tools and real-time analytics.",
                color: "from-yellow-500 to-orange-500",
                hoverColor: "hover:shadow-yellow-500/25"
              },
              {
                icon: <FaTrophy className="text-5xl" />,
                title: "Track Leaderboards",
                description: "Real-time rankings, statistics, and performance tracking for every player.",
                color: "from-blue-500 to-purple-500",
                hoverColor: "hover:shadow-blue-500/25"
              },
              {
                icon: <FaUsers className="text-5xl" />,
                title: "Join Competitions",
                description: "Compete globally with fellow champions in the most intense esports battles.",
                color: "from-purple-500 to-pink-500",
                hoverColor: "hover:shadow-purple-500/25"
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.2 }}
                whileHover={{ scale: 1.05, rotateY: 5 }}
                className={`group relative bg-gradient-to-br ${feature.color} p-8 rounded-2xl ${feature.hoverColor} transition-all duration-300 cursor-pointer`}
              >
                <div className="absolute inset-0 bg-black/20 rounded-2xl group-hover:bg-black/10 transition-all duration-300"></div>
                <div className="relative z-10 text-center">
                  <div className="mb-6 text-white group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">{feature.title}</h3>
                  <p className="text-gray-200 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 🏆 Upcoming Tournaments Section */}
      <section className="py-24 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Upcoming Tournaments
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Don't miss out on the biggest competitive gaming events
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {cardsLoaded ? (
              upcomingTournaments.length > 0 ? upcomingTournaments.map((tournament, i) => (
              <StableCard
                key={`tournament-${tournament.id || tournament.name}`}
                delay={i * 100}
                animationType="fadeIn"
                className="group relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:border-yellow-400/50 hover:scale-105 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                    {tournament.status || 'Upcoming'}
                  </div>
                  <FaFire className="text-yellow-400 text-lg" />
                </div>

                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors duration-300">
                  {tournament.name}
                </h3>
                <p className="text-gray-400 mb-4">{tournament.game || 'Esports'}</p>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-gray-300">
                    <FaCalendarAlt className="mr-2 text-yellow-400" />
                    {tournament.startTime ? new Date(tournament.startTime).toLocaleDateString() : 'TBA'}
                  </div>
                  <div className="flex items-center text-gray-300">
                    <FaClock className="mr-2 text-yellow-400" />
                    {tournament.startTime ? new Date(tournament.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA'}
                  </div>
                  <div className="flex items-center text-gray-300">
                    <FaTrophy className="mr-2 text-yellow-400" />
                    Prize: ₹{Number(tournament.prizePool || 0).toLocaleString()}
                  </div>
                  <div className="flex items-center text-gray-300">
                    <FaUsers className="mr-2 text-yellow-400" />
                    {Number(tournament.maxParticipants || 0)} Players
                  </div>
                </div>

                <button className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-orange-400 transition-all duration-300 transform hover:scale-105">
                  <FaPlay className="inline mr-2" />
                  Join Tournament
                </button>
              </StableCard>
            )) : (
              <div className="col-span-full rounded-2xl border border-dashed border-gray-700 p-10 text-center text-gray-400">
                Live tournament data is not available right now.
              </div>
            )
            ) : (
              // Loading skeleton
              ['tour-a', 'tour-b', 'tour-c'].map((skeletonKey) => (
                <div key={skeletonKey} className="bg-gray-800/50 rounded-2xl p-6 animate-pulse">
                  <div className="h-4 bg-gray-700 rounded mb-4"></div>
                  <div className="h-6 bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-700 rounded"></div>
                    <div className="h-3 bg-gray-700 rounded"></div>
                    <div className="h-3 bg-gray-700 rounded"></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 🏅 Leaderboards Section */}
      <section className="py-24 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Top Players
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              The champions who dominate the competitive scene
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cardsLoaded ? (
              topPlayers.length > 0 ? topPlayers.map((player, i) => (
              <StableCard
                key={`player-${player.userId || player.username || player.name || i}`}
                delay={i * 100}
                animationType="slideIn"
                className={`group relative bg-gradient-to-br ${getPlayerCardClass(i)} border rounded-2xl p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-3xl">🏆</div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{player.username || player.name || 'Player'}</h3>
                      <p className="text-sm text-gray-400">Rank #{player.rank || i + 1}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-yellow-400">{Number(player.points || player.score || 0).toLocaleString()}</div>
                    <div className="text-sm text-gray-400">Points</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-green-400">{Number(player.wins || 0)}</div>
                    <div className="text-sm text-gray-400">Wins</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-red-400">{Number(player.losses || 0)}</div>
                    <div className="text-sm text-gray-400">Losses</div>
                  </div>
                </div>
              </StableCard>
            )) : (
              <div className="col-span-full rounded-2xl border border-dashed border-gray-700 p-10 text-center text-gray-400">
                Live leaderboard data is not available right now.
              </div>
            )
            ) : (
              // Loading skeleton for leaderboard
              ['leader-a', 'leader-b', 'leader-c', 'leader-d', 'leader-e', 'leader-f'].map((skeletonKey) => (
                <div key={skeletonKey} className="bg-gray-800/50 rounded-2xl p-6 animate-pulse">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-700 rounded"></div>
                      <div>
                        <div className="h-4 bg-gray-700 rounded mb-1"></div>
                        <div className="h-3 bg-gray-700 rounded w-16"></div>
                      </div>
                    </div>
                    <div className="h-6 bg-gray-700 rounded w-12"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-4 bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-700 rounded"></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 💬 Testimonials Section */}
      <section className="py-24 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                What Players Say
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Join thousands of satisfied players and hosts
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {cardsLoaded ? (
              <div className="col-span-full rounded-2xl border border-dashed border-gray-700 p-10 text-center text-gray-400">
                Player testimonials will appear here once community feedback is published.
              </div>
            ) : (
              // Loading skeleton for testimonials
              ['test-a', 'test-b', 'test-c'].map((skeletonKey) => (
                <div key={skeletonKey} className="bg-gray-800/50 rounded-2xl p-8 animate-pulse">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-gray-700 rounded mr-4"></div>
                    <div>
                      <div className="h-4 bg-gray-700 rounded mb-2"></div>
                      <div className="h-3 bg-gray-700 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="flex mb-4">
                    <div className="h-3 bg-gray-700 rounded w-16"></div>
                  </div>
                  <div className="h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded"></div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 🧠 About Section */}
      <section ref={aboutRef} id="about" className="py-24 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                About Titan Esports
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Your digital battleground for competitive gaming excellence
            </p>
          </div>

          <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-lg rounded-3xl p-12 border border-gray-700/50">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                    <FaTrophy className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Tournament Excellence</h3>
                    <p className="text-gray-300">We bring the best together with professional tournament management, real-time analytics, and seamless player coordination.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <FaCrown className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Leaderboard Mastery</h3>
                    <p className="text-gray-300">Track every move, win, and statistic in real-time. Our advanced ranking system keeps the competitive fire alive.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                    <FaUsers className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Global Community</h3>
                    <p className="text-gray-300">Join players from around the world in the most intense esports battles. Competition without borders.</p>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl blur-xl"></div>
                <div className="relative bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
                  <h3 className="text-2xl font-bold text-white mb-6 text-center">Platform Stats</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-yellow-400 mb-2">100+</div>
                      <div className="text-gray-400 text-sm">Active Tournaments</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-400 mb-2">10K+</div>
                      <div className="text-gray-400 text-sm">Registered Players</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-400 mb-2">50+</div>
                      <div className="text-gray-400 text-sm">Countries</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-400 mb-2">$100K+</div>
                      <div className="text-gray-400 text-sm">Prize Pool</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🚀 CTA Section */}
      <section className="py-24 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Ready to Compete?
            </span>
          </h2>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            Join the ultimate competitive gaming platform and start your journey to esports greatness.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowModal(true)}
              className="px-12 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold text-xl rounded-xl hover:from-yellow-400 hover:to-orange-400 transition-all duration-300 shadow-2xl hover:shadow-yellow-500/25"
            >
              <FaGamepad className="inline mr-3" />
              Start Playing Now
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowModal(true)}
              className="px-12 py-4 border-2 border-blue-400 text-blue-400 font-bold text-xl rounded-xl hover:bg-blue-400 hover:text-black transition-all duration-300 shadow-2xl hover:shadow-blue-400/25"
            >
              <FaTrophy className="inline mr-3" />
              Host Tournament
            </motion.button>
          </div>
        </div>
      </section>

      {/* 📎 Footer */}
      <footer className="bg-gradient-to-b from-gray-900 to-black py-16 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            {/* Brand Section */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="relative">
                  <FaGamepad className="text-3xl text-yellow-400" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  Titan Esports
                </h3>
              </div>
              <p className="text-gray-400 mb-6 max-w-md leading-relaxed">
                The ultimate competitive gaming platform where champions are made.
                Join thousands of players in the most intense esports battles.
              </p>
              <div className="flex space-x-4">
                {[
                  { icon: FaTwitter, color: "hover:text-blue-400", url: "https://twitter.com" },
                  { icon: FaInstagram, color: "hover:text-pink-400", url: "https://instagram.com" },
                  { icon: FaFacebookF, color: "hover:text-blue-500", url: "https://facebook.com" },
                  { icon: FaYoutube, color: "hover:text-red-500", url: "https://youtube.com" }
                ].map((social) => (
                  <a
                    key={social.url}
                    href={social.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`text-2xl text-gray-400 transition-all duration-300 transform hover:scale-110 ${social.color}`}
                  >
                    <social.icon />
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-bold text-white mb-6">Quick Links</h4>
              <ul className="space-y-3">
                ].map((link) => (
                  <li key={link}>
                    <button
                      type="button"
                  "Host Events",
                  "Prizes",
                  "Community"
                    </button>
                  <li key={i}>
                    <a
                      href="#"
                      className="text-gray-400 hover:text-yellow-400 transition-colors duration-300"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

                      ].map((link) => (
                        <li key={link}>
                          <button
                            type="button"
                {[
                  "Help Center",
                  "Contact Us",
                          </button>
                  "Terms of Service",
                  "Privacy Policy",
                  "Refund Policy"
                ].map((link, i) => (
                  <li key={i}>
                    <a
                      href="#"
                      className="text-gray-400 hover:text-yellow-400 transition-colors duration-300"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm mb-4 md:mb-0">
                © 2024 Titan Esports. All rights reserved.
              </p>
              <div className="flex items-center space-x-6 text-sm text-gray-400">
                <span>Made with ❤️ for gamers</span>
                <span>•</span>
                <span>Powered by React & Spring Boot</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
