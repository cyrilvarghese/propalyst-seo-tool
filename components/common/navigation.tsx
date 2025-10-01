'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function Navigation() {
    const [userEmail, setUserEmail] = useState('')
    const router = useRouter()

    useEffect(() => {
        // Get user email from localStorage
        const email = localStorage.getItem('userEmail') || ''
        setUserEmail(email)
    }, [])

    const handleLogout = () => {
        // Clear authentication data
        localStorage.removeItem('isAuthenticated')
        localStorage.removeItem('userEmail')

        // Redirect to login page
        router.push('/login')
    }

    return (
        <nav className="bg-white shadow-sm border-b p-4">
            <div className="container mx-auto flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <Link href="/" className="text-xl font-bold text-gray-900">
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Propalyst
                        </span>
                    </Link>
                    <div className="flex gap-4">
                        <Link
                            href="/"
                            className="text-gray-700 hover:text-blue-600 transition-colors"
                        >
                            Search
                        </Link>
                        <Link
                            href="/properties"
                            className="text-gray-700 hover:text-blue-600 transition-colors"
                        >
                            Properties
                        </Link>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                        Welcome, {userEmail || 'User'}!
                    </span>
                    <button
                        onClick={handleLogout}
                        className="text-sm text-gray-700 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    )
}