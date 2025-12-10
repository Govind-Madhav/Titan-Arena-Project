import React, { useState, useEffect } from 'react';
import '@fontsource/poppins';
import { FaMoneyBillAlt, FaTrophy, FaUsersCog, FaSignOutAlt, FaInstagram, FaTwitter, FaFacebookF, FaYoutube, FaSun, FaMoon } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ManageTransactionsPage = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/admin/view-transactions');
      setTransactions(res.data || []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error('Failed to fetch transactions.');
    } finally {
      setFetchLoading(false);
    }
  };

  return (
    <div className={`${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-black'} font-poppins min-h-screen flex flex-col transition-colors duration-300`}>
      <ToastContainer position="top-center" autoClose={3000} />
      
      {/* 🌐 Navbar */}
      <nav className={`${darkMode ? 'bg-gray-900' : 'bg-gray-100'} shadow-md py-4 px-8 flex justify-between items-center`}>
        <div className="flex items-center space-x-3">
          <FaMoneyBillAlt className={`text-3xl ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
          <Link to={"/adminPage"}>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>Manage Transactions</h1>
          </Link>
        </div>
        <div className="space-x-6 flex items-center">
          <Link to={"/manageUsers"}>
            <button className={`${darkMode ? 'text-white hover:text-yellow-400' : 'text-gray-800 hover:text-yellow-600'}`}>Players</button>
          </Link>
          <Link to={"/manageHosts"}>
            <button className={`${darkMode ? 'text-white hover:text-yellow-400' : 'text-gray-800 hover:text-yellow-600'}`}>Hosts</button>
          </Link>
          <Link to={"/manageTourn"}>
            <button className={`${darkMode ? 'text-white hover:text-yellow-400' : 'text-gray-800 hover:text-yellow-600'}`}>Tournaments</button>
          </Link>
          <Link to={"/manageTrans"}>
            <button className={`${darkMode ? 'text-white hover:text-yellow-400' : 'text-gray-800 hover:text-yellow-600'}`}>Transactions</button>
          </Link>
          <button onClick={() => setDarkMode(!darkMode)} className="ml-4 p-2 rounded-full border border-gray-400">
            {darkMode ? <FaSun className="text-yellow-300" /> : <FaMoon className="text-gray-800" />}
          </button>
        </div>
      </nav>

      {/* 🧑‍💻 About Section */}
      <section className={`py-16 px-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className={`text-4xl font-bold mb-6 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>Tournament Payment Details</h2>
          <p className="text-lg leading-relaxed">
            Here you can view the transactions related to tournaments, including player details, amount, and status.
          </p>
        </div>
      </section>

      {/* 🎮 Transactions Section */}
      <section className={`py-16 px-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {fetchLoading ? (
            <div className="col-span-full text-center py-20">
              <div className="animate-spin h-10 w-10 border-t-2 border-b-2 border-yellow-400 rounded-full mx-auto"></div>
              <p className="mt-4 text-lg font-semibold">Loading transactions...</p>
            </div>
          ) : transactions.length > 0 ? (
            transactions.map((transaction, index) => (
              <div key={index} className={`bg-gray-700 p-6 rounded-lg shadow-lg ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                <img src={"public/payment1.avif"} alt="Payment" className="w-full h-48 object-cover rounded-lg mb-4" />
                <h4 className="text-xl font-semibold mb-2">{`Player ID: ${transaction.playerId}`}</h4>
                <p className="mb-2"><strong>Tournament ID:</strong> {transaction.tournamentId}</p>
                <p className="mb-2"><strong>Amount:</strong> ₹{transaction.amount}</p>
                <p className="mb-2"><strong>Payment Method:</strong> {transaction.paymentMethod}</p>
                <p className="mb-2"><strong>Transaction ID:</strong> {transaction.transactionId}</p>
                <p className="mb-2">
                  <strong>Status:</strong> {transaction.status ? (
                    <span className="text-green-400 font-bold">Success</span>
                  ) : (
                    <span className="text-red-400 font-bold">Failed</span>
                  )}
                </p>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center text-xl font-semibold">
              No transactions found.
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

export default ManageTransactionsPage;
