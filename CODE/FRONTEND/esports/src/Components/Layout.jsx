import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import { 
  FaGamepad, FaTrophy, FaUsers, FaSun, FaMoon, FaSignOutAlt,
  FaTwitter, FaInstagram, FaFacebookF, FaYoutube, FaCrown,
  FaUserCog, FaCalendarAlt, FaDollarSign, FaChartBar
} from 'react-icons/fa';
import { motion } from 'framer-motion';

const Layout = ({ children, userRole }) => {
  const [darkMode, setDarkMode] = useState(true);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Navigation items based on user role
  const getNavigationItems = () => {
    switch (userRole) {
      case 'ADMIN':
        return [
          { path: '/adminPage', label: 'Dashboard', icon: FaChartBar },
          { path: '/manageUsers', label: 'Players', icon: FaUsers },
          { path: '/manageHosts', label: 'Hosts', icon: FaUserCog },
          { path: '/manageTourn', label: 'Tournaments', icon: FaTrophy },
          { path: '/manageTrans', label: 'Transactions', icon: FaDollarSign }
        ];
      case 'HOST':
        return [
          { path: '/hostPage', label: 'Dashboard', icon: FaChartBar },
          { path: '/hostTourn', label: 'Tournaments', icon: FaTrophy },
          { path: '/hostUsers', label: 'Players', icon: FaUsers },
          { path: '/hostUsersPayment', label: 'Payments', icon: FaDollarSign },
          { path: '/declare-winners', label: 'Winners', icon: FaCrown }
        ];
      case 'PLAYER':
        return [
          { path: '/userHomePage', label: 'Dashboard', icon: FaChartBar },
          { path: '/viewTourn', label: 'Tournaments', icon: FaTrophy },
          { path: '/userPaidTourn', label: 'My Tournaments', icon: FaCalendarAlt },
          { path: '/leaderboard', label: 'Leaderboard', icon: FaCrown },
          { path: '/profile', label: 'Profile', icon: FaUsers }
        ];
      default:
        return [];
    }
  };

  const getPageTitle = () => {
    switch (userRole) {
      case 'ADMIN':
        return 'Admin Dashboard';
      case 'HOST':
        return 'Host Dashboard';
      case 'PLAYER':
        return 'Player Dashboard';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div className={`${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-black'} font-poppins min-h-screen flex flex-col transition-colors duration-300`}>
      {/* 🎮 Navbar */}
      <nav className="bg-gradient-to-r from-gray-900 to-black border-b border-gray-800/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <FaGamepad className="text-3xl text-yellow-400" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              <Link to={`/${userRole === 'ADMIN' ? 'adminPage' : userRole === 'HOST' ? 'hostPage' : 'userHomePage'}`}>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  {getPageTitle()}
                </h1>
              </Link>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex space-x-6">
              {getNavigationItems().map((item, index) => (
                <Link
                  key={index}
                  to={item.path}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-300 hover:text-yellow-400 hover:bg-gray-800/50 transition-all duration-300"
                >
                  <item.icon className="text-lg" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-300"
              >
                <FaSignOutAlt className="text-lg" />
                <span className="hidden sm:inline">Logout</span>
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg border border-gray-600 hover:border-yellow-400 transition-colors duration-300"
              >
                {darkMode ? <FaSun className="text-yellow-300" /> : <FaMoon className="text-gray-300" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden mt-4 pt-4 border-t border-gray-800">
            <div className="grid grid-cols-2 gap-2">
              {getNavigationItems().map((item, index) => (
                <Link
                  key={index}
                  to={item.path}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-300 hover:text-yellow-400 hover:bg-gray-800/50 transition-all duration-300 text-sm"
                >
                  <item.icon className="text-sm" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

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
                  { icon: FaTwitter, color: "hover:text-blue-400" },
                  { icon: FaInstagram, color: "hover:text-pink-400" },
                  { icon: FaFacebookF, color: "hover:text-blue-500" },
                  { icon: FaYoutube, color: "hover:text-red-500" }
                ].map((social, i) => (
                  <a 
                    key={i}
                    href="#" 
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
                {[
                  "Tournaments",
                  "Leaderboard", 
                  "Players",
                  "Host Events",
                  "Prizes",
                  "Community"
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
            
            {/* Support */}
            <div>
              <h4 className="text-lg font-bold text-white mb-6">Support</h4>
              <ul className="space-y-3">
                {[
                  "Help Center",
                  "Contact Us",
                  "FAQ",
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

export default Layout;
