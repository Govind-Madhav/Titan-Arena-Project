import React, { useState, useEffect } from 'react';
import '@fontsource/poppins';
import { FaMoneyBillAlt, FaTrophy, FaUsersCog, FaSignOutAlt, FaInstagram, FaTwitter, FaFacebookF, FaYoutube, FaSun, FaMoon } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';  // Import Link for routing
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // 🧡 Important

const HostUserPayments = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Get hostId from sessionStorage
  const hostId = sessionStorage.getItem('hostId'); // 🔥 Get from sessionStorage

  // Fetch payment details from backend
  useEffect(() => {
    const fetchPayments = async () => {
      if (!hostId || hostId === 'null') {
        toast.error("Session expired! Please login again.");
        // navigate('/');
        return;
      }

      setLoading(true);
      try {
        const response = await axios.get(`http://localhost:8080/api/host/payments/${hostId}`);
        setTransactions(response.data); // Update state with the fetched payments
      } catch (error) {
        console.error(error);
        toast.error('Failed to fetch payment details.');
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [hostId, navigate]);

  return (
    <div className={`${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-black'} font-poppins min-h-screen flex flex-col transition-colors duration-300`}>
      
      {/* 🌐 Navbar */}
      <nav className={`${darkMode ? 'bg-gray-900' : 'bg-gray-100'} shadow-md py-4 px-8 flex justify-between items-center`}>
        <div className="flex items-center space-x-3">
          <FaTrophy className={`text-3xl ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
          <Link to={"/hostPage"}><h1 className={`text-2xl font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>View Userpayment</h1></Link>
        </div>
        <div className="space-x-6 flex items-center">
          <Link to="/hostTourn" className={`transition ${darkMode ? 'text-white hover:text-yellow-400' : 'text-gray-800 hover:text-yellow-600'}`}>Manage Tournaments</Link>
          <Link to="/hostUsers" className={`transition ${darkMode ? 'text-white hover:text-yellow-400' : 'text-gray-800 hover:text-yellow-600'}`}>View Users</Link>
          <Link to="/hostUsersPayment" className={`transition ${darkMode ? 'text-white hover:text-yellow-400' : 'text-gray-800 hover:text-yellow-600'}`}>View Payments</Link>
          <Link to="/declare-winners" className={`transition ${darkMode ? 'text-white hover:text-yellow-400' : 'text-gray-800 hover:text-yellow-600'}`}>Declare Winners</Link>
          <button onClick={() => setDarkMode(!darkMode)} className="ml-4 p-2 rounded-full border border-gray-400">
            {darkMode ? <FaSun className="text-yellow-300" /> : <FaMoon className="text-gray-800" />}
          </button>
        </div>
      </nav>

      {/* 🧑‍💻 Admin About Section */}
      <section className={`py-16 px-8 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-black'}`}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className={`text-4xl font-bold mb-6 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>Tournament Payment Details</h2>
          <p className="text-lg leading-relaxed">
            Here you can view the transactions related to tournaments, including payment modes, amounts, and their statuses.
          </p>
        </div>
      </section>

      {/* 🎮 Transactions Section */}
      <section className={`py-16 px-8 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-black'}`}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            <div className="text-center w-full text-yellow-400">Loading payments...</div>
          ) : (
            transactions.length === 0 ? (
              <div className="text-center w-full text-yellow-400">No payment transactions found.</div>
            ) : (
              transactions.map(transaction => (
                <div key={transaction.transactionId} className={`bg-gray-700 p-6 rounded-lg shadow-lg ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  <img src={"public/payment1.avif"} alt="Tournament" className="w-full h-48 object-cover rounded-lg mb-4" />
                  <h4 className="text-xl font-semibold mb-2">{`Tournament ID: ${transaction.tournamentId}`}</h4>
                  <p className="mb-2"><strong>Transaction ID:</strong> {transaction.transactionId}</p>
                  <p className="mb-2"><strong>User ID:</strong> {transaction.playerId}</p>
                  <p className="mb-2"><strong>Mode of Payment:</strong> {transaction.paymentMethod}</p>
                  <p className="mb-2"><strong>Amount:</strong> ₹{transaction.amount}</p>
                  <p className="mb-2"><strong>Status:</strong> {transaction.status ? 'Completed' : 'Failed'}</p>
                </div>
              ))
            )
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

      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
};

export default HostUserPayments;
