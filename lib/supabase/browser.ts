import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_PUBLIC_URL, SUPABASE_PUBLISHABLE_KEY } from './public-config'

/** Browser client: signs in with Supabase Auth and stores the session in cookies */
export function createSupabaseBrowserClient() {
    return createBrowserClient(SUPABASE_PUBLIC_URL, SUPABASE_PUBLISHABLE_KEY)
}
