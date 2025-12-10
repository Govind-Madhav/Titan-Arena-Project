import React, { useState } from 'react';
import '@fontsource/poppins';
import { FaUser, FaCheckCircle, FaHourglassHalf, FaTrashAlt, FaSignOutAlt, FaSun, FaMoon, FaTwitter, FaInstagram, FaFacebookF, FaYoutube } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const HostManageUser = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [users, setUsers] = useState([]);
  const [tournamentId, setTournamentId] = useState('');
  const [inputTournamentId, setInputTournamentId] = useState('');
  const navigate = useNavigate();
  const hostId = sessionStorage.getItem('hostId');

  const fetchPlayers = async () => {
    if (!inputTournamentId) {
      toast.error('Please enter a tournament ID!');
      return;
    }

    try {
      const response = await axios.get(`http://localhost:8080/api/host/players/${inputTournamentId}`);
      if (response.data.status === 'success') {
        const playersWithStatus = response.data.data.map(player => ({
          ...player,
          status: 'Pending' // Default status initially
        }));
        setUsers(playersWithStatus);
        setTournamentId(inputTournamentId);
        toast.success('Players fetched successfully!');
      } else {
        toast.error('Failed to fetch players.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error fetching players.');
    }
  };

  const handleApprove = async (playerId) => {
    try {
      await axios.put(`http://localhost:8080/api/host/approve-reject/${playerId}/${tournamentId}?isApproved=true`);
      setUsers(users.map(user => user.id === playerId ? { ...user, status: 'Approved' } : user));
      toast.success('Player approved successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to approve player.');
    }
  };

  const handleReject = async (playerId) => {
    try {
      await axios.put(`http://localhost:8080/api/host/approve-reject/${playerId}/${tournamentId}?isApproved=false`);
      setUsers(users.map(user => user.id === playerId ? { ...user, status: 'Rejected' } : user));
      toast.success('Player rejected successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to reject player.');
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    toast.success('Logged out successfully!');
    navigate('/');
  };

  return (
    <div className={`${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-black'} font-poppins min-h-screen flex flex-col transition-colors duration-300`}>
      <ToastContainer />

      {/* Navbar */}
      <nav className={`${darkMode ? 'bg-gray-900' : 'bg-gray-100'} shadow-md py-4 px-8 flex justify-between items-center`}>
        <div className="flex items-center space-x-3">
          <FaUser className={`text-3xl ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
          <Link to={"/hostPage"}>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>Manage Users</h1>
          </Link>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/hostTourn" className={`${darkMode ? 'text-white hover:text-yellow-400' : 'text-gray-800 hover:text-yellow-600'}`}>Manage Tournaments</Link>
          <Link to="/hostUsers" className={`${darkMode ? 'text-white hover:text-yellow-400' : 'text-gray-800 hover:text-yellow-600'}`}>View Users</Link>
          <Link to="/hostUsersPayment" className={`${darkMode ? 'text-white hover:text-yellow-400' : 'text-gray-800 hover:text-yellow-600'}`}>View Payments</Link>
          <Link to="/declare-winners" className={`${darkMode ? 'text-white hover:text-yellow-400' : 'text-gray-800 hover:text-yellow-600'}`}>Declare Winners</Link>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full border border-gray-400">
            {darkMode ? <FaSun className="text-yellow-300" /> : <FaMoon className="text-gray-800" />}
          </button>
        </div>
      </nav>

      {/* Input Tournament ID Section */}
      <section className="py-10 px-8">
        <div className="max-w-2xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-center">
          <input
            type="text"
            placeholder="Enter Tournament ID"
            value={inputTournamentId}
            onChange={(e) => setInputTournamentId(e.target.value)}
            className="border p-3 rounded-lg text-black w-full md:w-2/3"
          />
          <button
            onClick={fetchPlayers}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-6 py-3 rounded-full"
          >
            Fetch Players
          </button>
        </div>
      </section>

      {/* Users Section */}
      <section className={`py-10 px-8 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-black'}`}>
        <div className="max-w-6xl mx-auto">
          {tournamentId && (
            <h2 className="text-center text-3xl font-bold mb-8">Players in Tournament ID: {tournamentId}</h2>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {users.map((user) => (
              <div key={user.id} className="bg-gray-700 p-6 rounded-lg shadow-lg">
                <img src={user.imageUrl} alt="Player" className="w-full h-48 object-cover rounded-lg mb-4" />
                <h4 className="text-xl font-bold mb-2">{user.fullName}</h4>
                <p className="mb-2">{user.email}</p>
                <p className={`flex items-center ${user.status === 'Approved' ? 'text-green-400' : user.status === 'Pending' ? 'text-yellow-400' : 'text-red-400'}`}>
                  {user.status === 'Approved' ? <FaCheckCircle className="mr-2" /> : <FaHourglassHalf className="mr-2" />}
                  {user.status}
                </p>
                <div className="mt-4 flex justify-between">
                  {user.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(user.id)}
                        className="text-green-400 hover:text-green-600"
                      >
                        <FaCheckCircle className="inline mr-2" /> Approve
                      </button>
                      <button
                        onClick={() => handleReject(user.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <FaTrashAlt className="inline mr-2" /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
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

export default HostManageUser;
