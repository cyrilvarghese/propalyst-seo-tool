/**
 * API Route: /api/areas/bulk-enrich
 * POST: Bulk enrich multiple areas with streaming progress
 * Similar to bulk-search for societies
 */

import { NextRequest } from 'next/server'
import { POST as searchHandler } from '../search/route'
import { pendingCooldowns } from '@/lib/utils/cooldown-manager'
import { parseAreaFile } from '@/lib/utils/area-helpers'

export async function POST(request: NextRequest) {
    const encoder = new TextEncoder()
    const requestId = `bulk-${Date.now()}`

    console.log(`[Bulk Enrich:${requestId}] 🚀 Starting bulk area enrichment`)

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const formData = await request.formData()
                const file = formData.get('file') as File
                const provider = (formData.get('provider') || 'claude') as 'claude' | 'gemini'
                const skipCache = formData.get('skipCache') === 'true'
                const defaultCity = formData.get('defaultCity') as string | undefined

                if (!file) {
                    controller.enqueue(encoder.encode(JSON.stringify({
                        type: 'failed',
                        error: 'No file uploaded'
                    }) + '\n'))
                    controller.close()
                    return
                }

                // Parse file to get area-city pairs
                const areas = await parseAreaFile(file, defaultCity)

                console.log(`[Bulk Enrich:${requestId}] 📋 Found ${areas.length} areas to enrich`)

                let successCount = 0
                let failedCount = 0
                let skippedCount = 0

                for (let i = 0; i < areas.length; i++) {
                    const { area, city } = areas[i]

                    console.log(`[Bulk Enrich:${requestId}] 🔄 Processing ${i + 1}/${areas.length}: ${area}, ${city}`)

                    // Send processing status
                    controller.enqueue(encoder.encode(JSON.stringify({
                        type: 'processing',
                        area: `${area}, ${city}`,
                        current: i + 1,
                        total: areas.length
                    }) + '\n'))

                    try {
                        // Create a NextRequest for the search handler
                        const searchRequest = new NextRequest('http://localhost:3000/api/areas/search', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                areaName: area,
                                cityName: city,
                                provider,
                                skipCache
                            })
                        })

                        // Call the search handler directly
                        const response = await searchHandler(searchRequest)
                        const data = await response.json()

                        if (data.success) {
                            if (data.fromCache) {
                                skippedCount++
                                console.log(`[Bulk Enrich:${requestId}] ⚡ Skipped (cached): ${area}, ${city}`)
                            } else {
                                successCount++
                                console.log(`[Bulk Enrich:${requestId}] ✅ Enriched: ${area}, ${city}`)
                            }

                            // Send completed status with area data
                            controller.enqueue(encoder.encode(JSON.stringify({
                                type: 'completed',
                                areaData: data.area,
                                fromCache: data.fromCache
                            }) + '\n'))

                        } else {
                            failedCount++
                            console.error(`[Bulk Enrich:${requestId}] ❌ Failed: ${area}, ${city} - ${data.error}`)

                            controller.enqueue(encoder.encode(JSON.stringify({
                                type: 'failed',
                                area: `${area}, ${city}`,
                                error: data.error
                            }) + '\n'))
                        }

                    } catch (error: any) {
                        failedCount++
                        console.error(`[Bulk Enrich:${requestId}] ❌ Error: ${area}, ${city}`, error)

                        controller.enqueue(encoder.encode(JSON.stringify({
                            type: 'failed',
                            area: `${area}, ${city}`,
                            error: error.message
                        }) + '\n'))
                    }

                    // Cooldown after every 20 successful items
                    if (successCount > 0 && successCount % 20 === 0 && i < areas.length - 1) {
                        const cooldownId = `${requestId}-cooldown-${successCount}`

                        console.log(`[Bulk Enrich:${requestId}] 🧊 Cooldown after ${successCount} areas`)

                        // Send cooldown message
                        controller.enqueue(encoder.encode(JSON.stringify({
                            type: 'cooldown',
                            requestId: cooldownId,
                            message: 'Cooling off period - preventing rate limits',
                            cooldownSeconds: 30,
                            itemsProcessed: successCount
                        }) + '\n'))

                        // Wait for client resume signal
                        await new Promise<void>((resolve) => {
                            pendingCooldowns.set(cooldownId, resolve)

                            // Safety timeout: auto-resume after 60 seconds
                            setTimeout(() => {
                                if (pendingCooldowns.has(cooldownId)) {
                                    console.log(`[Bulk Enrich:${requestId}] ⏰ Auto-resuming after timeout`)
                                    resolve()
                                    pendingCooldowns.delete(cooldownId)
                                }
                            }, 60000)
                        })

                        console.log(`[Bulk Enrich:${requestId}] ▶️ Resumed after cooldown`)
                    }
                }

                // Send completion summary
                controller.enqueue(encoder.encode(JSON.stringify({
                    type: 'complete',
                    summary: {
                        succeeded: successCount,
                        failed: failedCount,
                        skipped: skippedCount
                    }
                }) + '\n'))

                console.log(`[Bulk Enrich:${requestId}] ✅ Complete - Success: ${successCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`)

            } catch (error: any) {
                console.error(`[Bulk Enrich:${requestId}] ❌ Fatal error:`, error)
                controller.enqueue(encoder.encode(JSON.stringify({
                    type: 'failed',
                    error: error.message
                }) + '\n'))
            } finally {
                controller.close()
            }
        }
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    })
}
