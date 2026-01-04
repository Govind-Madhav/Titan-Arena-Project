/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/api'

const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000 // Refresh 1 minute before expiry (14 min)
const SESSION_WARNING_TIME = 2 * 60 * 1000 // Warn 2 minutes before expiry

// BroadcastChannel for multi-tab sync
const authChannel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('auth-channel')
    : null

const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            tokenExpiresAt: null,
            isAuthenticated: false,
            isLoading: false,
            sessionWarningShown: false,
            refreshTimer: null,

            // Initialize auth state and start refresh timer
            initialize: () => {
                const state = get()
                if (state.accessToken && state.tokenExpiresAt) {
                    get().startTokenRefreshTimer()
                }

                // Listen for auth events from other tabs
                if (authChannel) {
                    authChannel.onmessage = (event) => {
                        const { type, data } = event.data

                        if (type === 'LOGOUT') {
                            get().clearAuth()
                        } else if (type === 'LOGIN') {
                            set({
                                user: data.user,
                                accessToken: data.accessToken,
                                tokenExpiresAt: data.tokenExpiresAt,
                                isAuthenticated: true
                            })
                            get().startTokenRefreshTimer()
                        } else if (type === 'TOKEN_REFRESHED') {
                            set({
                                accessToken: data.accessToken,
                                tokenExpiresAt: data.tokenExpiresAt
                            })
                        }
                    }
                }
            },

            // Start automatic token refresh timer
            startTokenRefreshTimer: () => {
                const state = get()

                // Clear existing timer
                if (state.refreshTimer) {
                    clearTimeout(state.refreshTimer)
                }

                if (!state.tokenExpiresAt) return

                const expiresAt = new Date(state.tokenExpiresAt).getTime()
                const now = Date.now()
                const timeUntilRefresh = expiresAt - now - TOKEN_REFRESH_INTERVAL

                if (timeUntilRefresh > 0) {
                    const timer = setTimeout(() => {
                        get().refreshAuth()
                    }, timeUntilRefresh)

                    set({ refreshTimer: timer })
                } else {
                    // Token already expired or about to expire, refresh immediately
                    get().refreshAuth()
                }
            },

            // Clear auth state
            clearAuth: () => {
                const state = get()
                if (state.refreshTimer) {
                    clearTimeout(state.refreshTimer)
                }
                set({
                    user: null,
                    accessToken: null,
                    tokenExpiresAt: null,
                    isAuthenticated: false,
                    sessionWarningShown: false,
                    refreshTimer: null
                })
            },

            // NEW: Sync with Backend after Firebase Auth
            syncWithBackend: async (metadata = {}) => {
                set({ isLoading: true })
                try {
                    // ⚡ Use /auth/sync when metadata is provided (signup), otherwise /auth/me (login)
                    const endpoint = Object.keys(metadata).length > 0 ? '/auth/sync' : '/auth/me'
                    const res = endpoint === '/auth/sync'
                        ? await api.post(endpoint, metadata)
                        : await api.get(endpoint)

                    const user = res.data.data

                    set({
                        user,
                        isAuthenticated: true,
                        isLoading: false
                    })
                    return { success: true }
                } catch (error) {
                    console.error('Backend Sync Failed:', error.response?.data || error.message)
                    set({ isLoading: false, isAuthenticated: false, user: null })
                    return {
                        success: false,
                        message: error.response?.data?.message || 'Sync failed'
                    }
                }
            },

            // LEGACY: Keep for compatibility during transition, but redirect to new flow
            login: async (email, password) => {
                console.warn('⚠️ Legacy login called. Transitioning to Firebase Phone Auth is recommended.')
                set({ isLoading: true })
                try {
                    const res = await api.post('/auth/login', { email, password })
                    const { user, accessToken, expiresAt } = res.data.data
                    set({ user, accessToken, tokenExpiresAt: expiresAt, isAuthenticated: true, isLoading: false })
                    return { success: true }
                } catch (error) {
                    set({ isLoading: false })
                    return { success: false, message: error.response?.data?.message || 'Login failed' }
                }
            },

            // ... (other methods)

            logout: async () => {
                const { auth } = await import('../lib/firebase')
                try {
                    await auth.signOut()
                    await api.post('/auth/logout')
                } catch (error) {
                    console.error('Logout error:', error)
                } finally {
                    get().clearAuth()
                }
            },

            getDashboard: async () => {
                try {
                    const res = await api.get('/auth/dashboard')
                    return { success: true, data: res.data.data }
                } catch (error) {
                    console.error('Get dashboard error:', error)
                    return { success: false, error }
                }
            },

            getNotifications: async () => {
                try {
                    const res = await api.get('/notifications')
                    return { success: true, data: res.data.data }
                } catch (error) {
                    console.error('Get notifications error:', error)
                    return { success: false, error }
                }
            },

            // --- Profile Management ---

            getProfile: async () => {
                try {
                    const res = await api.get('/users/me/profile')
                    const fullProfile = res.data.data

                    // Update local state with fetched profile data
                    set(state => ({
                        user: {
                            ...state.user,
                            ...fullProfile.profile, // bio, avatarUrl, ign, etc.
                            // Ensure core user fields are preserved or updated if needed
                            email: fullProfile.email || state.user.email,
                            username: fullProfile.username || state.user.username
                        }
                    }))

                    return { success: true, data: fullProfile }
                } catch (error) {
                    console.error('Get profile error:', error)
                    return { success: false, message: error.response?.data?.message }
                }
            },

            updateProfile: async (data) => {
                try {
                    const res = await api.patch('/users/me/profile', data)

                    // Optionally update local user state if core fields changed
                    set(state => ({ user: { ...state.user, ...data } }))

                    return { success: true, message: res.data.message }
                } catch (error) {
                    console.error('Update profile error:', error)
                    return { success: false, message: error.response?.data?.message }
                }
            },

            addGameProfile: async (data) => {
                try {
                    const res = await api.post('/users/me/games', data)
                    return { success: true, message: res.data.message }
                } catch (error) {
                    return { success: false, message: error.response?.data?.message }
                }
            },

            removeGameProfile: async (id) => {
                try {
                    const res = await api.delete(`/users/me/games/${id}`)
                    return { success: true, message: res.data.message }
                } catch (error) {
                    return { success: false, message: error.response?.data?.message }
                }
            },

            getHostDashboard: async () => {
                try {
                    const res = await api.get('/tournaments/host/dashboard')
                    return { success: true, data: res.data.data }
                } catch (error) {
                    console.error('Get host dashboard error:', error);
                    return { success: false, message: error.response?.data?.message || 'Failed to fetch host stats' }
                }
            },

            refreshAuth: async () => {
                try {
                    const res = await api.post('/auth/refresh')
                    const { accessToken, expiresAt } = res.data.data

                    set({
                        accessToken,
                        tokenExpiresAt: expiresAt,
                        sessionWarningShown: false
                    })

                    // Restart the refresh timer
                    get().startTokenRefreshTimer()

                    // Notify other tabs
                    if (authChannel) {
                        authChannel.postMessage({
                            type: 'TOKEN_REFRESHED',
                            data: { accessToken, tokenExpiresAt: expiresAt }
                        })
                    }

                    return true
                } catch (error) {
                    console.error('Token refresh failed:', error)
                    get().clearAuth()

                    // Notify other tabs
                    if (authChannel) {
                        authChannel.postMessage({ type: 'LOGOUT' })
                    }

                    return false
                }
            },

            forgotPassword: async (email) => {
                const { auth } = await import('../lib/firebase')
                const { sendPasswordResetEmail } = await import('firebase/auth')
                set({ isLoading: true })
                try {
                    await sendPasswordResetEmail(auth, email)
                    set({ isLoading: false })
                    return { success: true }
                } catch (error) {
                    set({ isLoading: false })
                    console.error('Password reset error:', error)
                    return {
                        success: false,
                        message: error.code === 'auth/user-not-found'
                            ? 'No account found with this email'
                            : 'Failed to send reset email. Please try again.'
                    }
                }
            },

            // LEGACY: No longer used with Firebase reset flow
            resetPassword: async () => {
                return { success: false, message: 'Please use the link sent to your email.' }
            },

            getToken: () => get().accessToken,
        }),
        {
            name: 'titan-auth',
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                tokenExpiresAt: state.tokenExpiresAt,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
)

// Initialize on store creation
useAuthStore.getState().initialize()

export default useAuthStore
