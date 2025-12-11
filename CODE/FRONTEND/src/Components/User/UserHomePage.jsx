/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import React from 'react';
import { FaTrophy, FaUsers, FaGamepad, FaCrown, FaFire, FaStar, FaChartBar, FaDollarSign, FaCalendarAlt, FaMedal } from 'react-icons/fa';
import { motion } from 'framer-motion';
import Layout from '../Layout';
import { useAuth } from '../../Context/AuthContext';

const UserHomePage = () => {
  const { user } = useAuth();

  return (
    <Layout userRole="PLAYER">
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
                Player Dashboard
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 font-light">
              Welcome back, {user?.fullName || 'Champion'}!
            </p>
            <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
              Ready to dominate the competition? Join tournaments, climb the leaderboards, 
              and prove you're the ultimate esports champion.
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-400 mb-2">8</div>
                <div className="text-gray-400">Tournaments Joined</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-400 mb-2">3</div>
                <div className="text-gray-400">Tournaments Won</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-400 mb-2">#47</div>
                <div className="text-gray-400">Global Rank</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-400 mb-2">$2,450</div>
                <div className="text-gray-400">Total Winnings</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 🎮 Player Features Section */}
      <section className="py-24 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Player Tools
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Everything you need to dominate the competitive scene
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <FaTrophy className="text-5xl" />,
                title: "View Tournaments",
                description: "Browse available tournaments and explore details to find your perfect match.",
                color: "from-yellow-500 to-orange-500",
                hoverColor: "hover:shadow-yellow-500/25",
                link: "/viewTourn"
              },
              {
                icon: <FaCalendarAlt className="text-5xl" />,
                title: "My Tournaments",
                description: "Track tournaments you've joined and monitor your participation status.",
                color: "from-blue-500 to-purple-500",
                hoverColor: "hover:shadow-blue-500/25",
                link: "/userPaidTourn"
              },
              {
                icon: <FaCrown className="text-5xl" />,
                title: "Leaderboard",
                description: "Check your ranking and compare with other players worldwide.",
                color: "from-purple-500 to-pink-500",
                hoverColor: "hover:shadow-purple-500/25",
                link: "/leaderboard"
              },
              {
                icon: <FaUsers className="text-5xl" />,
                title: "Profile",
                description: "Update your profile details and manage your gaming account.",
                color: "from-green-500 to-emerald-500",
                hoverColor: "hover:shadow-green-500/25",
                link: "/profile"
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

      {/* 📊 Player Stats Section */}
      <section className="py-24 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Your Performance
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Track your progress and achievements in the competitive scene
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Win Rate",
                value: "87%",
                change: "+5% this month",
                icon: <FaStar className="text-3xl text-yellow-400" />,
                color: "from-yellow-500/20 to-orange-500/20"
              },
              {
                title: "Tournaments Played",
                value: "24",
                change: "+3 this week",
                icon: <FaTrophy className="text-3xl text-blue-400" />,
                color: "from-blue-500/20 to-purple-500/20"
              },
              {
                title: "Prize Money",
                value: "$2,450",
                change: "+$800 this month",
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
                <p className="text-gray-300 text-sm">Personal best</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default UserHomePage;
