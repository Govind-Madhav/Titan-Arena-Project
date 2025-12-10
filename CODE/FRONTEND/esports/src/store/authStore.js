import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/api'

const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,

            login: async (email, password) => {
                set({ isLoading: true })
                try {
                    const res = await api.post('/auth/login', { email, password })
                    const { user, accessToken, refreshToken } = res.data.data
                    set({
                        user,
                        accessToken,
                        refreshToken,
                        isAuthenticated: true,
                        isLoading: false
                    })
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
                    const { user, accessToken, refreshToken } = res.data.data
                    set({
                        user,
                        accessToken,
                        refreshToken,
                        isAuthenticated: true,
                        isLoading: false
                    })
                    return { success: true }
                } catch (error) {
                    set({ isLoading: false })
                    return {
                        success: false,
                        message: error.response?.data?.message || 'Signup failed'
                    }
                }
            },

            logout: () => {
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false
                })
            },

            refreshAuth: async () => {
                const { refreshToken } = get()
                if (!refreshToken) return false

                try {
                    const res = await api.post('/auth/refresh', { refreshToken })
                    set({ accessToken: res.data.data.accessToken })
                    return true
                } catch {
                    get().logout()
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
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
)

export default useAuthStore
