import { supabase } from '@/lib/utils/supabase-client'

export async function GET() {
    console.log('[Test API] 🧪 Testing Supabase INSERT into society table...')

    try {
        // Step 1: Get count BEFORE insert
        const { count: countBefore, error: countBeforeError } = await supabase
            .from('society')
            .select('*', { count: 'exact', head: true })

        if (countBeforeError) {
            console.error('[Test API] ❌ Error getting count before:', countBeforeError)
            return Response.json({
                success: false,
                error: countBeforeError.message
            }, { status: 500 })
        }

        console.log('[Test API] 📊 Count BEFORE insert:', countBefore)

        // Step 2: Insert a test row
        const timestamp = Date.now()
        const testRow = {
            id: 'test-' + timestamp,
            name: 'Test Property ' + timestamp,
            slug: 'test-property-' + timestamp, // Required field
            description: 'Test property description',
            specifications: { type: 'Apartment', bhk: '3BHK' },
            location: { city: 'Bangalore', area: 'Test Area' },
            community: { amenities: ['Swimming Pool', 'Gym'] },
            market: { developer: 'Test Developer' },
            narratives: { overview: 'Test overview narrative' },
            confidence_score: 85,
            search_score: 0
        }

        const { data: insertedData, error: insertError } = await supabase
            .from('society')
            .insert(testRow)
            .select()

        if (insertError) {
            console.error('[Test API] ❌ Error inserting row:', insertError)
            return Response.json({
                success: false,
                error: insertError.message,
                details: insertError
            }, { status: 500 })
        }

        console.log('[Test API] ✅ Row inserted successfully!')

        // Step 3: Get count AFTER insert
        const { count: countAfter, error: countAfterError } = await supabase
            .from('society')
            .select('*', { count: 'exact', head: true })

        if (countAfterError) {
            console.error('[Test API] ❌ Error getting count after:', countAfterError)
            return Response.json({
                success: false,
                error: countAfterError.message
            }, { status: 500 })
        }

        console.log('[Test API] 📊 Count AFTER insert:', countAfter)

        return Response.json({
            success: true,
            message: 'Insert test successful!',
            countBefore,
            countAfter,
            inserted: insertedData
        })
    } catch (err: any) {
        console.error('[Test API] ❌ Exception:', err)
        return Response.json({
            success: false,
            error: err.message,
            stack: err.stack
        }, { status: 500 })
    }
}
