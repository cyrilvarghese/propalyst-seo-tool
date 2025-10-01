'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface AuthGuardProps {
    children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        // Check if user is authenticated
        const authStatus = localStorage.getItem('isAuthenticated') === 'true'
        setIsAuthenticated(authStatus)
        setIsLoading(false)

        // If not authenticated and not on login page, redirect to login
        if (!authStatus && pathname !== '/login') {
            router.push('/login')
        }
    }, [pathname, router])

    // Show loading state during auth check
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        )
    }

    // Allow access to login page regardless of auth status
    if (pathname === '/login') {
        return <>{children}</>
    }

    // Protect other routes - only show if authenticated
    if (!isAuthenticated) {
        return null // Will be redirected by useEffect above
    }

    return <>{children}</>
}