'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Navigation } from './navigation'

export function ConditionalNavigation() {
    const pathname = usePathname()
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
        // Check authentication status from localStorage
        const authStatus = localStorage.getItem('isAuthenticated') === 'true'
        setIsAuthenticated(authStatus)
    }, [])

    // Don't render navigation during SSR to avoid hydration mismatch
    if (!isClient) {
        return null
    }

    // Hide navigation on login page
    if (pathname === '/login') {
        return null
    }

    // Only show navigation if user is authenticated
    if (!isAuthenticated) {
        return null
    }

    return <Navigation />
}