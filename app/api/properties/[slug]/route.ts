import { supabase } from '@/lib/utils/supabase-client'

export async function GET(
    request: Request,
    { params }: { params: { slug: string } }
) {
    const { slug } = params

    console.log(`[Property API] 📋 Fetching property with slug: ${slug}`)

    try {
        const { data, error } = await supabase
            .from('society')
            .select('*')
            .eq('slug', slug)
            .single()

        if (error) {
            console.error('[Property API] ❌ Error fetching property:', error)
            return Response.json({
                success: false,
                error: error.message
            }, { status: 404 })
        }

        if (!data) {
            return Response.json({
                success: false,
                error: 'Property not found'
            }, { status: 404 })
        }

        console.log('[Property API] ✅ Fetched property:', data.name)

        return Response.json({
            success: true,
            property: data
        })
    } catch (err: any) {
        console.error('[Property API] ❌ Exception:', err)
        return Response.json({
            success: false,
            error: err.message
        }, { status: 500 })
    }
}
