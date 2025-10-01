/**
 * Supabase Client Utility
 * Simple client-side connection following official docs
 * https://supabase.com/docs/reference/javascript/initializing
 */

import { createClient } from '@supabase/supabase-js'

// Create a single supabase client for interacting with your database
const supabase = createClient(
    'https://ayxhtlzyhpsjykxxnqqh.supabase.co',
    'sb_publishable_wsYTO6mIpSbbFvrbdKS_yA_40dZmY2B'
)

export { supabase }
