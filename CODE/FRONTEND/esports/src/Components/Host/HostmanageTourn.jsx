import React, { useState, useEffect } from 'react';
import { FaTrophy, FaPen, FaTrashAlt, FaSave, FaPlusCircle, FaSignOutAlt, FaInstagram, FaTwitter, FaFacebookF, FaYoutube, FaSun, FaMoon } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api'; // Use centralized API
import { toast } from 'react-toastify';
import '@fontsource/poppins';
import 'react-toastify/dist/ReactToastify.css';

const ManageTournamentsPage = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [tournaments, setTournaments] = useState([]);
  const [games, setGames] = useState([]); // Game list
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    gameType: '',
    joiningFee: '',
    image: '',
    status: 'Active',
  });
  const [editing, setEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const navigate = useNavigate();
  const hostId = sessionStorage.getItem('hostId');

  useEffect(() => {
    const fetchData = async () => {
      if (!hostId || hostId === 'null') {
        // Session check logic (optional: relying on protected route wrapper is better)
      }

      try {
        // Fetch tournaments
        const res = await api.get(`/host/get-tournaments/${hostId}`);
        setTournaments(res.data.data || []);

        // Fetch games
        const gameRes = await api.get('/games');
        setGames(gameRes.data.data || []);
      } catch (err) {
        console.error(err);
        // toast.error('Failed to fetch data.');
      }
    };

    fetchData();
  }, [navigate, hostId]);

  const fetchTournaments = async () => {
    try {
      const res = await api.get(`/host/get-tournaments/${hostId}`);
      setTournaments(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/host/update-tournament/${editId}`, formData);
        toast.success('Tournament updated successfully!');
      } else {
        // Use JSON instead of FormData unless file upload is strictly required and supported by backend
        // Backend typically expects JSON for this structure based on previous code
        await api.post(`/host/create-tournament/${hostId}`, formData);
        toast.success('Tournament created successfully!');
      }
      resetForm();
      fetchTournaments();
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit tournament.');
    }
  };

  const handleEdit = (id) => {
    const tournament = tournaments.find((t) => t.id === id);
    setFormData({
      name: tournament.name,
      description: tournament.description,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      gameType: tournament.gameType,
      joiningFee: tournament.joiningFee,
      image: tournament.imageUrl || '',
      status: tournament.active ? 'Active' : 'Inactive',
    });
    setEditing(true);
    setEditId(id);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/admin/delete-tournament/${id}`);
      toast.success('Tournament deleted successfully!');
      fetchTournaments();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete tournament.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      gameType: '',
      joiningFee: '',
      image: '',
      status: 'Active',
    });
    setEditing(false);
    setEditId(null);
  };

  const handleLogout = () => {
    sessionStorage.clear();
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <div className={`${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-black'} font-poppins min-h-screen flex flex-col transition-colors duration-300`}>

      {/* Navbar */}
      <nav className={`${darkMode ? 'bg-gray-900' : 'bg-gray-100'} shadow-md py-4 px-8 flex justify-between items-center`}>
        <div className="flex items-center space-x-3">
          <FaTrophy className={`text-3xl ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
          <Link to="/hostPage"><h1 className={`text-2xl font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>Manage Tournaments</h1></Link>
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

      {/* Form Section */}
      <section className={`py-8 px-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-100 text-black'}`}>
        <div className="max-w-4xl mx-auto">
          <h2 className={`text-3xl font-bold mb-6 text-center ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
            {editing ? 'Edit Tournament' : 'Create Tournament'}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-6">
            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Tournament Name" required className="p-3 rounded-lg text-black" />
            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" required className="p-3 rounded-lg text-black" />
            <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required className="p-3 rounded-lg text-black" />
            <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required className="p-3 rounded-lg text-black" />

            {/* Game Dropdown */}
            <select name="gameType" value={formData.gameType} onChange={handleChange} required className="p-3 rounded-lg text-black">
              <option value="" disabled>Select Game</option>
              {games.map(game => (
                <option key={game.id} value={game.name}>{game.name}</option>
              ))}
              <option value="Other">Other</option>
            </select>

            <input type="number" name="joiningFee" value={formData.joiningFee} onChange={handleChange} placeholder="Joining Fee (₹)" required className="p-3 rounded-lg text-black" />
            <button type="submit" className="w-full py-3 rounded-lg bg-yellow-400 text-black font-semibold hover:bg-yellow-500">{editing ? 'Update' : 'Create'} Tournament</button>
          </form>
        </div>
      </section>

      {/* Tournament List */}
      <section className={`py-8 px-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-100 text-black'}`}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {tournaments.map((tournament) => (
            <div key={tournament.id} className="bg-gray-700 p-6 rounded-lg shadow-lg text-white">
              <h4 className="text-xl font-semibold mb-2">{tournament.name}</h4>
              <p>{tournament.description}</p>
              <p><strong>Start:</strong> {tournament.startDate}</p>
              <p><strong>End:</strong> {tournament.endDate}</p>
              <p><strong>Game:</strong> {tournament.gameType}</p>
              <p><strong>Joining Fee:</strong> ₹{tournament.joiningFee}</p>
              <div className="mt-4 flex justify-between">
                <button onClick={() => handleEdit(tournament.id)} className="text-blue-400 hover:text-blue-600"><FaPen className="inline mr-2" />Edit</button>
                <button onClick={() => handleDelete(tournament.id)} className="text-red-400 hover:text-red-600"><FaTrashAlt className="inline mr-2" />Delete</button>
              </div>
            </div>
          ))}
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

export default ManageTournamentsPage;
