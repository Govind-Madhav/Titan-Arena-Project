import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
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
            originalRequest._retry = true

            try {
                const authData = localStorage.getItem('titan-auth')
                if (authData) {
                    const { state } = JSON.parse(authData)
                    if (state?.refreshToken) {
                        const res = await axios.post(
                            `${api.defaults.baseURL}/auth/refresh`,
                            { refreshToken: state.refreshToken }
                        )

                        const newToken = res.data.data.accessToken

                        // Update stored token
                        const newState = { ...state, accessToken: newToken }
                        localStorage.setItem('titan-auth', JSON.stringify({ state: newState }))

                        originalRequest.headers.Authorization = `Bearer ${newToken}`
                        return api(originalRequest)
                    }
                }
            } catch (refreshError) {
                // Refresh failed, clear auth
                localStorage.removeItem('titan-auth')
                window.location.href = '/auth'
            }
        }

        return Promise.reject(error)
    }
)

export default api
