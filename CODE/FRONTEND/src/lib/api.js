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

// Request interceptor to add auth token
api.interceptors.request.use(
    async (config) => {
        // 1. Priority: Use access token from live store (NOT localStorage)
        const { accessToken } = useAuthStore.getState()

        if (accessToken) {
            console.log('🔐 API: Using accessToken from store for', config.url)
            config.headers.Authorization = `Bearer ${accessToken}`
            return config
        }

        // 2. Fallback: Use Firebase ID token (ONLY for initial login/sync)
        const firebaseUser = auth.currentUser
        if (firebaseUser) {
            try {
                const token = await firebaseUser.getIdToken()
                console.log('🔐 API: Using Firebase token for', config.url)
                config.headers.Authorization = `Bearer ${token}`
            } catch (e) {
                console.error('🔐 API: Failed to fetch Firebase ID token')
            }
        } else {
            console.warn('🔐 API: No token available for', config.url)
        }

        return config
    },
    (error) => Promise.reject(error)
)

// Response interceptor - Let Zustand own refresh logic
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Avoid clearing auth on expected 401s from auth endpoints
        const isAuthEndpoint =
            error.config?.url?.includes('/auth/refresh') ||
            error.config?.url?.includes('/auth/me') ||
            error.config?.url?.includes('/auth/sync')

        if (error.response?.status === 401 && !isAuthEndpoint) {
            useAuthStore.getState().clearAuth()
        }

        return Promise.reject(error)
    }
)

export default api
