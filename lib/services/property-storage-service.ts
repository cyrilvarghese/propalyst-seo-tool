/**
 * Property Storage Service
 * Persists property intelligence to the Supabase `society` table.
 *
 * Supabase is the only store. The app runs on Cloudflare Workers, which has no
 * writable filesystem, so there is no local JSON cache.
 */

import { IntelligentPropertyResult } from '@/lib/types/property-intelligence'
import { getSupabaseAdmin, supabase } from '@/lib/utils/supabase-client'

/**
 * Transform a Supabase `society` record to IntelligentPropertyResult format
 */
export function transformDbToProperty(dbRecord: any): IntelligentPropertyResult {
    return {
        id: dbRecord.id,
        title: dbRecord.name,
        description: dbRecord.description,
        specifications: dbRecord.specifications || {},
        location: dbRecord.location || {},
        community: dbRecord.community || {},
        market: dbRecord.market || {},
        narratives: dbRecord.narratives || {},
        confidenceScore: dbRecord.confidence_score || 0,
        analysisDepth: 'detailed', // Default depth for stored properties
        sourceUrl: dbRecord.source_url,
        sourceName: dbRecord.source_name,
        lastAnalyzed: dbRecord.last_analyzed,
        searchScore: dbRecord.search_score || 0,
        sourceAnalyses: dbRecord.source_analyses || [],
        sourceCitations: dbRecord.source_citations || [],
        propertyImages: dbRecord.property_images || [],
        // Used by the search route to decide whether the cache is fresh
        ...({ storedAt: dbRecord.stored_at, slug: dbRecord.slug } as any)
    }
}

export class PropertyStorageService {
    /**
     * Generate URL-safe slug from property name
     */
    public generateSlug(title: string): string {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 100)
    }

    /**
     * Upsert property to Supabase.
     *
     * The live `society` table is protected by RLS, so server-side writes must
     * go through the service-role client.
     */
    private async syncToSupabase(property: IntelligentPropertyResult, slug: string): Promise<void> {
        console.log(`[Storage] Starting Supabase sync for: ${slug}`)

        const supabaseAdmin = getSupabaseAdmin()

        const dbRecord = {
            name: property.title,
            description: property.description,

            specifications: property.specifications,
            location: property.location,
            community: property.community,
            market: property.market,
            narratives: property.narratives,

            confidence_score: property.confidenceScore,
            source_url: property.sourceUrl,
            source_name: property.sourceName,
            last_analyzed: property.lastAnalyzed,
            search_score: property.searchScore || 0,

            source_analyses: property.sourceAnalyses || [],
            source_citations: property.sourceCitations || [],
            property_images: property.propertyImages || [],

            stored_at: new Date().toISOString(),
            slug
        }

        console.log(`[Storage] Upserting to Supabase table: society`)
        console.log(`[Storage] Property Name: ${dbRecord.name}, Slug: ${dbRecord.slug}`)
        console.log(`[Storage] Record size: ${JSON.stringify(dbRecord).length} characters`)

        const { data, error } = await supabaseAdmin
            .from('society')
            .upsert(dbRecord as any, {
                onConflict: 'slug',
                ignoreDuplicates: false
            })
            .select()

        if (error) {
            console.error('[Storage] Supabase sync failed:', error.message)
            console.error('[Storage] Error code:', error.code)
            console.error('[Storage] Error hint:', error.hint)
            console.error('[Storage] Error details:', error.details)
            throw error
        }

        console.log(`[Storage] Synced to Supabase: ${slug}`)
        console.log('[Storage] Upserted data:', data ? `${data.length} row(s) returned` : 'No data returned')
    }

    /**
     * Store property intelligence in Supabase
     */
    async storeProperty(property: IntelligentPropertyResult): Promise<string> {
        const slug = this.generateSlug(property.title)
        await this.syncToSupabase(property, slug)
        return slug
    }

    /**
     * Get property by slug
     */
    async getPropertyBySlug(slug: string): Promise<IntelligentPropertyResult | null> {
        const { data, error } = await supabase
            .from('society')
            .select('*')
            .eq('slug', slug)
            .maybeSingle()

        if (error || !data) {
            console.log(`[Storage] Property not found: ${slug}`)
            return null
        }

        console.log(`[Storage] Retrieved property: ${slug}`)
        return transformDbToProperty(data)
    }

    /**
     * Get cached property by title
     */
    async getCachedProperty(title: string): Promise<IntelligentPropertyResult | null> {
        const slug = this.generateSlug(title)
        return this.getPropertyBySlug(slug)
    }
}

let storageInstance: PropertyStorageService | null = null

export function getPropertyStorage(): PropertyStorageService {
    if (!storageInstance) {
        storageInstance = new PropertyStorageService()
    }
    return storageInstance
}
