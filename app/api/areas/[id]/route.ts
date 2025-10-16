/**
 * API Route: /api/areas/[id]
 * GET: Fetch single area by ID with all enriched data + societies in this area
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/utils/supabase-client'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params

        console.log(`[Area API] 📋 Fetching area: ${id}`)

        // Fetch area with all enriched data
        const { data: areaData, error: areaError } = await supabase
            .from('local_areas')
            .select(`
                *,
                cities (
                    id,
                    name
                )
            `)
            .eq('id', id)
            .single()

        if (areaError || !areaData) {
            console.error('[Area API] ❌ Area not found:', areaError)
            return NextResponse.json({
                success: false,
                error: 'Area not found'
            }, { status: 404 })
        }

        // Fetch all societies in this area
        const { data: societies, error: societiesError } = await supabase
            .from('society')
            .select(`
                id,
                name,
                slug,
                description,
                confidence_score,
                created_at,
                specifications,
                location
            `)
            .eq('area', id)
            .order('created_at', { ascending: false })

        if (societiesError) {
            console.warn('[Area API] ⚠️ Failed to fetch societies:', societiesError)
        }

        // Transform area data
        const area = {
            id: areaData.id,
            area: areaData.area,
            cityId: areaData.city_id,
            cityName: (areaData.cities as any)?.name || 'Unknown',
            citySection: areaData.city_section,
            overview: areaData.overview,
            description: areaData.description,
            slug: areaData.slug,
            featuredImageUrl: areaData.featured_image_url,
            propertyCount: areaData.property_count || 0,
            createdAt: areaData.created_at,

            // JSONB enriched data
            vibeAndLifestyle: areaData.vibe_and_lifestyle,
            marketData: areaData.market_data,
            infrastructure: areaData.infrastructure,
            localAmenities: areaData.local_amenities,
            buyerIntelligence: areaData.buyer_intelligence,
            narratives: areaData.narratives,
            areaImages: areaData.area_images || [],
            blogContent: areaData.blog_content,

            // AI metadata
            confidenceScore: areaData.confidence_score,
            lastAnalyzed: areaData.last_analyzed,
            dataSource: areaData.data_source,
            searchQueriesUsed: areaData.search_queries_used
        }

        console.log(`[Area API] ✅ Fetched area: ${area.area} with ${societies?.length || 0} societies`)

        return NextResponse.json({
            success: true,
            area,
            societies: societies || []
        })

    } catch (error: any) {
        console.error('[Area API] ❌ Error:', error)
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}
