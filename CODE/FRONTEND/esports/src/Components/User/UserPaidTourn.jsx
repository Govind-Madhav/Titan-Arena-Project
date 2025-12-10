import React, { useState, useEffect } from 'react';
import '@fontsource/poppins';
import { FaTrophy, FaSignOutAlt, FaSun, FaMoon, FaTwitter, FaInstagram, FaFacebookF, FaYoutube } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf'; // 📄 For PDF
import QRCode from 'qrcode'; // 📲 For QR code
import axios from 'axios'; // For making API requests
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const PaidTournamentsPage = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [paidTournaments, setPaidTournaments] = useState([]); // Empty array to hold fetched tournaments
  const [countdowns, setCountdowns] = useState({});
  const [loading, setLoading] = useState(true); // To handle loading state
  const [error, setError] = useState(null); // For handling errors

  const playerId = sessionStorage.getItem('playerId'); // Assuming playerId is stored in sessionStorage

  // Fetch paid tournaments from the API
  useEffect(() => {
    const fetchPaidTournaments = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:8080/api/player/paid-tournaments/${playerId}`);
        if (response.data.status === 'success') {
          setPaidTournaments(response.data.data); // Assuming the data is under 'data' key
        } else {
          toast.error('Failed to fetch paid tournaments.');
        }
      } catch (error) {
        setError('Error fetching paid tournaments.');
        toast.error('Error fetching paid tournaments.');
      } finally {
        setLoading(false);
      }
    };

    fetchPaidTournaments();
  }, [playerId]);

  // Function to calculate countdown to the tournament start date
  const calculateCountdown = (startDate) => {
    const now = new Date();
    const start = new Date(startDate);
    const timeDifference = start - now;

    if (timeDifference <= 0) {
      return 'Tournament has already started!';
    }

    const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const updatedCountdowns = {};
      paidTournaments.forEach((tournament) => {
        updatedCountdowns[tournament.id] = calculateCountdown(tournament.startDate);
      });
      setCountdowns(updatedCountdowns);
    }, 1000);

    return () => clearInterval(interval);
  }, [paidTournaments]);

  // 🎟️ Function to download ticket with QR code
  const downloadTicket = async (tournament) => {
    const doc = new jsPDF();
  
    // Header background
    doc.setFillColor(40, 116, 166);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('🏆 Titan E-sports Tournament Ticket', 105, 20, { align: 'center' });
  
    // Tournament info
    const infoY = 50;
    const gap = 10;
  
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('🎮 Tournament Name:', 20, infoY);
    doc.setFontSize(12);
    doc.text(tournament.name, 80, infoY);
  
    doc.setFontSize(14);
    doc.text('🧑 Host ID:', 20, infoY + gap);
    doc.setFontSize(12);
    doc.text(tournament.hostId, 80, infoY + gap);
  
    doc.setFontSize(14);
    doc.text('📅 Start Date:', 20, infoY + 2 * gap);
    doc.setFontSize(12);
    doc.text(tournament.startDate.substring(0, 10), 80, infoY + 2 * gap);
  
    doc.setFontSize(14);
    doc.text('📅 End Date:', 20, infoY + 3 * gap);
    doc.setFontSize(12);
    doc.text(tournament.endDate.substring(0, 10), 80, infoY + 3 * gap);
  
    doc.setFontSize(14);
    doc.setTextColor(34, 139, 34);
    doc.text('✔ Payment Status:', 20, infoY + 4 * gap);
    doc.setFontSize(12);
    doc.text('Paid', 80, infoY + 4 * gap);
  
    // QR Code
    const qrText = `Tournament: ${tournament.name}\nHost ID: ${tournament.hostId}\nPayment: Paid`;
    const qrDataURL = await QRCode.toDataURL(qrText);
    doc.addImage(qrDataURL, 'PNG', 140, infoY - 10, 50, 50);
  
    // Border
    doc.setDrawColor(40, 116, 166);
    doc.rect(10, 35, 190, 130);
  
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('Thank you for registering. Visit titanesports.com for more info.', 105, 170, { align: 'center' });
  
    // Save
    doc.save(`${tournament.name}_Ticket.pdf`);
  };
  

  return (
    <div className="bg-gray-950 text-white font-poppins min-h-screen">
      <ToastContainer />

      {/* 🎮 Hero Section */}
      <section className="relative py-16 bg-gradient-to-br from-gray-900 via-gray-800 to-black overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
        
        {/* Floating Gaming Elements */}
        <div className="absolute top-20 left-10 animate-bounce">
          <FaTrophy className="text-yellow-400 text-4xl opacity-30" />
        </div>
        <div className="absolute top-40 right-20 animate-pulse">
          <FaGamepad className="text-blue-400 text-3xl opacity-30" />
        </div>

        {/* Navbar */}
        <nav className="relative z-50 bg-black/20 backdrop-blur-md border-b border-gray-800/50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <FaTrophy className="text-3xl text-yellow-400" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                My Tournaments
              </h1>
            </div>
            <div className="space-x-6 flex items-center">
              <Link to="/userHomePage" className="text-gray-300 hover:text-yellow-400 transition-colors duration-300">Home</Link>
              <Link to="/viewTourn" className="text-gray-300 hover:text-yellow-400 transition-colors duration-300">View Tournaments</Link>
              <Link to="/userPaidTourn" className="text-yellow-400 font-semibold">My Tournaments</Link>
              <Link to="/leaderboard" className="text-gray-300 hover:text-yellow-400 transition-colors duration-300">Leaderboard</Link>
              <Link to="/profile" className="text-gray-300 hover:text-yellow-400 transition-colors duration-300">Profile</Link>
              <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full border border-gray-600 hover:border-yellow-400 transition-colors duration-300">
                {darkMode ? <FaSun className="text-yellow-300" /> : <FaMoon className="text-gray-300" />}
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-6xl mx-auto px-6 pt-16">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                My Tournaments
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 font-light">
              Track your tournament participation and progress
            </p>
          </motion.div>
        </div>
      </section>

      {/* 🏆 Paid Tournaments Section */}
      <section className="py-24 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                Your Tournaments
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Track your tournament participation and monitor your progress
            </p>
          </div>

          {loading && <p className="text-center text-yellow-400">Loading paid tournaments...</p>}
          {error && <p className="text-center text-red-500">{error}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              <div className="col-span-full text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
                <p className="mt-4 text-yellow-400">Loading tournaments...</p>
              </div>
            ) : paidTournaments.length > 0 ? paidTournaments.map((tournament, i) => (
              <motion.div
                key={`tournament-${tournament.id}`}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className="group relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:border-green-400/50 transition-all duration-300 card-container card-stable"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                    Paid
                  </div>
                  <FaTrophy className="text-green-400 text-lg" />
                </div>
                
                <img src={tournament.image || 'public/tourn1.avif'} alt={tournament.name} className="w-full h-48 object-cover rounded-lg mb-4" />
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors duration-300">
                  {tournament.name}
                </h3>
                <p className="text-gray-400 mb-4">{tournament.description}</p>
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-gray-300">
                    <FaUsers className="mr-2 text-green-400" />
                    Host: {tournament.hostId}
                  </div>
                  <div className="flex items-center text-gray-300">
                    <FaCalendarAlt className="mr-2 text-green-400" />
                    Start: {tournament.startDate.substring(0, 10)}
                  </div>
                  <div className="flex items-center text-gray-300">
                    <FaCalendarAlt className="mr-2 text-green-400" />
                    End: {tournament.endDate.substring(0, 10)}
                  </div>
                  <div className="flex items-center text-gray-300">
                    <FaClock className="mr-2 text-green-400" />
                    Countdown: {countdowns[tournament.id]}
                  </div>
                </div>
                
                <div className="text-green-400 font-semibold mb-4 text-center">
                  ✔️ Payment Completed
                </div>

                {/* 🎟️ Ticket and WhatsApp Join */}
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => downloadTicket(tournament)}
                    className="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-full transition transform hover:scale-105"
                  >
                    Download Ticket
                  </button>

                  <a
                    href={'https://chat.whatsapp.com/LDTh8hMr7ik9zxjG3WfOm2'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-full transition transform hover:scale-105"
                  >
                    Join WhatsApp
                  </a>
                </div>
              </motion.div>
            )) : (
              <div className="col-span-full text-center py-8">
                <div className="text-6xl mb-4">🏆</div>
                <p className="text-gray-400 text-lg">No paid tournaments available.</p>
                <p className="text-gray-500 text-sm mt-2">Join some tournaments to see them here!</p>
              </div>
            )}
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
                  <FaTrophy className="text-3xl text-yellow-400" />
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

export default PaidTournamentsPage;
