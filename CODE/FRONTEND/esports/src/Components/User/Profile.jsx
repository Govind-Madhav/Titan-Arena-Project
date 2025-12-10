import React, { useState, useEffect } from 'react';
import { FaTrophy, FaUserEdit, FaSun, FaMoon } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';
import axios from 'axios';
import '@fontsource/poppins';

const UserProfilePage = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [user, setUser] = useState({
    id: '',
    profilePic: '',
    fullName: '',
    email: '',
    password: '',
    mobile: '',
    joinedDate: '',
  });
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    mobile: '',
    profilePic: null, // store file, not URL
  });
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = {
      id: sessionStorage.getItem('playerId'),
      fullName: sessionStorage.getItem('playerName'),
      email: sessionStorage.getItem('playerEmail'),
      mobile: sessionStorage.getItem('playerMobile'),
      profilePic: sessionStorage.getItem('playerImageUrl'),
    };

    if (storedUser.fullName) {
      setUser(storedUser);
      setFormData({ ...storedUser, profilePic: null }); // Reset file
    } else {
      toast.error('Session expired! Please log in again.');
      // navigate('/login');
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'profilePic' && files.length > 0) {
      setFormData((prev) => ({
        ...prev,
        profilePic: files[0], // Save the real file
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSave = async () => {
    const userId = user.id;
    const { fullName, email, password, mobile, profilePic } = formData;

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('fullName', fullName);
      formDataToSend.append('email', email);
      formDataToSend.append('password', password);
      formDataToSend.append('mobile', mobile);
      if (profilePic) {
        formDataToSend.append('file', profilePic);
      }

      const response = await axios.put(`http://localhost:8080/api/player/update-profile/${userId}`, formDataToSend);
      
      if (response.data.status === 'success') {
        const updatedPlayer = response.data.data;
        // Update sessionStorage individually
        sessionStorage.setItem('playerName', updatedPlayer.fullName);
        sessionStorage.setItem('playerEmail', updatedPlayer.email);
        sessionStorage.setItem('playerMobile', updatedPlayer.mobile);
        sessionStorage.setItem('playerImageUrl', updatedPlayer.imageUrl);

        setUser({
          ...user,
          fullName: updatedPlayer.fullName,
          email: updatedPlayer.email,
          mobile: updatedPlayer.mobile,
          profilePic: updatedPlayer.imageUrl,
        });
        toast.success('Profile updated successfully!');
      } else {
        toast.error('Failed to update profile.');
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred while updating the profile.');
    } finally {
      setEditing(false);
    }
  };

  return (
    <div className={`${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-black'} font-poppins min-h-screen flex flex-col transition-colors duration-300`}>
      
      <Toaster position="top-center" reverseOrder={false} />

      {/* Navbar */}
      <nav className={`${darkMode ? 'bg-gray-900' : 'bg-gray-100'} shadow-md py-4 px-8 flex justify-between items-center`}>
        <div className="flex items-center space-x-3">
          <FaTrophy className={`text-3xl ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
          <Link to={'/userHomePage'}>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>Profile</h1>
          </Link>
        </div>
        <div className="space-x-6 flex items-center">
          <Link to="/viewTourn" className={`${darkMode ? 'text-white hover:text-yellow-400' : 'text-gray-800 hover:text-yellow-600'}`}>View Tournaments</Link>
          <Link to="/userPaidTourn" className={`${darkMode ? 'text-white hover:text-yellow-400' : 'text-gray-800 hover:text-yellow-600'}`}>Paid Tournaments</Link>
          <Link to="/leaderboard" className={`${darkMode ? 'text-white hover:text-yellow-400' : 'text-gray-800 hover:text-yellow-600'}`}>Leaderboard</Link>
          <Link to="/profile" className={`${darkMode ? 'text-yellow-400' : 'text-gray-800 hover:text-yellow-600'}`}>Profile</Link>
          <button onClick={() => setDarkMode(!darkMode)} className="ml-4 p-2 rounded-full border border-gray-400">
            {darkMode ? <FaSun className="text-yellow-300" /> : <FaMoon className="text-gray-800" />}
          </button>
        </div>
      </nav>

      {/* Profile Section */}
      <section className={`py-16 px-8 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-black'}`}>
        <div className="max-w-3xl mx-auto bg-gray-700 p-8 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold">User Profile</h2>
            <button 
              onClick={() => setEditing(!editing)} 
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-4 py-2 rounded-full flex items-center gap-2 transition"
            >
              <FaUserEdit />
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <div className="flex flex-col items-center mb-8">
            <img 
              src={user.profilePic || '/default-profile.png'} 
              alt="Profile" 
              className="w-28 h-28 rounded-full object-cover border-4 border-yellow-400"
            />
            {editing && (
              <input
                type="file"
                name="profilePic"
                onChange={handleChange}
                className="mt-4 text-sm"
              />
            )}
          </div>

          <div className="space-y-6">
            {editing ? (
              <>
                <div>
                  <label className="block mb-2">Full Name:</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full p-3 rounded-lg border border-gray-400 text-black"
                  />
                </div>
                <div>
                  <label className="block mb-2">Email:</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full p-3 rounded-lg border border-gray-400 text-black"
                  />
                </div>
                <div>
                  <label className="block mb-2">Password:</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full p-3 rounded-lg border border-gray-400 text-black"
                  />
                </div>
                <div>
                  <label className="block mb-2">Mobile:</label>
                  <input
                    type="text"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    className="w-full p-3 rounded-lg border border-gray-400 text-black"
                  />
                </div>
                <button
                  onClick={handleSave}
                  className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-full transition"
                >
                  Save Changes
                </button>
              </>
            ) : (
              <>
                <p><strong>Full Name:</strong> {user.fullName}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Mobile:</strong> {user.mobile}</p>
                <p><strong>Joined Date:</strong> {user.joinedDate || 'N/A'}</p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`${darkMode ? 'bg-gray-900' : 'bg-gray-100'} py-8 mt-12 border-t border-gray-800`}>
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <h3 className={`${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>Titan E-sports</h3>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>© 2025 Titan E-sports. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default UserProfilePage;
