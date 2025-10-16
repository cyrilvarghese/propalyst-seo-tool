/**
 * Supabase Client Utility
 * Simple client-side connection following official docs
 * https://supabase.com/docs/reference/javascript/initializing
 */

import { createClient } from '@supabase/supabase-js'

// Use environment variables for Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL || 'https://ayxhtlzyhpsjykxxnqqh.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_wsYTO6mIpSbbFvrbdKS_yA_40dZmY2B'

// Create a single supabase client for interacting with your database
const supabase = createClient(supabaseUrl, supabaseKey)

export { supabase }
