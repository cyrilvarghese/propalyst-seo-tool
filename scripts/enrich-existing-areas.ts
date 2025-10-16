/**
 * Migration Script: Enrich Existing Areas
 *
 * This script enriches existing area records in the database with AI-powered data.
 *
 * Usage:
 *   npm run migrate-areas
 *
 * Or with custom options:
 *   npm run migrate-areas -- --limit 10 --force
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { AreaIntelligenceService } from '../lib/services/area-intelligence-service'
import { generateAreaSlug } from '../lib/utils/area-helpers'
import { fetchAndUploadAreaImages } from '../lib/services/area-image-service'
import { AreaBlogService } from '../lib/services/area-blog-service'

// Command-line arguments
const args = process.argv.slice(2)
const limit = args.includes('--limit')
    ? parseInt(args[args.indexOf('--limit') + 1])
    : undefined
const forceRefresh = args.includes('--force')
const imagesOnly = args.includes('--images-only')
const generateBlogs = args.includes('--generate-blogs')

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL and SUPABASE_KEY must be set in environment')
    process.exit(1)
}

console.log(`🔑 Using Supabase URL: ${supabaseUrl}`)
console.log(`🔑 Using key type: ${supabaseKey.startsWith('sb_publishable') ? 'PUBLIC (anon)' : 'SERVICE_ROLE'}`)

const supabase = createClient(supabaseUrl, supabaseKey)

// Statistics
const stats = {
    total: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0
}

/**
 * Main migration function
 */
