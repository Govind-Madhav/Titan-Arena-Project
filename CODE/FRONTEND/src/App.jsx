/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './Components/layout/Layout'
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import SettingsPage from './pages/settings/SettingsPage'

// Player Components
import TournamentsPage from './pages/player/TournamentsPage'
import TournamentDetailPage from './pages/player/TournamentDetailPage'
import BracketPage from './pages/player/BracketPage'
import StreamPage from './pages/player/StreamPage'
import PlayerDashboard from './pages/player/DashboardPage'
import TeamsPage from './pages/player/TeamsPage'
import MatchesPage from './pages/player/MatchesPage'
import WalletPage from './pages/player/WalletPage'
import ProfilePage from './pages/player/ProfilePage'
import LeaderboardPage from './pages/player/LeaderboardPage'
import FeedPage from './pages/player/FeedPage' // New
import ClanPage from './pages/player/ClanPage'
import ClanDetailPage from './pages/player/ClanDetailPage'
import AchievementsPage from './pages/player/AchievementsPage'
import DisputesPage from './pages/player/DisputesPage'
import CommunityPage from './pages/player/CommunityPage'

import ProtectedRoute from './Components/auth/ProtectedRoute'
import SessionWarning from './Components/auth/SessionWarning'

// Admin Components
import AdminDashboard from './pages/admin/AdminPage'
import AdminDisputesPage from './pages/admin/AdminDisputesPage'
import ManageUsers from './pages/admin/ManageUsers'
import ManageHosts from './pages/admin/ManageHosts'
import ManageTournaments from './pages/admin/ManageTournaments'
import ManageKycPanel from './pages/admin/ManageKycPanel'

// Host Components
import HostDashboard from './pages/host/HostHomepage'
import HostManageTourn from './pages/host/HostmanageTourn'
import HostManageUser from './pages/host/HostManageUser'
import HostUserPayments from './pages/host/HostUserPayments'
import HostDeclareWinners from './pages/host/HostDeclareWinners'
import HostApplicationPage from './pages/host/HostApplicationPage' // New
import HostManageStream from './pages/host/HostManageStream'

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#050505',
            color: '#fff',
            border: '1px solid rgba(139, 92, 246, 0.5)',
            padding: '16px',
            borderRadius: '12px',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
            style: {
              border: '1px solid rgba(16, 185, 129, 0.4)',
            }
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
            style: {
              border: '1px solid rgba(239, 68, 68, 0.4)',
            }
          },
        }}
      />
      <SessionWarning />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Protected Routes with Layout */}
        <Route element={<Layout />}>
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/tournament/:id" element={<TournamentDetailPage />} />
          <Route path="/tournament/:id/bracket" element={<BracketPage />} />
          <Route path="/streams" element={<StreamPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <PlayerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teams"
            element={
              <ProtectedRoute>
                <TeamsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches"
            element={
              <ProtectedRoute>
                <MatchesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wallet"
            element={
              <ProtectedRoute>
                <WalletPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <LeaderboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clans"
            element={
              <ProtectedRoute>
                <ClanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clans/:id"
            element={
              <ProtectedRoute>
                <ClanDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/achievements"
            element={
              <ProtectedRoute>
                <AchievementsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/disputes"
            element={
              <ProtectedRoute>
                <DisputesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community"
            element={
              <ProtectedRoute>
                <CommunityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feed"
            element={<FeedPage />}
          />
        </Route>

        {/* Admin Routes - Protected & Self-Layout */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/disputes"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN']}>
              <AdminDisputesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manageUsers"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN']}>
              <ManageUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manageHosts"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN']}>
              <ManageHosts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manageApplications"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN']}>
              <ManageKycPanel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/kyc"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN']}>
              <ManageKycPanel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manageTourn"
          element={
            <ProtectedRoute allowedRoles={['HOST', 'ADMIN', 'SUPERADMIN']}>
              <HostManageTourn />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/manageTourn"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN']}>
              <ManageTournaments />
            </ProtectedRoute>
          }
        />
        {/* Host Routes - Protected & Self-Layout */}
        <Route
          path="/host/apply"
          element={
            <ProtectedRoute>
              <HostApplicationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/tournaments/:tournamentId/streams"
          element={
            <ProtectedRoute allowedRoles={['HOST']}>
              <HostManageStream />
            </ProtectedRoute>
          }
        />

        <Route
          path="/host"
          element={
            <ProtectedRoute allowedRoles={['HOST']}>
              <HostDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hostTourn"
          element={
            <ProtectedRoute allowedRoles={['HOST']}>
              <HostManageTourn />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hostUsers"
          element={
            <ProtectedRoute allowedRoles={['HOST']}>
              <HostManageUser />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hostUsersPayment"
          element={
            <ProtectedRoute allowedRoles={['HOST']}>
              <HostUserPayments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/declare-winners"
          element={
            <ProtectedRoute allowedRoles={['HOST']}>
              <HostDeclareWinners />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter >
  )
}

export default App
