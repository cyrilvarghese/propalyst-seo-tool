import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { SUPABASE_PUBLIC_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/supabase/public-config'

// Reachable without a session. Everything else (pages and API routes) needs a
// signed-in Supabase user whose profiles.role includes "admin".
const PUBLIC_PATHS = ['/login', '/robots.txt']

function withNoIndex(response: NextResponse): NextResponse {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    return response
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    if (PUBLIC_PATHS.includes(pathname)) {
        return withNoIndex(NextResponse.next())
    }

    // Standard @supabase/ssr pattern: refreshed session cookies are written to
    // both the request (for this render) and the response (for the browser).
    let response = NextResponse.next({ request })
    const supabase = createServerClient(SUPABASE_PUBLIC_URL, SUPABASE_PUBLISHABLE_KEY, {
        cookies: {
            getAll() {
                return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                response = NextResponse.next({ request })
                cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
            }
        }
    })

    // Refreshes an expired access token using the refresh token, if needed
    const { data: { session } } = await supabase.auth.getSession()

    // is_admin() runs as the caller: PostgREST verifies the JWT signature and
    // expiry, so a forged or stale cookie errors here and is denied. It is the
    // same check the main Propalyst app uses (admin token in profiles.role).
    let isAdmin = false
    if (session) {
        const { data, error } = await supabase.rpc('is_admin')
        isAdmin = !error && data === true
    }

    if (isAdmin) {
        return withNoIndex(response)
    }

    if (pathname.startsWith('/api/')) {
        return withNoIndex(NextResponse.json(
            { error: session ? 'Admin access required' : 'Unauthorized' },
            { status: session ? 403 : 401 }
        ))
    }

    const loginUrl = new URL('/login', request.url)
    if (session) loginUrl.searchParams.set('error', 'not-admin')
    return withNoIndex(NextResponse.redirect(loginUrl))
}

export const config = {
    // Skip Next's static build assets; they hold no data
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
