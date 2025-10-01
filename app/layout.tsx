import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ConditionalNavigation } from '@/components/common/conditional-navigation'
import { AuthGuard } from '@/components/common/auth-guard'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Propalyst - Real Estate Search',
    description: 'Intelligent real estate property search across multiple platforms',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <AuthGuard>
                    <ConditionalNavigation />
                    {children}
                </AuthGuard>
            </body>
        </html>
    )
}