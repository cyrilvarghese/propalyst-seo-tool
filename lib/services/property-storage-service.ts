/**
 * Property Storage Service
 * Handles dual storage: filesystem JSON + Supabase database
 *
 * Next.js API routes run on the server, so we can write to the filesystem for
 * local cache and also persist to Supabase for the app UI.
 */

import fs from 'fs/promises'
import path from 'path'
import { IntelligentPropertyResult } from '@/lib/types/property-intelligence'
import { getSupabaseAdmin } from '@/lib/utils/supabase-client'

export class PropertyStorageService {
    private readonly storageDir: string

    constructor() {
        this.storageDir = path.join(process.cwd(), 'data', 'properties')
    }

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
     * Ensure storage directory exists
     */
    private async ensureStorageDir(): Promise<void> {
        try {
            await fs.access(this.storageDir)
        } catch {
            await fs.mkdir(this.storageDir, { recursive: true })
            console.log(`[Storage] Created storage directory: ${this.storageDir}`)
        }
    }

    /**
     * Sync property to Supabase database.
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
     * Store property intelligence as JSON file + sync to Supabase
     */
    async storeProperty(property: IntelligentPropertyResult): Promise<string> {
        await this.ensureStorageDir()

        const slug = this.generateSlug(property.title)
        const filename = `${slug}.json`
        const filepath = path.join(this.storageDir, filename)

        const storedData = {
            ...property,
            storedAt: new Date().toISOString(),
            slug
        }

        await fs.writeFile(filepath, JSON.stringify(storedData, null, 2), 'utf-8')
        console.log(`[Storage] Stored property: ${filename}`)

        await this.syncToSupabase(storedData, slug)

        return slug
    }

    /**
     * Get property by slug
     */
    async getPropertyBySlug(slug: string): Promise<IntelligentPropertyResult | null> {
        try {
            const filepath = path.join(this.storageDir, `${slug}.json`)
            const data = await fs.readFile(filepath, 'utf-8')
            const property = JSON.parse(data)

            console.log(`[Storage] Retrieved property: ${slug}`)
            return property
        } catch {
            console.log(`[Storage] Property not found: ${slug}`)
            return null
        }
    }

    /**
     * Check if property exists in cache
     */
    async propertyExists(title: string): Promise<boolean> {
        const slug = this.generateSlug(title)
        const filepath = path.join(this.storageDir, `${slug}.json`)

        try {
            await fs.access(filepath)
            return true
        } catch {
            return false
        }
    }

    /**
     * Get cached property by title
     */
    async getCachedProperty(title: string): Promise<IntelligentPropertyResult | null> {
        const slug = this.generateSlug(title)
        return this.getPropertyBySlug(slug)
    }

    /**
     * List all cached properties
     */
    async listCachedProperties(): Promise<string[]> {
        try {
            await this.ensureStorageDir()
            const files = await fs.readdir(this.storageDir)
            return files
                .filter(f => f.endsWith('.json'))
                .map(f => f.replace('.json', ''))
        } catch {
            return []
        }
    }

    /**
     * Delete cached property
     */
    async deleteProperty(slug: string): Promise<boolean> {
        try {
            const filepath = path.join(this.storageDir, `${slug}.json`)
            await fs.unlink(filepath)
            console.log(`[Storage] Deleted property: ${slug}`)
            return true
        } catch {
            return false
        }
    }

    /**
     * Check cache age and determine if refresh needed
     */
    async shouldRefreshCache(title: string, maxAgeHours: number = 24): Promise<boolean> {
        const property = await this.getCachedProperty(title)

        if (!property) return true

        const storedAt = (property as any).storedAt
        if (!storedAt) return true

        const cacheAge = Date.now() - new Date(storedAt).getTime()
        const maxAge = maxAgeHours * 60 * 60 * 1000

        return cacheAge > maxAge
    }
}

let storageInstance: PropertyStorageService | null = null

export function getPropertyStorage(): PropertyStorageService {
    if (!storageInstance) {
        storageInstance = new PropertyStorageService()
    }
    return storageInstance
}
