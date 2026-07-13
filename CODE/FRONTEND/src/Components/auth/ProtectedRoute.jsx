/* eslint-disable react/prop-types */
/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

export default function ProtectedRoute({ children, allowedRoles }) {
    const { isAuthenticated, isInitialized, isLoading, user } = useAuthStore()
    const location = useLocation()

    if (!isInitialized || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white/60">
                Checking session...
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/auth" state={{ from: location }} replace />
    }

    if (allowedRoles && allowedRoles.length > 0) {
        const userRole = user?.role
        const userIsAdmin = user?.isAdmin

        const hasAccess =
            allowedRoles.includes(userRole) ||
            (allowedRoles.includes('ADMIN') && userIsAdmin) ||
            (allowedRoles.includes('HOST') && user?.hostStatus === 'ACTIVE')

        if (!hasAccess) {
            // Redirect admins to admin dashboard, others to player dashboard.
            if (userIsAdmin || userRole === 'ADMIN' || userRole === 'SUPERADMIN') {
                return <Navigate to="/admin" replace />
            }
            return <Navigate to="/dashboard" replace />
        }
    }

    return children
}
