import { NextRequest } from 'next/server'
import { getPropertyStorage } from '@/lib/services/property-storage-service'
import { IntelligentPropertyResult } from '@/lib/types/property-intelligence'
import { supabase } from '@/lib/utils/supabase-client'
import { POST as searchHandler } from '../search/route'
import { pendingCooldowns } from '@/lib/utils/cooldown-manager'

/**
 * Parse uploaded file to array of property names
 */
async function parseFileToArray(file: File): Promise<string[]> {
    const text = await file.text()
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'json') {
        try {
            const data = JSON.parse(text)
            if (Array.isArray(data)) {
                return data.filter(item => typeof item === 'string' && item.trim())
            }
            throw new Error('JSON file must contain an array of strings')
        } catch (e) {
            throw new Error('Invalid JSON format')
        }
    }

    if (ext === 'csv') {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line)
        // Skip header if it looks like a header (contains common CSV headers)
        const firstLine = lines[0]?.toLowerCase()
        if (firstLine?.includes('name') || firstLine?.includes('property') || firstLine?.includes('society')) {
            return lines.slice(1)
        }
        return lines
    }

    if (ext === 'txt') {
        return text.split('\n').map(line => line.trim()).filter(line => line)
    }

    throw new Error('Unsupported file format. Please upload .json, .csv, or .txt file')
}

/**
 * Transform Supabase database record to IntelligentPropertyResult format
 */
function transformDbToProperty(dbRecord: any): IntelligentPropertyResult {
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
        propertyImages: dbRecord.property_images || []
    }
}

/**
 * Perform property search by calling /api/search and fetching from storage after completion
 */
async function performPropertySearch(
    query: string,
    provider: 'claude' | 'gemini'
): Promise<IntelligentPropertyResult> {
    // Step 1: Call the search API (does AI analysis, images, saves to storage)
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query,
            provider,
            skipCache: false,
            options: { maxResults: 1, analysisDepth: 'detailed' }
        })
    })

    if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`)
    }

    // Step 2: Consume the stream (just wait for completion, don't parse chunks)
    const reader = response.body?.getReader()
    if (!reader) {
        throw new Error('Response body is not readable')
    }

    // Just consume the stream until it's done
    while (true) {
        const { done } = await reader.read()
        if (done) break
    }

    // Step 3: After search completes, fetch property from storage
    // The search API has already saved it to filesystem + Supabase
    const storage = getPropertyStorage()
    const slug = storage.generateSlug(query)

    // Try filesystem first (faster)
    let property = await storage.getPropertyBySlug(slug)

    if (!property) {
        // Fallback: fetch from Supabase
        console.log(`[Bulk Search] Property not in filesystem, fetching from Supabase: ${slug}`)
        const { data, error } = await supabase
            .from('society')
            .select('*')
            .eq('slug', slug)
            .single()

        if (error || !data) {
            throw new Error(`Property not found in storage after search: ${query}`)
        }

        // Transform DB record to property format
        property = transformDbToProperty(data)
    }

    return property
}

/**
 * Bulk search API route with streaming
 *
 * **Next.js SSR Teaching Point - Internal API Calls:**
 *
 * Instead of making HTTP calls to our own API (fetch('/api/search')),
 * we import and call the handler directly: `import { POST as searchHandler }`
 *
 * Why this approach?
 * 1. ✅ No network overhead - direct function call in same Node.js process
 * 2. ✅ No URL resolution issues - no need for absolute URLs
 * 3. ✅ Faster - avoids HTTP round-trip
 * 4. ✅ Same behavior - still gets Request/Response objects
 *
 * Traditional approach (doesn't work well):
 * ❌ fetch('/api/search') - relative URLs fail in API routes
 * ❌ fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/search`) - env var issues
 *
 * This is a key difference from SPA frameworks where all API calls go over HTTP.
 */
