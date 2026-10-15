/**
 * Public Supabase settings for browser sign-in and middleware.
 *
 * The publishable key is designed to be public (RLS protects the data), so it
 * is safe in the client bundle. Same project as the other Propalyst apps.
 */
export const SUPABASE_PUBLIC_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ayxhtlzyhpsjykxxnqqh.supabase.co'

export const SUPABASE_PUBLISHABLE_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_KEY || 'sb_publishable_wsYTO6mIpSbbFvrbdKS_yA_40dZmY2B'
