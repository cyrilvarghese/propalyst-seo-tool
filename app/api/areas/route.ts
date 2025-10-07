/**
 * API Route: /api/areas
 * GET: Fetch all areas with property counts (JOIN with cities table)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/utils/supabase-client'

export async function GET(request: NextRequest) {
    try {
        console.log('[Areas API] 📋 Fetching all areas from database...')

        // Fetch all areas with JOIN to cities table
        const { data, error } = await supabase
            .from('local_areas')
            .select(`
                id,
                area,
                city_id,
                city_section,
                overview,
                description,
                slug,
                featured_image_url,
                property_count,
                confidence_score,
                last_analyzed,
                data_source,
                created_at,
                cities (
                    id,
                    name
                )
            `)
            .order('property_count', { ascending: false })

        if (error) {
            console.error('[Areas API] ❌ Database error:', error)
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch areas from database'
            }, { status: 500 })
        }

        // Transform data to include city name at top level
        const areas = (data || []).map(area => ({
            id: area.id,
            area: area.area,
            cityId: area.city_id,
            cityName: (area.cities as any)?.name || 'Unknown',
            citySection: area.city_section,
            overview: area.overview,
            description: area.description,
            slug: area.slug,
            featuredImageUrl: area.featured_image_url,
            propertyCount: area.property_count || 0,
            confidenceScore: area.confidence_score,
            lastAnalyzed: area.last_analyzed,
            dataSource: area.data_source,
            createdAt: area.created_at
        }))

        console.log(`[Areas API] ✅ Fetched ${areas.length} areas`)

        return NextResponse.json({
            success: true,
            areas,
            count: areas.length
        })

    } catch (error: any) {
        console.error('[Areas API] ❌ Error:', error)
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}
