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

import { createClient } from '@supabase/supabase-js'
import { AreaIntelligenceService } from '../lib/services/area-intelligence-service'
import { generateAreaSlug } from '../lib/utils/area-helpers'

// Command-line arguments
const args = process.argv.slice(2)
const limit = args.includes('--limit')
    ? parseInt(args[args.indexOf('--limit') + 1])
    : undefined
const forceRefresh = args.includes('--force')

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL and SUPABASE_KEY must be set in environment')
    process.exit(1)
}

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
    console.log(`Limit: ${limit || 'none'}`)
    console.log('')

    try {
        // Fetch areas that need enrichment
        let query = supabase
            .from('local_areas')
            .select(`
                id,
                area,
                city_id,
                city_section,
                slug,
                last_analyzed,
                cities (
                    name
                )
            `)

        // Skip already analyzed areas unless force refresh
        if (!forceRefresh) {
            query = query.is('last_analyzed', null)
        }

        // Apply limit if specified
        if (limit) {
            query = query.limit(limit)
        }

        const { data: areas, error } = await query

        if (error) {
            console.error('❌ Failed to fetch areas:', error)
            process.exit(1)
        }

        if (!areas || areas.length === 0) {
            console.log('✅ No areas to enrich')
            return
        }

        stats.total = areas.length
        console.log(`📋 Found ${stats.total} areas to enrich\n`)

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
                // Initialize AI service
                const service = new AreaIntelligenceService()

                // Research area
                const enrichedData = await service.researchArea(area.area, cityName)

                // Generate slug if not exists
                const slug = area.slug || generateAreaSlug(area.area, cityName)

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
