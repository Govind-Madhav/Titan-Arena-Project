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

// Queue for requests during token refresh
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error)
        } else {
            prom.resolve(token)
        }
    })
    failedQueue = []
}

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        // Get auth store dynamically to avoid circular dependency
        const authData = localStorage.getItem('titan-auth')
        if (authData) {
            try {
                const { state } = JSON.parse(authData)
                if (state?.accessToken) {
                    config.headers.Authorization = `Bearer ${state.accessToken}`
                }
            } catch (e) {
                console.error('Failed to parse auth data')
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

        // If 401 and not already retrying, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // If already refreshing, queue this request
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`
                    return api(originalRequest)
                }).catch(err => {
                    return Promise.reject(err)
                })
            }

            originalRequest._retry = true
            isRefreshing = true

            try {
                // Call refresh endpoint (cookie will be sent automatically)
                const res = await axios.post(
                    `${api.defaults.baseURL}/auth/refresh`,
                    {},
                    { withCredentials: true }
                )

                const { accessToken, expiresAt } = res.data.data

                // Update stored token
                const authData = localStorage.getItem('titan-auth')
                if (authData) {
                    const parsed = JSON.parse(authData)
                    parsed.state.accessToken = accessToken
                    parsed.state.tokenExpiresAt = expiresAt
                    localStorage.setItem('titan-auth', JSON.stringify(parsed))
                }

                // Process queued requests
                processQueue(null, accessToken)
                isRefreshing = false

                // Retry original request
                originalRequest.headers.Authorization = `Bearer ${accessToken}`
                return api(originalRequest)
            } catch (refreshError) {
                // Refresh failed, clear auth and redirect
                processQueue(refreshError, null)
                isRefreshing = false

                localStorage.removeItem('titan-auth')
                window.location.href = '/auth'

                return Promise.reject(refreshError)
            }
        }

        return Promise.reject(error)
    }
)

export default api
