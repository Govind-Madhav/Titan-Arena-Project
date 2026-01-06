/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import axios from 'axios'
import useAuthStore from '../store/authStore'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Important for cookies
})

import { auth } from './firebase'

// Request interceptor to add auth token (Hardened Firebase Identity)
api.interceptors.request.use(
    async (config) => {
        // 1. Check for active Firebase user
        const firebaseUser = auth.currentUser

        if (firebaseUser) {
            try {
                // Firebase handles refresh automatically, we just pull the current token
                const token = await firebaseUser.getIdToken()
                config.headers.Authorization = `Bearer ${token}`
                return config
            } catch (e) {
                console.error('🔐 API Security: Failed to fetch Firebase ID token')
            }
        }

        // 2. Legacy Fallback (for existing sessions during migration)
        const authData = localStorage.getItem('titan-auth')
        if (authData) {
            try {
                const { state } = JSON.parse(authData)
                if (state?.accessToken) {
                    config.headers.Authorization = `Bearer ${state.accessToken}`
                }
            } catch (e) {
                console.warn('API: Failed to parse legacy auth data')
            }
        }
        return config
    },
    (error) => Promise.reject(error)
)

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
            // Prevent Redirect Loop for Auth Checks
            const isAuthCheck = originalRequest.url.includes('/auth/me') || originalRequest.url.includes('/auth/sync')

            if (isAuthCheck) {
                // If /auth/me fails, it means even the cookie revival failed. Clear local auth.
                localStorage.removeItem('titan-auth')
                return Promise.reject(error)
            }

            originalRequest._retry = true

            try {
                // Attempt to refresh the token using the refreshToken cookie
                const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true })

                if (response.data.success) {
                    const { accessToken, expiresAt } = response.data.data

                    // Update global state
                    useAuthStore.setState({
                        accessToken,
                        tokenExpiresAt: expiresAt,
                        isAuthenticated: true
                    })

                    // Update the Authorization header and retry the original request
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`

                    // Re-try the original request
                    return api(originalRequest)
                }
            } catch (refreshError) {
                // Refresh failed, probably cookie expired or revoked.
                console.error('🔐 API: Refresh token invalid or expired.')

                // Only redirect if not already on auth page and not a background sync
                if (window.location.pathname !== '/auth' && !isAuthCheck) {
                    localStorage.removeItem('titan-auth')
                    window.location.href = '/auth'
                }
            }
        }

        return Promise.reject(error)
    }
)

export default api
