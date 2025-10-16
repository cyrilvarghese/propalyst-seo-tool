/**
 * API Route: /api/areas/search
 * POST: Search and enrich a single area using AI
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/utils/supabase-client'
import { AreaIntelligenceService } from '@/lib/services/area-intelligence-service'
import { generateAreaSlug } from '@/lib/utils/area-helpers'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { areaName, cityName, skipCache = false } = body

        if (!areaName || !cityName) {
            return NextResponse.json({
                success: false,
                error: 'Area name and city name are required'
            }, { status: 400 })
        }

        console.log(`[Area Search] 🔍 Searching: ${areaName}, ${cityName} (provider: Google Gemini)`)

        const slug = generateAreaSlug(areaName, cityName)

        // Check if area already exists in database (unless skipCache)
        if (!skipCache) {
            console.log(`[Area Search] 🔎 Checking cache for slug: ${slug}`)

            const { data: existingArea } = await supabase
                .from('local_areas')
                .select('*, cities(name)')
                .eq('slug', slug)
                .single()

            if (existingArea && existingArea.last_analyzed) {
                console.log(`[Area Search] ✅ Found in cache: ${slug}`)

                // Return cached result
                return NextResponse.json({
                    success: true,
                    area: {
                        id: existingArea.id,
                        area: existingArea.area,
                        cityId: existingArea.city_id,
                        cityName: (existingArea.cities as any)?.name || cityName,
                        citySection: existingArea.city_section,
                        description: existingArea.description,
                        overview: existingArea.overview,
                        slug: existingArea.slug,
                        featuredImageUrl: existingArea.featured_image_url,
                        propertyCount: existingArea.property_count || 0,
                        vibeAndLifestyle: existingArea.vibe_and_lifestyle,
                        marketData: existingArea.market_data,
                        infrastructure: existingArea.infrastructure,
                        localAmenities: existingArea.local_amenities,
                        buyerIntelligence: existingArea.buyer_intelligence,
                        narratives: existingArea.narratives,
                        areaImages: existingArea.area_images || [],
                        confidenceScore: existingArea.confidence_score,
                        lastAnalyzed: existingArea.last_analyzed,
                        dataSource: existingArea.data_source,
                        createdAt: existingArea.created_at
                    },
                    fromCache: true
                })
            }
        }

        // Perform AI research
        console.log(`[Area Search] 🤖 Starting AI research...`)
        const service = new AreaIntelligenceService()
        const enrichedData = await service.researchArea(areaName, cityName)

        // Get or create city
        console.log(`[Area Search] 🔍 Looking up city: "${cityName}"`)

        let cityData = null

        // Try to find existing city
        const { data: existingCity } = await supabase
            .from('cities')
            .select('id')
            .ilike('name', cityName)
            .single()

        if (existingCity) {
            cityData = existingCity
            console.log(`[Area Search] ✅ Found existing city_id: ${cityData.id}`)
        } else {
            // City doesn't exist - create it
            console.log(`[Area Search] 🆕 City not found, creating: "${cityName}"`)

            const { data: newCity, error: createError } = await supabase
                .from('cities')
                .insert({ name: cityName })
                .select('id')
                .single()

            if (createError || !newCity) {
                console.error(`[Area Search] ❌ Failed to create city:`, createError)
                return NextResponse.json({
                    success: false,
                    error: `Failed to create city "${cityName}". ${createError?.message || 'Unknown error'}`
                }, { status: 500 })
            }

            cityData = newCity
            console.log(`[Area Search] ✅ Created new city_id: ${cityData.id}`)
        }

        // Prepare data for database
        const areaRecord = {
            area: areaName,
            city_id: cityData.id,
            slug,
            description: enrichedData.description,
            overview: enrichedData.overview,
            vibe_and_lifestyle: enrichedData.vibeAndLifestyle,
            market_data: enrichedData.marketData,
            infrastructure: enrichedData.infrastructure,
            local_amenities: enrichedData.localAmenities,
            buyer_intelligence: enrichedData.buyerIntelligence,
            narratives: enrichedData.narratives,
            area_images: enrichedData.areaImages || [],
            confidence_score: enrichedData.confidenceScore,
            last_analyzed: enrichedData.lastAnalyzed,
            data_source: enrichedData.dataSource
        }

        // Upsert to database (update if exists, insert if not)
        // NOTE: Using city_id,area as conflict target because that's the unique constraint
        const { data: savedArea, error: saveError } = await supabase
            .from('local_areas')
            .upsert(areaRecord, {
                onConflict: 'city_id,area',
                ignoreDuplicates: false
            })
            .select('*, cities(name)')
            .single()

        if (saveError) {
            console.error('[Area Search] ❌ Failed to save:', saveError)
            return NextResponse.json({
                success: false,
                error: 'Failed to save area to database'
            }, { status: 500 })
        }

        console.log(`[Area Search] ✅ Saved area: ${slug}`)

        return NextResponse.json({
            success: true,
            area: {
                id: savedArea.id,
                area: savedArea.area,
                cityId: savedArea.city_id,
                cityName: (savedArea.cities as any)?.name || cityName,
                citySection: savedArea.city_section,
                description: savedArea.description,
                overview: savedArea.overview,
                slug: savedArea.slug,
                featuredImageUrl: savedArea.featured_image_url,
                propertyCount: savedArea.property_count || 0,
                vibeAndLifestyle: savedArea.vibe_and_lifestyle,
                marketData: savedArea.market_data,
                infrastructure: savedArea.infrastructure,
                localAmenities: savedArea.local_amenities,
                buyerIntelligence: savedArea.buyer_intelligence,
                narratives: savedArea.narratives,
                areaImages: savedArea.area_images || [],
                confidenceScore: savedArea.confidence_score,
                lastAnalyzed: savedArea.last_analyzed,
                dataSource: savedArea.data_source,
                createdAt: savedArea.created_at
            },
            fromCache: false
        })

    } catch (error: any) {
        console.error('[Area Search] ❌ Error:', error)
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}
