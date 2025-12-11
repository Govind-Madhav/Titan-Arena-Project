/**
 * Copyright (c) 2025 Titan E-sports. All rights reserved.
 * This code is proprietary and confidential.
 */

import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout({ children }) {
    return (
        <div className="min-h-screen bg-titan-bg">
            <Navbar />
            <main className="pt-16">
                {children || <Outlet />}
            </main>
        </div>
    )
}
