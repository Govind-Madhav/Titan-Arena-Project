/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import React, { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

export default function ProtectedRoute({ children }) {
    const { isAuthenticated } = useAuthStore()
    const location = useLocation()

    if (!isAuthenticated) {
        return <Navigate to="/auth" state={{ from: location }} replace />
    }

    return children
}
