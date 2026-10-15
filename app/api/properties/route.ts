import { supabase } from '@/lib/utils/supabase-client'

// Always query Supabase at request time; without this Next prerenders the
// response at build time and the list never updates.
export const dynamic = 'force-dynamic'

export async function GET() {
    console.log('[Properties API] 📋 Fetching all properties from Supabase...')

    try {
        const { data, error, count } = await supabase
            .from('society')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[Properties API] ❌ Error fetching properties:', error)
            return Response.json({
                success: false,
                error: error.message
            }, { status: 500 })
        }

        console.log('[Properties API] ✅ Fetched properties:', count)

        return Response.json({
            success: true,
            count,
            properties: data
        })
    } catch (err: any) {
        console.error('[Properties API] ❌ Exception:', err)
        return Response.json({
            success: false,
            error: err.message
        }, { status: 500 })
    }
}
