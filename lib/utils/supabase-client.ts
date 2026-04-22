/**
 * Supabase Client Utility
 * Server-only clients for read and admin access.
 *
 * Reads can use the publishable key. All server-side writes must use the
 * service-role key because the public role is blocked by RLS on writes.
 */

import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/supabase'

const supabaseUrl = process.env.SUPABASE_URL || 'https://ayxhtlzyhpsjykxxnqqh.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_wsYTO6mIpSbbFvrbdKS_yA_40dZmY2B'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const clientOptions = {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey, clientOptions)

let supabaseAdmin: SupabaseClient<Database> | null = null

export function hasSupabaseServiceRoleKey(): boolean {
    return Boolean(supabaseServiceRoleKey)
}

export function getSupabaseAdmin() {
    if (!supabaseServiceRoleKey) {
        throw new Error(
            'SUPABASE_SERVICE_ROLE_KEY is required for server-side writes. ' +
            'SUPABASE_KEY is a public key and is blocked by RLS for inserts and updates.'
        )
    }

    if (!supabaseAdmin) {
        supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, clientOptions)
    }

    return supabaseAdmin
}

export { supabase }
