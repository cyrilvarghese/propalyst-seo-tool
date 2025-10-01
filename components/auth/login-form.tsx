'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Dummy credentials for demo
const DEMO_CREDENTIALS = {
    email: 'demo@propalyst.com',
    password: 'password123'
}

export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"form">) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        // Simulate authentication delay (like a real API call)
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Check dummy credentials
        if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
            // Store simple auth state in localStorage (demo only)
            localStorage.setItem('isAuthenticated', 'true')
            localStorage.setItem('userEmail', email)

            // Redirect to home page using Next.js router
            router.push('/')
        } else {
            setError('Invalid credentials. Use demo@propalyst.com / password123')
        }

        setIsLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6", className)} {...props}>
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Login to your account</h1>
                <p className="text-muted-foreground text-sm text-balance">
                    Enter your email below to login to your account
                </p>
                {/* Demo credentials hint */}
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-blue-800 text-xs">
                        <strong>Demo credentials:</strong><br />
                        Email: demo@propalyst.com<br />
                        Password: password123
                    </p>
                </div>
            </div>
            <div className="grid gap-6">
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-red-800 text-sm">{error}</p>
                    </div>
                )}
                <div className="grid gap-3">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="demo@propalyst.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="grid gap-3">
                    <div className="flex items-center">
                        <Label htmlFor="password">Password</Label>
                    </div>
                    <Input
                        id="password"
                        type="password"
                        placeholder="password123"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Logging in...' : 'Login'}
                </Button>
            </div>
        </form>
    )
}