async function migrateAreas() {
    console.log('🚀 Area Enrichment Migration Script')
    console.log('=====================================')
    console.log(`Provider: Google Gemini`)
    console.log(`Force refresh: ${forceRefresh}`)
    console.log(`Images only: ${imagesOnly}`)
    console.log(`Generate blogs: ${generateBlogs}`)
    console.log(`Limit: ${limit || 'none'}`)
    console.log('')

    try {
        // Query to check how many areas need images
        console.log(`\n🔍 Checking local_areas table...\n`)

        const { data: allAreas, error } = await supabase
            .from('local_areas')
            .select('id, area, area_images, slug, city_id, blog_content, cities(name), vibe_and_lifestyle, market_data, infrastructure, local_amenities, buyer_intelligence, narratives, overview, description, confidence_score, last_analyzed, data_source')

        if (error) {
            console.error('❌ Query error:', error)
            process.exit(1)
        }

        if (!allAreas) {
            console.log('❌ No data returned from query')
            process.exit(1)
        }

        // Count areas by status
        const withImages = allAreas.filter(a => a.area_images && a.area_images.length > 0)
        const withoutImages = allAreas.filter(a => !a.area_images || a.area_images.length === 0)
        const enrichedAreas = allAreas.filter(a => a.vibe_and_lifestyle && a.market_data)
        const withBlogs = allAreas.filter(a => a.blog_content)
        const withoutBlogs = enrichedAreas.filter(a => !a.blog_content)

        console.log(`📊 Database Status:`)
        console.log(`   Total areas: ${allAreas.length}`)
        console.log(`   Areas WITH images: ${withImages.length}`)
        console.log(`   Areas WITHOUT images: ${withoutImages.length}`)
        console.log(`   Enriched areas: ${enrichedAreas.length}`)
        console.log(`   Areas WITH blogs: ${withBlogs.length}`)
        console.log(`   Areas WITHOUT blogs: ${withoutBlogs.length}`)

        if (imagesOnly && withoutImages.length === 0) {
            console.log(`\n✅ All areas already have images!`)
            return
        }

        if (generateBlogs && withoutBlogs.length === 0) {
            console.log(`\n✅ All enriched areas already have blogs!`)
            return
        }

        if (imagesOnly) {
            console.log(`\n📋 Sample areas without images:`)
            withoutImages.slice(0, 5).forEach((a, i) => {
                console.log(`   ${i + 1}. ${a.area} (ID: ${a.id})`)
            })
        } else if (generateBlogs) {
            console.log(`\n📋 Sample areas without blogs:`)
            withoutBlogs.slice(0, 5).forEach((a, i) => {
                console.log(`   ${i + 1}. ${a.area} (ID: ${a.id})`)
            })
        }

        console.log(`\n🚀 Starting enrichment process...\n`)

        // Filter areas based on mode
        let areas = allAreas

        if (imagesOnly) {
            // Use the already filtered withoutImages array
            areas = withoutImages
            console.log(`📊 Processing ${areas.length} areas that need images`)
        } else if (generateBlogs) {
            // Use the already filtered withoutBlogs array
            areas = withoutBlogs
            console.log(`📊 Processing ${areas.length} enriched areas that need blogs`)
        }
       
        // Apply limit if specified
        if (limit) {
            if (areas.length > limit) {
                console.log(`🔢 Limiting from ${areas.length} to ${limit} areas`)
                areas = areas.slice(0, limit)
            } else {
                console.log(`🔢 Limit ${limit} requested, but only ${areas.length} areas available`)
            }
        }

        if (areas.length === 0) {
            console.log('✅ No areas to enrich (all areas already have images)')
            return
        }

        stats.total = areas.length
        console.log(`📋 Processing ${stats.total} area${stats.total > 1 ? 's' : ''} to ${imagesOnly ? 'add images' : 'enrich'}\n`)

        // Process each area
        for (let i = 0; i < areas.length; i++) {
            const area = areas[i]
            const cityName = (area.cities as any)?.name

            if (!cityName) {
                console.error(`❌ [${i + 1}/${stats.total}] ${area.area}: No city found`)
                stats.failed++
                continue
            }

            console.log(`🔄 [${i + 1}/${stats.total}] Processing: ${area.area}, ${cityName}`)

            try {
                const slug = area.slug || generateAreaSlug(area.area, cityName)

                if (imagesOnly) {
                    // Images-only mode: Just fetch and upload images
                    console.log(`📸 [${i + 1}/${stats.total}] Fetching images for: ${area.area}`)

                    const imageUrls = await fetchAndUploadAreaImages(area.area, cityName, slug, 8)

                    if (imageUrls.length > 0) {
                        // Update area_images column in database
                        const { error: updateError } = await supabase
                            .from('local_areas')
                            .update({ area_images: imageUrls })
                            .eq('id', area.id)

                        if (updateError) {
                            console.error(`❌ [${i + 1}/${stats.total}] Failed to update images: ${area.area}`, updateError)
                            stats.failed++
                            continue
                        }

                        console.log(`✅ [${i + 1}/${stats.total}] Added ${imageUrls.length} images to database: ${area.area}`)
                        stats.succeeded++
                    } else {
                        console.log(`⚠️ [${i + 1}/${stats.total}] No images found: ${area.area}`)
                        stats.skipped++
                    }

                } else {
                    // Full enrichment mode
                    // Initialize AI service
                    const service = new AreaIntelligenceService()

                    // Research area
                    const enrichedData = await service.researchArea(area.area, cityName)

                    // Prepare update data
                    const updateData = {
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

                    // Update database
                    const { error: updateError } = await supabase
                        .from('local_areas')
                        .update(updateData)
                        .eq('id', area.id)

                    if (updateError) {
                        console.error(`❌ [${i + 1}/${stats.total}] Failed to update: ${area.area}`, updateError)
                        stats.failed++
                        continue
                    }

                    console.log(`✅ [${i + 1}/${stats.total}] Enriched: ${area.area} (confidence: ${enrichedData.confidenceScore}%)`)
                    stats.succeeded++
                }

                // Blog generation mode
                if (generateBlogs) {
                    console.log(`📝 [${i + 1}/${stats.total}] Generating blog for: ${area.area}`)

                    // Transform area data to match AreaIntelligenceResult type
                    const areaData = {
                        id: area.id,
                        area: area.area,
                        cityId: area.city_id,
                        cityName: cityName,
                        citySection: '',
                        propertyCount: 0,
                        createdAt: new Date().toISOString(),
                        slug: slug,
                        description: area.description,
                        overview: area.overview,
                        vibeAndLifestyle: area.vibe_and_lifestyle,
                        marketData: area.market_data,
                        infrastructure: area.infrastructure,
                        localAmenities: area.local_amenities,
                        buyerIntelligence: area.buyer_intelligence,
                        narratives: area.narratives,
                        confidenceScore: area.confidence_score,
                        lastAnalyzed: area.last_analyzed,
                        dataSource: area.data_source
                    }

                    // Initialize blog service
                    const blogService = new AreaBlogService()

                    // Generate blog with AI
                    const blogContent = await blogService.generateBlog(areaData)

                    // Update database with blog content
                    const { error: updateError } = await supabase
                        .from('local_areas')
                        .update({ blog_content: blogContent })
                        .eq('id', area.id)

                    if (updateError) {
                        console.error(`❌ [${i + 1}/${stats.total}] Failed to update blog: ${area.area}`, updateError)
                        stats.failed++
                        continue
                    }

                    console.log(`✅ [${i + 1}/${stats.total}] Blog generated: ${area.area} (${blogContent.sections.length} sections, ${blogContent.readingTimeMinutes} min read)`)
                    stats.succeeded++
                }

                // Cooldown after every 20 areas to avoid rate limits
                if ((i + 1) % 20 === 0 && i < areas.length - 1) {
                    console.log(`\n🧊 Cooldown (30 seconds) after ${i + 1} areas...\n`)
                    await sleep(30000)
                }

                // Small delay between requests
                await sleep(2000)

            } catch (error: any) {
                console.error(`❌ [${i + 1}/${stats.total}] Error: ${area.area}`, error.message)
                stats.failed++

                // Continue with next area
                continue
            }
        }

        // Print summary
        console.log('\n=====================================')
        console.log('✅ Migration Complete')
        console.log('=====================================')
        console.log(`Total areas: ${stats.total}`)
        console.log(`Succeeded: ${stats.succeeded}`)
        console.log(`Failed: ${stats.failed}`)
        console.log(`Skipped: ${stats.skipped}`)
        console.log('')

    } catch (error: any) {
        console.error('❌ Fatal error:', error)
        process.exit(1)
    }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Run migration
 */
migrateAreas()
    .then(() => {
        console.log('✅ Script finished successfully')
        process.exit(0)
    })
    .catch((error) => {
        console.error('❌ Script failed:', error)
        process.exit(1)
    })
