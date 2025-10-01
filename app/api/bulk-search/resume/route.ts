import { NextRequest } from 'next/server'
import { pendingCooldowns } from '@/lib/utils/cooldown-manager'

/**
 * Resume endpoint - Called by client to wake up cooldown
 *
 * Flow:
 * 1. Bulk search pauses and stores resolver in pendingCooldowns Map
 * 2. Client timer finishes or user clicks continue
 * 3. Client calls this endpoint with requestId
 * 4. We get the resolver and call it → bulk search wakes up!
 */
export async function POST(request: NextRequest) {
    try {
        const { requestId } = await request.json()

        console.log(`[Resume] 📨 Received resume request for: ${requestId}`)

        // Get the resolver function for this cooldown
        const resolver = pendingCooldowns.get(requestId)

        if (resolver) {
            // Call the resolver → wakes up the waiting server!
            resolver()
            pendingCooldowns.delete(requestId)

            console.log(`[Resume] ⚡ Cooldown skipped for: ${requestId}`)

            return Response.json({
                success: true,
                message: 'Cooldown skipped successfully'
            })
        }

        console.warn(`[Resume] ⚠️ No cooldown found for: ${requestId}`)

        return Response.json({
            success: false,
            error: 'No active cooldown found for this requestId'
        }, { status: 404 })

    } catch (error: any) {
        console.error(`[Resume] ❌ Error:`, error.message)
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}
