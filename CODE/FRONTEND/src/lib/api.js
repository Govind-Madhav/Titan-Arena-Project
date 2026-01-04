/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import axios from 'axios'

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
        if (error.response?.status === 401) {
            // If Firebase exists, it means the token is truly stale/invalid
            if (auth.currentUser) {
                // Potential force sign-out or session recovery
                console.warn('🔐 API: 401 Unauthorized for Firebase User. Potential session mismatch.')
            } else {
                // Legacy redirect
                localStorage.removeItem('titan-auth')
                window.location.href = '/auth'
            }
        }

        return Promise.reject(error)
    }
)

export default api
