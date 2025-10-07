'use client'

import { useState } from 'react'
import { Search, Loader2, MapPin, Building2 } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import { AreaIntelligenceResult } from '@/lib/types/area-intelligence'

export function AreaSearch() {
    const router = useRouter()
    const [areaName, setAreaName] = useState('')
    const [cityName, setCityName] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [searchError, setSearchError] = useState<string | null>(null)
    const searchProvider = 'gemini' // Fixed to Gemini only
    const [searchResult, setSearchResult] = useState<AreaIntelligenceResult | null>(null)

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!areaName.trim() || !cityName.trim()) {
            setSearchError('Please enter both area and city names')
            return
        }

        setIsLoading(true)
        setSearchError(null)
        setSearchResult(null)

        try {
            console.log('Searching area:', areaName, cityName)

            const response = await fetch('/api/areas/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    areaName: areaName.trim(),
                    cityName: cityName.trim(),
                    provider: searchProvider,
                    skipCache: false
                })
            })

            const data = await response.json()

            if (!data.success) {
                throw new Error(data.error || 'Search failed')
            }

            setSearchResult(data.area)

            // Redirect to area detail page after successful search
            if (data.area?.id) {
                setTimeout(() => {
                    router.push(`/areas/${data.area.id}`)
                }, 1500)
            }

        } catch (error) {
            console.error('Area search error:', error)
            setSearchError(error instanceof Error ? error.message : 'An error occurred during search')
            setSearchResult(null)
        } finally {
            setIsLoading(false)
        }
    }

    // Sample area suggestions
    const sampleAreas = [
        { area: 'Whitefield', city: 'Bangalore' },
        { area: 'Koramangala', city: 'Bangalore' },
        { area: 'Indiranagar', city: 'Bangalore' }
    ]

    const handleSampleClick = (area: string, city: string) => {
        setAreaName(area)
        setCityName(city)
    }

    return (
        <div className="w-full max-w-4xl mx-auto px-4">
            {/* Search Form */}
            <form onSubmit={handleSearch} className="w-full">
                <div className="flex flex-col md:flex-row gap-3 items-center">
                    {/* City Input */}
                    <div className="relative flex-1 w-full">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="City (e.g., Bangalore)"
                            value={cityName}
                            onChange={(e) => setCityName(e.target.value)}
                            className="w-full pl-12 pr-4 py-6 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            disabled={isLoading}
                        />
                    </div>

                    {/* Area Input */}
                    <div className="relative flex-1 w-full">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Area (e.g., Whitefield)"
                            value={areaName}
                            onChange={(e) => setAreaName(e.target.value)}
                            className="w-full pl-12 pr-4 py-6 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            disabled={isLoading}
                        />
                    </div>

                    {/* Search Button */}
                    <Button
                        type="submit"
                        disabled={isLoading || !areaName.trim() || !cityName.trim()}
                        className="px-8 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <Search className="mr-2 h-5 w-5" />
                                Search
                            </>
                        )}
                    </Button>
                </div>
            </form>

            {/* Sample Searches */}
            {!isLoading && !searchResult && (
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500 mb-3">Try searching for:</p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {sampleAreas.map((sample, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSampleClick(sample.area, sample.city)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-sm text-gray-700"
                            >
                                {sample.area}, {sample.city}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Analyzing {areaName}, {cityName}
                            </h3>
                            <p className="text-sm text-gray-600">
                                Gathering comprehensive market data, infrastructure info, and local insights...
                            </p>
                        </div>
                        <div className="w-full max-w-md bg-gray-200 rounded-full h-2">
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Success State */}
            {searchResult && !isLoading && (
                <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                            <Search className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-green-900">
                                Area Found!
                            </h3>
                            <p className="text-sm text-green-700">
                                {searchResult.area}, {searchResult.cityName}
                            </p>
                        </div>
                    </div>
                    {searchResult.description && (
                        <p className="text-gray-700 mb-3">{searchResult.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                        {searchResult.propertyCount > 0 && (
                            <span>📍 {searchResult.propertyCount} properties</span>
                        )}
                        {searchResult.confidenceScore && (
                            <span>✅ {searchResult.confidenceScore}% confidence</span>
                        )}
                    </div>
                    <p className="text-sm text-green-600 mt-3">
                        Redirecting to area details...
                    </p>
                </div>
            )}

            {/* Error State */}
            {searchError && !isLoading && (
                <div className="mt-8 bg-red-50 border border-red-200 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xl">⚠️</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-red-900 mb-2">
                                Search Failed
                            </h3>
                            <p className="text-red-700 mb-4">{searchError}</p>
                            <Button
                                onClick={() => setSearchError(null)}
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                                Try Again
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
