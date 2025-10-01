"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { UnifiedPropertyCard } from '@/components/home/unified-property-card'
import { IntelligentPropertyResult } from '@/lib/types/property-intelligence'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function PropertyDetailPage() {
    const params = useParams()
    const router = useRouter()
    const slug = params.slug as string

    const [property, setProperty] = useState<IntelligentPropertyResult | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchProperty()
    }, [slug])

    const fetchProperty = async () => {
        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/properties/${slug}`)
            const data = await response.json()

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch property')
            }

            // Transform database record to IntelligentPropertyResult format
            const dbProperty = data.property
            const transformedProperty: IntelligentPropertyResult = {
                id: dbProperty.id,
                title: dbProperty.name,
                description: dbProperty.description || '',
                specifications: dbProperty.specifications || {},
                location: dbProperty.location || {},
                community: dbProperty.community || {},
                market: dbProperty.market || {},
                narratives: dbProperty.narratives || {},
                confidenceScore: dbProperty.confidence_score || 0,
                analysisDepth: 'detailed',
                sourceUrl: dbProperty.source_url,
                sourceName: dbProperty.source_name,
                lastAnalyzed: dbProperty.last_analyzed,
                searchScore: dbProperty.search_score || 0,
                sourceAnalyses: dbProperty.source_analyses || [],
                sourceCitations: dbProperty.source_citations || [],
                propertyImages: dbProperty.property_images || [],
            }

            setProperty(transformedProperty)
        } catch (err: any) {
            setError(err.message)
            console.error('Error fetching property:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleRefresh = async () => {
        // Refresh would require re-analyzing the property
        // For now, just reload the data from database
        await fetchProperty()
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Back Button */}
                <div className="mb-6">
                    <Link href="/properties">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Properties
                        </Button>
                    </Link>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        <span className="ml-3 text-gray-600">Loading property details...</span>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-800">
                        <strong>Error:</strong> {error}
                        <div className="mt-4">
                            <Link href="/properties">
                                <Button variant="outline">Back to Properties</Button>
                            </Link>
                        </div>
                    </div>
                )}

                {!loading && !error && property && (
                    <UnifiedPropertyCard
                        property={property}
                        onRefresh={handleRefresh}
                        isRefreshing={false}
                    />
                )}

                {!loading && !error && !property && (
                    <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                        <p className="text-gray-500 text-lg mb-4">Property not found</p>
                        <Link href="/properties">
                            <Button>Back to Properties</Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
