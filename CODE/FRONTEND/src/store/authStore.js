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

            login: async (email, password, rememberMe = true) => {
                set({ isLoading: true })
                try {
                    const res = await api.post('/auth/login', { email, password })
                    const { user, accessToken, expiresAt } = res.data.data

                    set({
                        user,
                        accessToken,
                        tokenExpiresAt: expiresAt,
                        isAuthenticated: true,
                        isLoading: false
                    })

                    // Start token refresh timer
                    get().startTokenRefreshTimer()

                    // Notify other tabs
                    if (authChannel) {
                        authChannel.postMessage({
                            type: 'LOGIN',
                            data: { user, accessToken, tokenExpiresAt: expiresAt }
                        })
                    }

                    return { success: true }
                } catch (error) {
                    set({ isLoading: false })
                    return {
                        success: false,
                        message: error.response?.data?.message || 'Login failed'
                    }
                }
            },

            signup: async (email, password, username) => {
                set({ isLoading: true })
                try {
                    const res = await api.post('/auth/signup', { email, password, username })
                    const { user, accessToken, expiresAt } = res.data.data

                    set({
                        user,
                        accessToken,
                        tokenExpiresAt: expiresAt,
                        isAuthenticated: true,
                        isLoading: false
                    })

                    // Start token refresh timer
                    get().startTokenRefreshTimer()

                    // Notify other tabs
                    if (authChannel) {
                        authChannel.postMessage({
                            type: 'LOGIN',
                            data: { user, accessToken, tokenExpiresAt: expiresAt }
                        })
                    }

                    return { success: true }
                } catch (error) {
                    set({ isLoading: false })
                    return {
                        success: false,
                        message: error.response?.data?.message || 'Signup failed'
                    }
                }
            },

            logout: async () => {
                try {
                    await api.post('/auth/logout')
                } catch (error) {
                    console.error('Logout error:', error)
                } finally {
                    get().clearAuth()

                    // Notify other tabs
                    if (authChannel) {
                        authChannel.postMessage({ type: 'LOGOUT' })
                    }
                }
            },

            logoutAllDevices: async () => {
                try {
                    await api.post('/auth/logout-all')
                    get().clearAuth()

                    // Notify other tabs
                    if (authChannel) {
                        authChannel.postMessage({ type: 'LOGOUT' })
                    }

                    return { success: true }
                } catch (error) {
                    return {
                        success: false,
                        message: error.response?.data?.message || 'Failed to logout from all devices'
                    }
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
                    const res = await api.get('/auth/notifications')
                    return { success: true, data: res.data.data }
                } catch (error) {
                    console.error('Get notifications error:', error)
                    return { success: false, error }
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