export async function POST(request: NextRequest) {
    const requestId = Math.random().toString(36).substring(7)
    console.log(`[Bulk Search:${requestId}] 📋 Starting bulk search...`)

    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const provider = (formData.get('provider') as string) || 'claude'
        const skipCache = formData.get('skipCache') === 'true'

        if (!file) {
            return Response.json({ error: 'No file provided' }, { status: 400 })
        }

        // Parse file to get property names
        const societies = await parseFileToArray(file)
        console.log(`[Bulk Search:${requestId}] 📄 Parsed ${societies.length} properties from file`)

        if (societies.length === 0) {
            return Response.json({ error: 'No valid property names found in file' }, { status: 400 })
        }

        const storage = getPropertyStorage()
        const encoder = new TextEncoder()

        // Create streaming response
        const stream = new ReadableStream({
            async start(controller) {
                let successCount = 0
                let failureCount = 0
                let skippedCount = 0

                for (let i = 0; i < societies.length; i++) {
                    const society = societies[i]

                    try {
                        console.log(`[Bulk Search:${requestId}] 🔍 Processing ${i + 1}/${societies.length}: ${society}`)

                        // Send "processing" update
                        controller.enqueue(encoder.encode(JSON.stringify({
                            type: 'processing',
                            society,
                            current: i + 1,
                            total: societies.length
                        }) + '\n'))

                        // Check cache first (unless skipCache is true)
                        if (!skipCache) {
                            const cachedProperty = await storage.getCachedProperty(society)
                            if (cachedProperty) {
                                console.log(`[Bulk Search:${requestId}] ⏭️  Skipped (cached): ${society}`)
                                skippedCount++

                                controller.enqueue(encoder.encode(JSON.stringify({
                                    type: 'completed',
                                    property: cachedProperty,
                                    fromCache: true
                                }) + '\n'))

                                continue
                            }
                        }

                        // Perform property search by calling handler directly (no HTTP overhead!)
                        console.log(`[Bulk Search:${requestId}] 🚀 Calling search handler for: ${society}`)

                        // Create a NextRequest object for the search handler
                        const searchRequest = new NextRequest('http://localhost:3000/api/search', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                query: society,
                                provider,
                                skipCache: false
                            })
                        })

                        // Call the search handler directly (same process, no network call)
                        const response = await searchHandler(searchRequest)

                        console.log(`[Bulk Search:${requestId}] 📡 Response status: ${response.status}`)

                        if (!response.ok) {
                            throw new Error(`Search handler returned ${response.status}`)
                        }

                        // Consume the stream and wait for completion
                        const reader = response.body?.getReader()
                        if (!reader) {
                            console.error(`[Bulk Search:${requestId}] ❌ No response body reader`)
                            throw new Error('Response body is not readable')
                        }

                        console.log(`[Bulk Search:${requestId}] 📖 Consuming stream...`)
                        while (true) {
                            const { done } = await reader.read()
                            if (done) {
                                console.log(`[Bulk Search:${requestId}] ✅ Stream consumed`)
                                break
                            }
                        }

                        console.log(`[Bulk Search:${requestId}] ✅ Search complete, property saved to Supabase: ${society}`)
                        successCount++

                        // Fetch the saved property from Supabase to send to frontend
                        console.log(`[Bulk Search:${requestId}] 📥 Fetching saved property from Supabase...`)
                        const slug = storage.generateSlug(society)
                        const { data: savedProperty, error: fetchError } = await supabase
                            .from('society')
                            .select('*')
                            .eq('slug', slug)
                            .single()

                        if (fetchError || !savedProperty) {
                            console.error(`[Bulk Search:${requestId}] ⚠️ Could not fetch property:`, fetchError?.message)
                            // Still send success but without property data
                            controller.enqueue(encoder.encode(JSON.stringify({
                                type: 'completed',
                                society,
                                message: 'Saved but fetch failed',
                                fromCache: false
                            }) + '\n'))
                        } else {
                            console.log(`[Bulk Search:${requestId}] ✅ Fetched property, sending to frontend`)
                            // Send full property data to frontend
                            controller.enqueue(encoder.encode(JSON.stringify({
                                type: 'completed',
                                property: savedProperty,
                                fromCache: false
                            }) + '\n'))
                        }

                    } catch (error: any) {
                        console.error(`[Bulk Search:${requestId}] ❌ Failed: ${society}`, error.message)
                        failureCount++

                        controller.enqueue(encoder.encode(JSON.stringify({
                            type: 'failed',
                            society,
                            error: error.message
                        }) + '\n'))
                    }

                    // Cooldown after every 20 successful items (not on last item)
                    if (successCount > 0 && successCount % 20 === 0 && i < societies.length - 1) {
                        const cooldownId = `${requestId}-cooldown-${successCount}`
                        console.log(`[Bulk Search:${requestId}] 🧊 Cooldown triggered after ${successCount} items`)

                        // Send cooldown message with unique cooldown ID
                        controller.enqueue(encoder.encode(JSON.stringify({
                            type: 'cooldown',
                            requestId: cooldownId,  // ← Client uses this to resume
                            message: 'Cooling off period - preventing rate limits',
                            cooldownSeconds: 30,
                            itemsProcessed: successCount
                        }) + '\n'))

                        // Wait for client to send resume signal
                        console.log(`[Bulk Search:${requestId}] ⏳ Waiting for client resume signal...`)

                        await new Promise<void>((resolve) => {
                            // Store resolver so /resume endpoint can call it
                            pendingCooldowns.set(cooldownId, resolve)

                            // Safety timeout: auto-resume after 60 seconds if client doesn't respond
                            setTimeout(() => {
                                if (pendingCooldowns.has(cooldownId)) {
                                    console.log(`[Bulk Search:${requestId}] ⏰ Auto-resume after 60s timeout`)
                                    resolve()
                                    pendingCooldowns.delete(cooldownId)
                                }
                            }, 60000)  // 60 seconds safety timeout
                        })

                        console.log(`[Bulk Search:${requestId}] ✅ Cooldown complete, resuming...`)
                    }

                    // Rate limiting - wait 1.5 seconds between requests
                    if (i < societies.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1500))
                    }
                }

                // Send completion summary
                controller.enqueue(encoder.encode(JSON.stringify({
                    type: 'complete',
                    summary: {
                        total: societies.length,
                        succeeded: successCount,
                        failed: failureCount,
                        skipped: skippedCount
                    }
                }) + '\n'))

                console.log(`[Bulk Search:${requestId}] 🎉 Bulk search complete: ${successCount} succeeded, ${failureCount} failed, ${skippedCount} skipped`)
                controller.close()
            }
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            }
        })

    } catch (error: any) {
        console.error(`[Bulk Search:${requestId}] ❌ Error:`, error.message)
        return Response.json({ error: error.message }, { status: 500 })
    }
}
