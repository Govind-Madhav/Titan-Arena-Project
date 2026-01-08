/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

// Dedicated auth client to avoid circular dependency with api.js
const authApi = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    }
})

// Add interceptor to attach tokens (but avoid circular dependency)
authApi.interceptors.request.use(async (config) => {
    // Try to get Firebase token if available
    try {
        const { auth } = await import('../lib/firebase')
        const firebaseUser = auth.currentUser

        if (firebaseUser) {
            const token = await firebaseUser.getIdToken()
            config.headers.Authorization = `Bearer ${token}`
        }
    } catch (e) {
        // Firebase not available, continue without token
    }

    return config
})

const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000 // Refresh 1 minute before expiry (14 min)

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
            isInitialized: false,
            isLoading: false,
            sessionWarningShown: false,
            refreshTimer: null,

            // Initialize auth state and start refresh timer
            initialize: async () => {
                set({ isLoading: true })
                const state = get()

                try {
                    // 1. Try to establish a fresh token first (cookie -> access token)
                    const refreshed = await get().refreshAuth()

                    if (refreshed) {
                        // 2. Only if we have a robust token, sync user details
                        await get().syncWithBackend()
                        set({ isAuthenticated: true })
                    } else {
                        // Refresh failed, clear auth
                        get().clearAuth()
                    }
                } catch (error) {
                    console.error('Initialization failed:', error)
                    get().clearAuth()
                } finally {
                    set({ isLoading: false, isInitialized: true })
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
                    isInitialized: false,
                    refreshTimer: null
                })
            },

            // NEW: Sync with Backend after Firebase Auth
            syncWithBackend: async (metadata = {}) => {
                set({ isLoading: true })
                try {
                    // ⚡ Use /auth/sync if providing metadata OR if we need to exchange Firebase session (no access token yet)
                    const hasMetadata = Object.keys(metadata).length > 0
                    const isSessionExchange = !get().accessToken
                    const endpoint = (hasMetadata || isSessionExchange) ? '/auth/sync' : '/auth/me'

                    const res = endpoint.includes('sync')
                        ? await authApi.post(endpoint, metadata)
                        : await authApi.get(endpoint)

                    const responseData = res.data.data

                    // Handle different response structures
                    // Sync/Login returns: { user, accessToken, expiresAt }
                    // Me returns: { ...user }
                    const user = responseData.accessToken ? responseData.user : responseData

                    if (responseData.accessToken) {
                        set({
                            accessToken: responseData.accessToken,
                            tokenExpiresAt: responseData.expiresAt
                        })
                    }

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
                    const res = await authApi.post('/auth/login', { email, password })
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
                    await authApi.post('/auth/logout')
                } catch (error) {
                    console.error('Logout error:', error)
                } finally {
                    get().clearAuth()
                }
            },

            getDashboard: async () => {
                try {
                    const { default: api } = await import('../lib/api')
                    const res = await api.get('/auth/dashboard')
                    return { success: true, data: res.data.data }
                } catch (error) {
                    console.error('Get dashboard error:', error)
                    return { success: false, error }
                }
            },

            getNotifications: async () => {
                try {
                    const { default: api } = await import('../lib/api')
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
                    const { default: api } = await import('../lib/api')
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
                    const { default: api } = await import('../lib/api')
                    const res = await api.patch('/users/me/profile', data)

                    // Optionally update local user state if core fields changed
                    set(state => ({ user: { ...state.user, ...data } }))

                    return { success: true, message: res.data.message }
                } catch (error) {
                    console.error('Update profile error:', error)
                    return { success: false, message: error.response?.data?.message }
                }
            },

            uploadAvatar: async (file, onProgress) => {
                try {
                    const { uploadAvatar } = await import('../lib/firebaseStorage')
                    const user = get().user

                    if (!user) throw new Error('User not authenticated')

                    // Upload to Firebase Storage
                    const avatarUrl = await uploadAvatar(file, user.id, onProgress)

                    // Update backend with new avatar URL
                    const { default: api } = await import('../lib/api')
                    const res = await api.patch('/users/me/profile', { avatarUrl })

                    // Update local state
                    set(state => ({
                        user: { ...state.user, avatarUrl }
                    }))

                    return { success: true, avatarUrl, message: 'Avatar updated successfully' }
                } catch (error) {
                    console.error('Upload avatar error:', error)
                    return { success: false, message: error.message || 'Failed to upload avatar' }
                }
            },

            addGameProfile: async (data) => {
                try {
                    const { default: api } = await import('../lib/api')
                    const res = await api.post('/users/me/games', data)
                    return { success: true, message: res.data.message }
                } catch (error) {
                    return { success: false, message: error.response?.data?.message }
                }
            },

            removeGameProfile: async (id) => {
                try {
                    const { default: api } = await import('../lib/api')
                    const res = await api.delete(`/users/me/games/${id}`)
                    return { success: true, message: res.data.message }
                } catch (error) {
                    return { success: false, message: error.response?.data?.message }
                }
            },

            getHostDashboard: async () => {
                try {
                    const { default: api } = await import('../lib/api')
                    const res = await api.get('/tournaments/host/dashboard')
                    return { success: true, data: res.data.data }
                } catch (error) {
                    console.error('Get host dashboard error:', error);
                    return { success: false, message: error.response?.data?.message || 'Failed to fetch host stats' }
                }
            },

            refreshAuth: async () => {
                try {
                    const res = await authApi.post('/auth/refresh')
                    const { accessToken, expiresAt } = res.data.data

                    set({
                        accessToken,
                        tokenExpiresAt: expiresAt
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
                    // Downgrade logs for expected auth expirations
                    if (error.response?.status && [400, 401, 403].includes(error.response.status)) {
                        console.warn('🔐 Session expired or invalid on refresh. Clearing auth.')
                    } else {
                        console.error('Token refresh failed:', error)
                    }
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
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
)

// Initialize on store creation
useAuthStore.getState().initialize()

export default useAuthStore
