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
  const [tournamentId, setTournamentId] = useState('');
  const [winners, setWinners] = useState([{ playerId: '', rank: '', prizeAmount: '', remarks: '' }]);
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

  // Handle input changes for winners
  const handleWinnerChange = (index, event) => {
    const { name, value } = event.target;
    const newWinners = [...winners];
    newWinners[index][name] = value;
    setWinners(newWinners);
  };

  // Add new winner form field
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
      toast.error('Please provide a tournament ID.');
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
      toast.error('Please fill in all winner details.');
      return;
    }

    try {
      const response = await axios.post(
        `http://localhost:8080/api/host/announce-winners/${tournamentId}`,
        winners
      );

      if (response.data.status === 'success') {
        toast.success(response.data.message);
        setWinners([{ playerId: '', rank: '', prizeAmount: '', remarks: '' }]); // Clear form
      } else {
        toast.error('Failed to declare winners: ' + response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred while declaring winners.');
    }
  };

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
          <Link to="#" className={`transition ${darkMode ? 'text-white hover:text-yellow-400' : 'text-gray-800 hover:text-yellow-600'}`}>Declare Winners</Link>
          <button onClick={() => setDarkMode(!darkMode)} className="ml-4 p-2 rounded-full border border-gray-400">
            {darkMode ? <FaSun className="text-yellow-300" /> : <FaMoon className="text-gray-800" />}
          </button>
        </div>
      </nav>

      {/* 🌟 Declare Winners Section */}
      <section className={`py-16 px-8 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-black'}`}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className={`text-4xl font-bold mb-6 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>Declare Winners</h2>
          <p className="text-lg leading-relaxed mb-4">
            Fill in the tournament ID and details of the winners (Player ID, Rank, Prize Amount, Remarks).
          </p>
          <form onSubmit={handleDeclareWinners} className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-lg">
            <div className="mb-4">
              <label htmlFor="tournamentId" className="block text-lg font-semibold text-black">Tournament ID</label>
              <input
                type="number"
                id="tournamentId"
                value={tournamentId}
                onChange={(e) => setTournamentId(e.target.value)}
                className="mt-2 w-full px-4 py-2 rounded-lg border border-gray-300 text-black"
                required
              />
            </div>

            {winners.map((winner, index) => (
              <div key={index} className="mb-4">
                <div className="flex space-x-4">
                  <input
                    type="number"
                    name="playerId"
                    placeholder="Player ID"
                    value={winner.playerId}
                    onChange={(e) => handleWinnerChange(index, e)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 text-black"
                    required
                  />
                  <input
                    type="number"
                    name="rank"
                    placeholder="Rank"
                    value={winner.rank}
                    onChange={(e) => handleWinnerChange(index, e)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 text-black"
                    required
                  />
                </div>
                <div className="flex space-x-4">
                  <input
                    type="number"
                    name="prizeAmount"
                    placeholder="Prize Amount"
                    value={winner.prizeAmount}
                    onChange={(e) => handleWinnerChange(index, e)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 text-black"
                    required
                  />
                  <input
                    type="text"
                    name="remarks"
                    placeholder="Remarks"
                    value={winner.remarks}
                    onChange={(e) => handleWinnerChange(index, e)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 text-black"
                    required
                  />
                </div>
                {winners.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveWinner(index)}
                    className="mt-2 text-red-500 hover:text-red-700"
                  >
                    Remove Winner
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddWinner}
              className="text-blue-500 hover:text-blue-700"
            >
              Add Another Winner
            </button>

            <button
              type="submit"
              className="mt-6 w-full py-2 text-white bg-yellow-600 hover:bg-yellow-500 rounded-lg"
            >
              Declare Winners
            </button>
          </form>
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
