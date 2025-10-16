/**
 * API Route: /api/areas/[id]/generate-blog
 * POST: Generate blog content for a single area
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/utils/supabase-client'
import { AreaBlogService } from '@/lib/services/area-blog-service'

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params

        console.log(`[Generate Blog API] 📝 Starting blog generation for area: ${id}`)

        // Fetch area with all enriched data
        const { data: areaData, error: areaError } = await supabase
            .from('local_areas')
            .select(`
                id,
                area,
                city_id,
                city_section,
                slug,
                overview,
                description,
                vibe_and_lifestyle,
                market_data,
                infrastructure,
                local_amenities,
                buyer_intelligence,
                narratives,
                area_images,
                confidence_score,
                last_analyzed,
                data_source,
                cities (name)
            `)
            .eq('id', id)
            .single()

        if (areaError || !areaData) {
            console.error('[Generate Blog API] ❌ Area not found:', areaError)
            return NextResponse.json({
                success: false,
                error: 'Area not found'
            }, { status: 404 })
        }

        // Check if area is enriched
        if (!areaData.vibe_and_lifestyle || !areaData.market_data) {
            console.error('[Generate Blog API] ❌ Area not enriched yet')
            return NextResponse.json({
                success: false,
                error: 'Area must be enriched before generating blog'
            }, { status: 400 })
        }

        // Check if blog already exists
        const { data: existingBlog } = await supabase
            .from('local_areas')
            .select('blog_content')
            .eq('id', id)
            .single()

        if (existingBlog?.blog_content) {
            console.log('[Generate Blog API] ℹ️ Blog already exists, returning existing')
            return NextResponse.json({
                success: true,
                blogContent: existingBlog.blog_content,
                fromCache: true
            })
        }

        // Transform to AreaIntelligenceResult
        const cityName = (areaData.cities as any)?.name || 'Unknown'
        const areaResult = {
            id: areaData.id,
            area: areaData.area,
            cityId: areaData.city_id,
            cityName: cityName,
            citySection: areaData.city_section || '',
            propertyCount: 0,
            createdAt: new Date().toISOString(),
            slug: areaData.slug || '',
            description: areaData.description,
            overview: areaData.overview,
            vibeAndLifestyle: areaData.vibe_and_lifestyle,
            marketData: areaData.market_data,
            infrastructure: areaData.infrastructure,
            localAmenities: areaData.local_amenities,
            buyerIntelligence: areaData.buyer_intelligence,
            narratives: areaData.narratives,
            areaImages: areaData.area_images || [],
            confidenceScore: areaData.confidence_score,
            lastAnalyzed: areaData.last_analyzed,
            dataSource: areaData.data_source
        }

        // Initialize blog service and generate
        const blogService = new AreaBlogService()
        const blogContent = await blogService.generateBlog(areaResult)

        // Save to database
        const { error: updateError } = await supabase
            .from('local_areas')
            .update({ blog_content: blogContent })
            .eq('id', id)

        if (updateError) {
            console.error('[Generate Blog API] ❌ Failed to save blog:', updateError)
            return NextResponse.json({
                success: false,
                error: 'Failed to save blog to database'
            }, { status: 500 })
        }

        console.log(`[Generate Blog API] ✅ Blog generated: ${blogContent.sections.length} sections, ${blogContent.readingTimeMinutes} min read`)

        return NextResponse.json({
            success: true,
            blogContent,
            fromCache: false
        })

    } catch (error: any) {
        console.error('[Generate Blog API] ❌ Error:', error)
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal server error'
        }, { status: 500 })
    }
}
