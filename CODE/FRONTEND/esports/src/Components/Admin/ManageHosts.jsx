// Keep all your imports SAME
import React, { useState, useEffect } from 'react';
import '@fontsource/poppins';
import { FaCheckCircle, FaTimesCircle, FaUsersCog, FaSignOutAlt, FaSun, FaMoon, FaTwitter, FaInstagram, FaFacebookF, FaYoutube } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ManageHostsPage = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [pendingHosts, setPendingHosts] = useState([]);
  const [approvedHosts, setApprovedHosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [buttonLoadingId, setButtonLoadingId] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    try {
      setFetchLoading(true);
      await Promise.all([fetchPendingHosts(), fetchApprovedHosts()]);
    } finally {
      setFetchLoading(false);
    }
  };

  const fetchPendingHosts = async () => {
    const res = await axios.get('http://localhost:8080/api/admin/pending-hosts');
    setPendingHosts(res.data.data || []);
  };

  const fetchApprovedHosts = async () => {
    const res = await axios.get('http://localhost:8080/api/admin/verified-hosts');
    setApprovedHosts(res.data.data || []);
  };

  const handleApprove = async (id) => {
    try {
      setButtonLoadingId(id);
      await axios.put(`http://localhost:8080/api/admin/approve-host/${id}`);
      toast.success('Host approved successfully!', { autoClose: 2000 });
      refreshData();
      fetchApprovedHosts();
    } catch (error) {
      console.error('Approve error:', error);
      toast.error('Failed to approve host!', { autoClose: 2000 });
    } finally {
      setButtonLoadingId(null);
    }
  };

  const handleReject = async (id) => {
    try {
      setButtonLoadingId(id);
      await axios.delete(`http://localhost:8080/api/admin/delete-host/${id}`);
      toast.success('Host rejected and deleted!', { autoClose: 2000 });
      refreshData();
      fetchApprovedHosts();
    } catch (error) {
      console.error('Reject error:', error);
      toast.error('Failed to delete host!', { autoClose: 2000 });
    } finally {
      setButtonLoadingId(null);
    }
  };
  return (
    <div className={`${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-black'} font-poppins min-h-screen flex flex-col transition-colors duration-300`}>
      <ToastContainer position="top-center" autoClose={3000} />

      {/* 🌐 Navbar */}
      <nav className={`${darkMode ? 'bg-gray-900' : 'bg-gray-100'} shadow-md py-4 px-8 flex justify-between items-center`}>
        <div className="flex items-center space-x-3">
          <FaUsersCog className={`text-3xl ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
          <Link to={"/adminPage"}>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>Manage Hosts</h1>
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
      <section className={`py-8 px-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className={`text-4xl font-bold mb-6 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>Manage Hosts</h2>
          <p className="text-lg leading-relaxed">
            Approve or reject hosts based on their registration status.
          </p>
        </div>
      </section>

      {/* 🎮 Approved Hosts */}
      <section className={`py-8 px-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-semibold mb-4">Approved Hosts</h3>
          <table className="min-w-full table-auto border-collapse">
            <thead>
              <tr className={`${darkMode ? 'bg-gray-800' : 'bg-gray-200'} text-left`}>
                <th className="border px-4 py-2">Profile</th> {/* 👈 Added */}
                <th className="border px-4 py-2">Name</th>
                <th className="border px-4 py-2">Email</th>
                <th className="border px-4 py-2">Mobile</th>
              </tr>
            </thead>
            <tbody>
              {approvedHosts.map(host => (
                <tr key={host.id} className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} border-b`}>
                  <td className="px-4 py-2">
                    <img src={host.imageUrl} alt="Profile" className="h-12 w-12 rounded-full object-cover" />
                  </td>
                  <td className="px-4 py-2">{host.fullName}</td>
                  <td className="px-4 py-2">{host.email}</td>
                  <td className="px-4 py-2">{host.mobile}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 🧑‍💼 Pending Hosts */}
      <section className={`py-8 px-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-semibold mb-4">Pending Hosts</h3>

          {fetchLoading ? (
            <div className="text-center py-20">
              <div className="animate-spin h-10 w-10 border-t-2 border-b-2 border-yellow-400 rounded-full mx-auto"></div>
              <p className="mt-4 text-lg font-semibold">Loading hosts...</p>
            </div>
          ) : (
            <table className="min-w-full table-auto border-collapse">
              <thead>
                <tr className={`${darkMode ? 'bg-gray-800' : 'bg-gray-200'} text-left`}>
                  <th className="border px-4 py-2">Profile</th> {/* 👈 Added */}
                  <th className="border px-4 py-2">Name</th>
                  <th className="border px-4 py-2">Email</th>
                  <th className="border px-4 py-2">Mobile</th>
                  <th className="border px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingHosts.map(host => (
                  <tr key={host.id} className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} border-b`}>
                    <td className="px-4 py-2">
                      <img src={host.imageUrl} alt="Profile" className="h-12 w-12 rounded-full object-cover" />
                    </td>
                    <td className="px-4 py-2">{host.fullName}</td>
                    <td className="px-4 py-2">{host.email}</td>
                    <td className="px-4 py-2">{host.mobile}</td>
                    <td className="px-4 py-2 flex justify-center space-x-4">
                      {/* Approve & Reject buttons with spinner */}
                      <button
                        onClick={() => handleApprove(host.id)}
                        disabled={buttonLoadingId === host.id}
                        className="flex items-center text-green-500 hover:text-green-700"
                      >
                        {buttonLoadingId === host.id ? (
                          <svg className="animate-spin h-5 w-5 mr-2 border-t-2 border-b-2 border-green-500 rounded-full" viewBox="0 0 24 24"></svg>
                        ) : (
                          <FaCheckCircle className="inline mr-1" />
                        )}
                        Approve
                      </button>

                      <button
                        onClick={() => handleReject(host.id)}
                        disabled={buttonLoadingId === host.id}
                        className="flex items-center text-red-500 hover:text-red-700"
                      >
                        {buttonLoadingId === host.id ? (
                          <svg className="animate-spin h-5 w-5 mr-2 border-t-2 border-b-2 border-red-500 rounded-full" viewBox="0 0 24 24"></svg>
                        ) : (
                          <FaTimesCircle className="inline mr-1" />
                        )}
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

export default ManageHostsPage;
