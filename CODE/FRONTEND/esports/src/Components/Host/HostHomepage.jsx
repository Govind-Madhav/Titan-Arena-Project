import React from 'react';
import '@fontsource/poppins';
import { FaTrophy, FaUsers, FaMoneyBillAlt, FaMedal, FaGamepad, FaCrown, FaFire, FaStar, FaChartBar, FaDollarSign, FaCalendarAlt } from 'react-icons/fa';
import { motion } from 'framer-motion';
import Layout from '../Layout';
import { useAuth } from '../../Context/AuthContext';

const HostPage = () => {
  const { user } = useAuth();

  return (
    <Layout userRole="HOST">
      {/* 🎮 Hero Section */}
      <section className="relative py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-black overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
        
        {/* Floating Gaming Elements */}
        <div className="absolute top-20 left-10 animate-bounce">
          <FaGamepad className="text-yellow-400 text-4xl opacity-30" />
        </div>
        <div className="absolute top-40 right-20 animate-pulse">
          <FaTrophy className="text-blue-400 text-3xl opacity-30" />
        </div>
        <div className="absolute bottom-40 left-20 animate-bounce delay-1000">
          <FaCrown className="text-purple-400 text-3xl opacity-30" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                Host Dashboard
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 font-light">
              Welcome back, {user?.fullName || 'Host'}!
            </p>
            <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
              Create and manage epic tournaments that bring players together. 
              Track registrations, handle payments, and declare champions with professional tools.
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-400 mb-2">12+</div>
                <div className="text-gray-400">Active Tournaments</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-400 mb-2">450+</div>
                <div className="text-gray-400">Total Players</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-400 mb-2">$15K+</div>
                <div className="text-gray-400">Prize Pool</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-400 mb-2">98%</div>
                <div className="text-gray-400">Success Rate</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 🎮 Host Features Section */}
      <section className="py-24 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Host Tools
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Professional tools to create and manage epic tournaments
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <FaTrophy className="text-5xl" />,
                title: "Manage Tournaments",
                description: "Create, update, and organize tournaments with professional tools and real-time analytics.",
                color: "from-yellow-500 to-orange-500",
                hoverColor: "hover:shadow-yellow-500/25",
                link: "/hostTourn"
              },
              {
                icon: <FaUsers className="text-5xl" />,
                title: "View Players",
                description: "Monitor players participating in your tournaments and manage registrations effectively.",
                color: "from-blue-500 to-purple-500",
                hoverColor: "hover:shadow-blue-500/25",
                link: "/hostUsers"
              },
              {
                icon: <FaMoneyBillAlt className="text-5xl" />,
                title: "Track Payments",
                description: "Monitor payment status and ensure smooth financial transactions for your events.",
                color: "from-purple-500 to-pink-500",
                hoverColor: "hover:shadow-purple-500/25",
                link: "/hostUsersPayment"
              },
              {
                icon: <FaMedal className="text-5xl" />,
                title: "Declare Winners",
                description: "Announce champions and keep participants updated with their achievements.",
                color: "from-green-500 to-emerald-500",
                hoverColor: "hover:shadow-green-500/25",
                link: "/declare-winners"
              }
            ].map((feature, i) => (
              <motion.a
                key={i}
                href={feature.link}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                whileHover={{ scale: 1.05, rotateY: 5 }}
                className={`group relative bg-gradient-to-br ${feature.color} p-8 rounded-2xl ${feature.hoverColor} transition-all duration-300 cursor-pointer block`}
              >
                <div className="absolute inset-0 bg-black/20 rounded-2xl group-hover:bg-black/10 transition-all duration-300"></div>
                <div className="relative z-10 text-center">
                  <div className="mb-6 text-white group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4">{feature.title}</h3>
                  <p className="text-gray-200 leading-relaxed text-sm">{feature.description}</p>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* 📊 Host Stats Section */}
      <section className="py-24 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Tournament Analytics
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Track your tournament performance and player engagement
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Upcoming Tournaments",
                value: "8",
                change: "+3 this week",
                icon: <FaCalendarAlt className="text-3xl text-yellow-400" />,
                color: "from-yellow-500/20 to-orange-500/20"
              },
              {
                title: "Active Players",
                value: "324",
                change: "+15% growth",
                icon: <FaUsers className="text-3xl text-blue-400" />,
                color: "from-blue-500/20 to-purple-500/20"
              },
              {
                title: "Total Revenue",
                value: "$8,450",
                change: "+22% this month",
                icon: <FaDollarSign className="text-3xl text-green-400" />,
                color: "from-green-500/20 to-emerald-500/20"
              }
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className={`group relative bg-gradient-to-br ${stat.color} border border-gray-700 rounded-2xl p-8 hover:border-yellow-400/50 transition-all duration-300`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="text-white group-hover:scale-110 transition-transform duration-300">
                    {stat.icon}
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                    <div className="text-sm text-green-400 font-semibold">{stat.change}</div>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{stat.title}</h3>
                <p className="text-gray-300 text-sm">Real-time data</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default HostPage;
