'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createSupabaseBrowserClient } from "@/lib/supabase/browser"

const NOT_ADMIN_MESSAGE = 'This account does not have admin access. Ask an admin to add the admin role to your profile.'

export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"form">) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    // Middleware sends signed-in non-admins back here with ?error=not-admin
    useEffect(() => {
        if (new URLSearchParams(window.location.search).get('error') === 'not-admin') {
            setError(NOT_ADMIN_MESSAGE)
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            // Same Supabase accounts as the main Propalyst app. The session is
            // stored in cookies, which middleware checks on every request.
            const supabase = createSupabaseBrowserClient()
            const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

            if (signInError) {
                setError(signInError.message)
                setIsLoading(false)
                return
            }

            // Only admins (admin token in profiles.role) may use this tool
            const { data: isAdmin } = await supabase.rpc('is_admin')
            if (isAdmin !== true) {
                await supabase.auth.signOut()
                setError(NOT_ADMIN_MESSAGE)
                setIsLoading(false)
                return
            }

            // UI-only state for the nav and client guards; access control is middleware
            localStorage.setItem('isAuthenticated', 'true')
            localStorage.setItem('userEmail', email)
            router.push('/')
            router.refresh()
        } catch {
            setError('Could not reach the server. Try again.')
        }

        setIsLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6", className)} {...props}>
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Login to your account</h1>
                <p className="text-muted-foreground text-sm text-balance">
                    Sign in with your Propalyst admin account
                </p>
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
                        placeholder="you@propalyst.com"
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