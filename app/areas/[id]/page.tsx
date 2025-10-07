"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { AreaIntelligenceResult } from '@/lib/types/area-intelligence'

interface Society {
    id: string
    name: string
    slug: string
    description?: string
    confidence_score?: number
    created_at: string
}

export default function AreaDetailPage() {
    const params = useParams()
    const id = params.id as string

    const [area, setArea] = useState<AreaIntelligenceResult | null>(null)
    const [societies, setSocieties] = useState<Society[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchArea()
    }, [id])

    const fetchArea = async () => {
        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/areas/${id}`)
            const data = await response.json()

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch area')
            }

            setArea(data.area)
            setSocieties(data.societies || [])
        } catch (err: any) {
            setError(err.message)
            console.error('Error fetching area:', err)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Back Button */}
                <div className="mb-6">
                    <Link href="/areas">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Areas
                        </Button>
                    </Link>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        <span className="ml-3 text-gray-600">Loading area details...</span>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-800">
                        <strong>Error:</strong> {error}
                        <div className="mt-4">
                            <Link href="/areas">
                                <Button variant="outline">Back to Areas</Button>
                            </Link>
                        </div>
                    </div>
                )}

                {!loading && !error && area && (
                    <div className="space-y-6">
                        {/* Hero Section */}
                        <div className="bg-white rounded-lg shadow-sm border p-8">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                                        {area.area}
                                    </h1>
                                    <p className="text-xl text-gray-600">
                                        {area.cityName} {area.citySection && `• ${area.citySection}`}
                                    </p>
                                    {area.description && (
                                        <p className="text-gray-700 mt-4 text-lg">
                                            {area.description}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold text-blue-600">
                                        {area.propertyCount}
                                    </div>
                                    <div className="text-sm text-gray-500">Properties</div>
                                    {area.confidenceScore && (
                                        <div className="mt-2">
                                            <div className="text-2xl font-semibold text-green-600">
                                                {area.confidenceScore}%
                                            </div>
                                            <div className="text-xs text-gray-500">Confidence</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Overview */}
                        {area.overview && (
                            <div className="bg-white rounded-lg shadow-sm border p-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">Overview</h2>
                                <p className="text-gray-700 whitespace-pre-wrap">{area.overview}</p>
                            </div>
                        )}

                        {/* Vibe & Lifestyle */}
                        {area.vibeAndLifestyle && (
                            <div className="bg-white rounded-lg shadow-sm border p-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">Vibe & Lifestyle</h2>
                                {area.narratives?.vibeNarrative && (
                                    <p className="text-gray-700 mb-4 whitespace-pre-wrap">
                                        {area.narratives.vibeNarrative}
                                    </p>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    {area.vibeAndLifestyle.uniqueVibe && (
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-2">Unique Vibe</h3>
                                            <p className="text-gray-700">{area.vibeAndLifestyle.uniqueVibe}</p>
                                        </div>
                                    )}
                                    {area.vibeAndLifestyle.bestSuitedFor && area.vibeAndLifestyle.bestSuitedFor.length > 0 && (
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-2">Best Suited For</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {area.vibeAndLifestyle.bestSuitedFor.map(demographic => (
                                                    <span key={demographic} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                                        {demographic.replace('_', ' ')}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {area.vibeAndLifestyle.localParks && area.vibeAndLifestyle.localParks.length > 0 && (
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-2">Local Parks</h3>
                                            <ul className="list-disc list-inside text-gray-700">
                                                {area.vibeAndLifestyle.localParks.map((park, idx) => (
                                                    <li key={idx}>{park}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {area.vibeAndLifestyle.shoppingCenters && area.vibeAndLifestyle.shoppingCenters.length > 0 && (
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-2">Shopping Centers</h3>
                                            <ul className="list-disc list-inside text-gray-700">
                                                {area.vibeAndLifestyle.shoppingCenters.map((center, idx) => (
                                                    <li key={idx}>{center}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Market Data */}
                        {area.marketData && (
                            <div className="bg-white rounded-lg shadow-sm border p-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">Market Data & Investment</h2>
                                {area.narratives?.marketNarrative && (
                                    <p className="text-gray-700 mb-4 whitespace-pre-wrap">
                                        {area.narratives.marketNarrative}
                                    </p>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                    {area.marketData.avgPricePerSqft && (
                                        <div className="bg-green-50 p-4 rounded-lg">
                                            <div className="text-sm text-gray-600 mb-1">Avg Price/sq.ft</div>
                                            <div className="text-2xl font-bold text-green-600">
                                                ₹{area.marketData.avgPricePerSqft.toLocaleString()}
                                            </div>
                                        </div>
                                    )}
                                    {area.marketData.appreciationRate && (
                                        <div className="bg-blue-50 p-4 rounded-lg">
                                            <div className="text-sm text-gray-600 mb-1">Appreciation Rate</div>
                                            <div className="text-2xl font-bold text-blue-600">
                                                {area.marketData.appreciationRate}% /year
                                            </div>
                                        </div>
                                    )}
                                    {area.marketData.rentalYieldMin && (
                                        <div className="bg-purple-50 p-4 rounded-lg">
                                            <div className="text-sm text-gray-600 mb-1">Rental Yield</div>
                                            <div className="text-2xl font-bold text-purple-600">
                                                {area.marketData.rentalYieldMin}% - {area.marketData.rentalYieldMax}%
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Infrastructure */}
                        {area.infrastructure && (
                            <div className="bg-white rounded-lg shadow-sm border p-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">Infrastructure & Connectivity</h2>
                                {area.narratives?.connectivityNarrative && (
                                    <p className="text-gray-700 mb-4 whitespace-pre-wrap">
                                        {area.narratives.connectivityNarrative}
                                    </p>
                                )}
                                <div className="space-y-4">
                                    {area.infrastructure.commuteTimes && area.infrastructure.commuteTimes.length > 0 && (
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-2">Commute Times</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                {area.infrastructure.commuteTimes.map((commute, idx) => (
                                                    <div key={idx} className="bg-gray-50 p-3 rounded">
                                                        <div className="text-xs text-gray-600">{commute.destination}</div>
                                                        <div className="text-lg font-semibold text-gray-900">
                                                            {commute.minMinutes}-{commute.maxMinutes} min
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {area.infrastructure.metroConnectivity && (
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-2">Metro Connectivity</h3>
                                            <div className="bg-indigo-50 p-4 rounded-lg">
                                                <div className="font-medium text-indigo-900">{area.infrastructure.metroConnectivity.line}</div>
                                                <div className="text-sm text-gray-700 mt-1">
                                                    Station: {area.infrastructure.metroConnectivity.nearestStation}
                                                </div>
                                                <div className="text-xs text-gray-600 mt-1">
                                                    Status: {area.infrastructure.metroConnectivity.status.replace('_', ' ')}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Local Amenities */}
                        {area.localAmenities && (
                            <div className="bg-white rounded-lg shadow-sm border p-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">Local Amenities</h2>
                                {area.narratives?.amenitiesNarrative && (
                                    <p className="text-gray-700 mb-4 whitespace-pre-wrap">
                                        {area.narratives.amenitiesNarrative}
                                    </p>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {area.localAmenities.topHospitals && area.localAmenities.topHospitals.length > 0 && (
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-2">Top Hospitals</h3>
                                            <ul className="space-y-2">
                                                {area.localAmenities.topHospitals.map((hospital, idx) => (
                                                    <li key={idx} className="text-gray-700">
                                                        <span className="font-medium">{hospital.name}</span>
                                                        {hospital.distanceKm && ` • ${hospital.distanceKm}km`}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {area.localAmenities.topSchools && area.localAmenities.topSchools.length > 0 && (
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-2">Top Schools</h3>
                                            <ul className="space-y-2">
                                                {area.localAmenities.topSchools.map((school, idx) => (
                                                    <li key={idx} className="text-gray-700">
                                                        <span className="font-medium">{school.name}</span>
                                                        {school.distanceKm && ` • ${school.distanceKm}km`}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Buyer Intelligence */}
                        {area.buyerIntelligence && (
                            <div className="bg-white rounded-lg shadow-sm border p-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">Investment Tips & Buyer Intelligence</h2>
                                {area.narratives?.investmentNarrative && (
                                    <p className="text-gray-700 mb-4 whitespace-pre-wrap">
                                        {area.narratives.investmentNarrative}
                                    </p>
                                )}
                                <div className="space-y-4">
                                    {area.buyerIntelligence.insiderTips && area.buyerIntelligence.insiderTips.length > 0 && (
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-2">💡 Insider Tips</h3>
                                            <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                {area.buyerIntelligence.insiderTips.map((tip, idx) => (
                                                    <li key={idx}>{tip}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {area.buyerIntelligence.commonMistakes && area.buyerIntelligence.commonMistakes.length > 0 && (
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-2">⚠️ Common Mistakes to Avoid</h3>
                                            <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                {area.buyerIntelligence.commonMistakes.map((mistake, idx) => (
                                                    <li key={idx}>{mistake}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Societies in this Area */}
                        {societies.length > 0 && (
                            <div className="bg-white rounded-lg shadow-sm border p-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                    Properties in {area.area} ({societies.length})
                                </h2>
                                <div className="space-y-3">
                                    {societies.map(society => (
                                        <Link key={society.id} href={`/properties/${society.slug}`}>
                                            <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{society.name}</div>
                                                        {society.description && (
                                                            <div className="text-sm text-gray-600 mt-1">{society.description}</div>
                                                        )}
                                                    </div>
                                                    {society.confidence_score && (
                                                        <div className="text-sm font-medium text-blue-600">
                                                            {society.confidence_score}%
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Metadata */}
                        {area.lastAnalyzed && (
                            <div className="text-center text-sm text-gray-500">
                                Last analyzed: {formatDate(area.lastAnalyzed)} •
                                Data source: {area.dataSource === 'claude_websearch' ? 'Claude WebSearch' : 'Google Gemini'}
                            </div>
                        )}
                    </div>
                )}

                {!loading && !error && !area && (
                    <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                        <p className="text-gray-500 text-lg mb-4">Area not found</p>
                        <Link href="/areas">
                            <Button>Back to Areas</Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
