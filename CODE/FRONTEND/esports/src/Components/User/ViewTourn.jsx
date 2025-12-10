import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '@fontsource/poppins';
import { FaTrophy, FaSignOutAlt, FaSun, FaMoon, FaCheckCircle, FaTwitter, FaInstagram, FaFacebookF, FaYoutube } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const PaymentPage = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Card');
  const [cardNumber, setCardNumber] = useState('');
  const [cvv, setCvv] = useState('');
  const [validThru, setValidThru] = useState('');
  const [upiId, setUpiId] = useState('');
  const [isValidUpi, setIsValidUpi] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const navigate = useNavigate();
  const playerId = sessionStorage.getItem('playerId');

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await axios.get('http://localhost:8080/api/player/active-tournaments');
        if (response.data.status === 'success') {
          setTournaments(response.data.data);
        } else {
          toast.error('Failed to fetch tournaments.');
        }
      } catch (error) {
        toast.error('Error fetching tournaments.');
      }
    };
    fetchTournaments();
  }, []);

  // Step 1: First Join the tournament
  const handleJoinTournament = async (tournament) => {
    try {
      const response = await axios.post(`http://localhost:8080/api/player/join/${playerId}/${tournament.id}`);
      if (response.data.status === 'success') {
        toast.success('Successfully requested to join tournament!');
        setSelectedTournament(tournament);
        setShowPaymentModal(true); // Only open payment after join successful
      } else {
        toast.error(response.data.message || 'Failed to join tournament.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error joining tournament.');
    }
  };

  // Step 2: After join is successful, Payment
  const handlePayment = async () => {
    if (!selectedTournament) {
      toast.error('No tournament selected!');
      return;
    }

    const paymentData = {
      playerId,
      tournamentId: selectedTournament.id,
      amount: selectedTournament.joiningFee,
      paymentMethod,
      status: true,
      cardNumber,
      cardExpiryDate: validThru,
      cardCVC: cvv,
      upiId
    };

    try {
      const response = await axios.post(`http://localhost:8080/api/player/make-payment/${playerId}/${selectedTournament.id}`, paymentData);
      if (response.data.status === 'success') {
        setPaymentSuccess(true);
        setTimeout(() => {
          setPaymentSuccess(false);
          navigate('/userHomePage');
        }, 2000);
      } else {
        toast.error('Payment failed!');
      }
    } catch (error) {
      toast.error('Payment failed!');
    }
  };

  const handleCardNumberChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 16) {
      setCardNumber(value);
    }
  };

  const handleCvvChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 3) {
      setCvv(value);
    }
  };

  const handleUpiChange = (e) => {
    const value = e.target.value;
    setUpiId(value);
    setIsValidUpi(/^[a-zA-Z0-9]+@[a-zA-Z0-9.-]+$/.test(value));
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
              <Link to={'/userHomePage'}>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  View Tournaments
                </h1>
              </Link>
            </div>
            <div className="space-x-6 flex items-center">
              <Link to="/userHomePage" className="text-gray-300 hover:text-yellow-400 transition-colors duration-300">Home</Link>
              <Link to="/viewTourn" className="text-yellow-400 font-semibold">View Tournaments</Link>
              <Link to="/userPaidTourn" className="text-gray-300 hover:text-yellow-400 transition-colors duration-300">My Tournaments</Link>
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
                Active Tournaments
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 font-light">
              Join the competition and prove your skills
            </p>
          </motion.div>
        </div>
      </section>

      {/* Active Tournaments Section */}
      <section className="py-24 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Available Tournaments
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Choose your battles and join the ultimate competitive gaming experience
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {tournaments.length > 0 ? tournaments.map((tournament, i) => (
              <motion.div
                key={`tournament-${tournament.id}`}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className="group relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:border-yellow-400/50 transition-all duration-300 card-container card-stable"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                    Active
                  </div>
                  <FaTrophy className="text-yellow-400 text-lg" />
                </div>
                
                <img src={tournament.imageUrl || 'public/esports.png'} alt={tournament.name} className="w-full h-48 object-cover rounded-lg mb-4" />
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors duration-300">
                  {tournament.name}
                </h3>
                <p className="text-gray-400 mb-4">{tournament.description}</p>
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-gray-300">
                    <FaCalendarAlt className="mr-2 text-yellow-400" />
                    Start: {tournament.startDate}
                  </div>
                  <div className="flex items-center text-gray-300">
                    <FaCalendarAlt className="mr-2 text-yellow-400" />
                    End: {tournament.endDate}
                  </div>
                  <div className="flex items-center text-gray-300">
                    <FaDollarSign className="mr-2 text-yellow-400" />
                    Fee: ₹{tournament.joiningFee}
                  </div>
                </div>
                
                <button
                  onClick={() => handleJoinTournament(tournament)}
                  className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-orange-400 transition-all duration-300 transform hover:scale-105"
                >
                  Join Tournament
                </button>
              </motion.div>
            )) : (
              <div className="col-span-full text-center py-8">
                <div className="text-6xl mb-4">🎮</div>
                <p className="text-gray-400 text-lg">No active tournaments available.</p>
                <p className="text-gray-500 text-sm mt-2">Check back later for new tournaments!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Payment Modal */}
      {showPaymentModal && selectedTournament && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className={`p-8 rounded-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} w-96`}>
            <h3 className="text-2xl font-bold mb-4 text-center">Payment for {selectedTournament.name}</h3>

            <div>
              <label className="block text-sm font-semibold mb-2">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="border p-2 rounded w-full mb-4 text-black"
              >
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
              </select>

              {paymentMethod === 'Card' && (
                <>
                  <input
                    type="text"
                    placeholder="Card Number"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    className="border p-2 rounded w-full mb-4 text-black"
                    maxLength={16}
                  />
                  <input
                    type="text"
                    placeholder="CVV"
                    value={cvv}
                    onChange={handleCvvChange}
                    className="border p-2 rounded w-full mb-4 text-black"
                    maxLength={3}
                  />
                  <input
                    type="text"
                    placeholder="Valid Thru (MM/YY)"
                    value={validThru}
                    onChange={(e) => setValidThru(e.target.value)}
                    className="border p-2 rounded w-full mb-4 text-black"
                  />
                </>
              )}

              {paymentMethod === 'UPI' && (
                <input
                  type="text"
                  placeholder="123456789@ybl"
                  value={upiId}
                  onChange={handleUpiChange}
                  className={`border p-2 rounded w-full mb-4 text-black ${isValidUpi ? 'border-green-300' : 'border-red-300'}`}
                />
              )}

              <button
                onClick={handlePayment}
                className="bg-green-500 hover:bg-green-600 text-white w-full py-3 rounded-lg font-semibold mt-4"
              >
                Make Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Success */}
      {paymentSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
          <div className="bg-green-500 p-8 rounded-lg flex flex-col items-center">
            <FaCheckCircle className="text-5xl mb-4 text-white animate-bounce" />
            <h2 className="text-3xl font-bold text-white">Payment Successful!</h2>
          </div>
        </div>
      )}

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

export default PaymentPage;
