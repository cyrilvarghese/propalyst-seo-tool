'use client'

import { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { UnifiedPropertyCard } from "./unified-property-card"
import { IntelligentPropertyResult } from '@/lib/types/property-intelligence'

export function RealEstateSearch() {
    const [searchQuery, setSearchQuery] = useState('')
    const [hasSearched, setHasSearched] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [searchResults, setSearchResults] = useState<IntelligentPropertyResult[]>([])
    const [searchError, setSearchError] = useState<string | null>(null)
    const searchProvider = 'gemini' // Fixed to Gemini only
    const [searchMetadata, setSearchMetadata] = useState<{
        totalFound: number;
        searchTime: number;
        analysisQuality: {
            averageConfidence: number;
            detailedResults: number;
            basicResults: number;
        };
        searchInsights: {
            popularAreas: string[];
            priceRangeAnalysis: string;
            marketTrends: string;
        };
    } | null>(null)

    // Streaming progress states
    const [searchProgress, setSearchProgress] = useState<{
        stage: string;
        message: string;
        urlsFound: string[];
        currentUrl?: string;
        processedCount: number;
        totalExpected: number;
    }>({
        stage: '',
        message: '',
        urlsFound: [],
        processedCount: 0,
        totalExpected: 0
    })

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!searchQuery.trim()) return

        setIsLoading(true)
        setSearchError(null)
        setHasSearched(true)

        // Reset progress
        setSearchProgress({
            stage: '',
            message: '',
            urlsFound: [],
            processedCount: 0,
            totalExpected: 0
        })

        try {
            console.log('Starting search for:', searchQuery)

            // Start streaming search with progress updates
            await performStreamingSearch(searchQuery)

        } catch (error) {
            console.error('Search error:', error)
            setSearchError(error instanceof Error ? error.message : 'An error occurred during search')
            setSearchResults([])
            setSearchMetadata(null)
        } finally {
            setIsLoading(false)
        }
    }

    /**
     * Perform streaming search with real-time updates
     *
     * **Next.js Client-Side Streaming:**
     * Uses fetch with ReadableStream to receive progressive updates from server.
     * This creates a real-time UX where users see results as they're analyzed.
     *
     * In traditional SPA, you'd wait for full response. Here we process chunks as they arrive!
     */
    const performStreamingSearch = async (query: string, skipCache = false) => {
        const startTime = Date.now()
        const individualProperties: IntelligentPropertyResult[] = []

        try {
            setSearchProgress(prev => ({
                ...prev,
                stage: 'starting',
                message: '🚀 Initiating search...'
            }))

            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query,
                    provider: searchProvider,  // Pass selected provider
                    skipCache,  // Pass skipCache flag
                    options: {
                        maxResults: 10,
                        analysisDepth: 'detailed'
                    }
                }),
            })

            if (!response.ok) {
                throw new Error(`Search failed: ${response.status} ${response.statusText}`)
            }

            // Get the readable stream
            const reader = response.body?.getReader()
            const decoder = new TextDecoder()

            if (!reader) {
                throw new Error('Response body is not readable')
            }

            let buffer = ''

            // Read stream chunks
            while (true) {
                const { done, value } = await reader.read()

                if (done) break

                // Decode chunk and add to buffer
                buffer += decoder.decode(value, { stream: true })

                // Process complete JSON lines
                const lines = buffer.split('\n')
                buffer = lines.pop() || '' // Keep incomplete line in buffer

                for (const line of lines) {
                    if (!line.trim()) continue

                    try {
                        const chunk = JSON.parse(line)
                        console.log('Stream chunk:', chunk.type, chunk.data)

                        // Handle different chunk types
                        switch (chunk.type) {
                            case 'query_optimized':
                                setSearchProgress(prev => ({
                                    ...prev,
                                    stage: 'optimized',
                                    message: `🎯 Query optimized: ${chunk.data.queryType}`
                                }))
                                break

                            case 'urls':
                                setSearchProgress(prev => ({
                                    ...prev,
                                    stage: 'urls-found',
                                    message: `📄 Found ${chunk.data.totalFound} property listings`,
                                    urlsFound: chunk.data.urls.map((u: any) => u.url),
                                    totalExpected: chunk.data.totalFound
                                }))
                                break

                            case 'analysis':
                                // Add individual property analysis
                                individualProperties.push(chunk.data.property)

                                setSearchProgress(prev => ({
                                    ...prev,
                                    stage: 'analyzing',
                                    message: `🧠 Analyzing property ${chunk.data.index}/${chunk.data.total}`,
                                    currentUrl: chunk.data.property.sourceUrl,
                                    processedCount: chunk.data.index
                                }))

                                // Update results with individual analyses (will be replaced by merged)
                                setSearchResults([...individualProperties])
                                break

                            case 'merged':
                                // Replace individual analyses with merged property
                                setSearchResults([chunk.data.property])

                                setSearchProgress(prev => ({
                                    ...prev,
                                    stage: 'merged',
                                    message: `✨ Merged ${chunk.data.sourceCount} sources into unified profile`
                                }))
                                break

                            case 'complete':
                                const totalTime = Date.now() - startTime
                                setSearchProgress(prev => ({
                                    ...prev,
                                    stage: 'complete',
                                    message: `🎉 Analysis complete! ${chunk.data.propertiesAnalyzed} sources analyzed in ${(totalTime / 1000).toFixed(1)}s`
                                }))

                                setSearchMetadata({
                                    totalFound: chunk.data.propertiesAnalyzed,
                                    searchTime: totalTime,
                                    analysisQuality: {
                                        averageConfidence: searchResults[0]?.confidenceScore || 0,
                                        detailedResults: chunk.data.propertiesAnalyzed,
                                        basicResults: 0
                                    },
                                    searchInsights: {
                                        popularAreas: [],
                                        priceRangeAnalysis: '',
                                        marketTrends: ''
                                    }
                                })
                                break

                            case 'error':
                                console.error('Stream error:', chunk.data)
                                break
                        }

                    } catch (parseError) {
                        console.error('Failed to parse chunk:', line, parseError)
                    }
                }
            }

        } catch (error) {
            console.error('Streaming search error:', error)
            throw error
        }
    }

    /**
     * Handle refresh button click
     * Triggers a fresh search with skipCache=true
     */
    const handleRefresh = async () => {
        if (!searchQuery.trim() || isRefreshing) return

        setIsRefreshing(true)
        setSearchError(null)

        // Reset progress
        setSearchProgress({
            stage: '',
            message: '',
            urlsFound: [],
            processedCount: 0,
            totalExpected: 0
        })

        try {
            console.log('Refreshing property data for:', searchQuery)
            await performStreamingSearch(searchQuery, true) // skipCache = true
        } catch (error) {
            console.error('Refresh error:', error)
            setSearchError(error instanceof Error ? error.message : 'An error occurred during refresh')
        } finally {
            setIsRefreshing(false)
        }
    }

    return (
        <div className="w-full max-w-4xl mx-auto px-4">

            {/* Google-style Search Box */}
            <form onSubmit={handleSearch} className="mb-8">
                <div className="relative max-w-2xl mx-auto">
                    <div className="flex items-center bg-white rounded-full shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200 focus-within:shadow-xl focus-within:border-blue-400">
                        <Search className="ml-5 h-5 w-5 text-gray-400 flex-shrink-0" />
                        <input
                            type="text"
                            placeholder="Search for properties, developers, societies... (e.g., Embassy Lake Terraces)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent px-4 py-3.5 text-base placeholder:text-gray-400 focus:outline-none border-0"
                        />
                        <Button
                            type="submit"
                            className="mr-2 px-6 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                            disabled={!searchQuery.trim() || isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Searching...
                                </>
                            ) : (
                                'Search'
                            )}
                        </Button>
                    </div>

                    {/* Search suggestions */}
                    <div className="mt-4 text-center">
                        <div className="text-sm text-gray-500 mb-2">Try searching for:</div>
                        <div className="flex flex-wrap justify-center gap-2">
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setSearchQuery("Embassy Lake Terraces")}
                                className="h-8 rounded-full px-4 text-sm"
                            >
                                Embassy Lake Terraces
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setSearchQuery("Prestige Apartments Bangalore")}
                                className="h-8 rounded-full px-4 text-sm"
                            >
                                Prestige Apartments
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setSearchQuery("Brigade Gateway")}
                                className="h-8 rounded-full px-4 text-sm"
                            >
                                Brigade Gateway
                            </Button>
                        </div>
                    </div>
                </div>
            </form>

            {/* Real-time Search Progress */}
            {isLoading && searchProgress.stage && (
                <div className="max-w-2xl mx-auto mb-6">
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-medium text-gray-700">
                                {searchProgress.message}
                            </div>
                            {searchProgress.totalExpected > 0 && (
                                <div className="text-xs text-gray-500">
                                    {searchProgress.processedCount}/{searchProgress.totalExpected}
                                </div>
                            )}
                        </div>

                        {/* Progress bar */}
                        {searchProgress.totalExpected > 0 && (
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{
                                        width: `${Math.max(10, (searchProgress.processedCount / searchProgress.totalExpected) * 100)}%`
                                    }}
                                ></div>
                            </div>
                        )}

                        {/* URLs found - streaming display */}
                        {searchProgress.urlsFound.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-xs text-gray-600 font-medium">
                                    Property listings discovered:
                                </div>
                                <div className="max-h-32 overflow-y-auto space-y-1">
                                    {searchProgress.urlsFound.map((url, index) => (
                                        <div
                                            key={index}
                                            className={`text-xs p-2 rounded border-l-2 transition-all duration-300 ${searchProgress.currentUrl === url
                                                    ? 'bg-blue-50 border-blue-400 text-blue-800'
                                                    : 'bg-gray-50 border-gray-300 text-gray-600'
                                                }`}
                                            style={{
                                                animation: `fadeIn 0.3s ease-in ${index * 0.1}s both`
                                            }}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"></div>
                                                <div className="truncate">
                                                    {url.replace('https://', '').replace('http://', '')}
                                                </div>
                                                {searchProgress.currentUrl === url && (
                                                    <div className="ml-auto">
                                                        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Search Results */}
            {hasSearched && (
                <div className="bg-white rounded-lg shadow-sm border">
                    <div className="p-6 border-b">
                        <h2 className="text-2xl font-semibold text-gray-900">
                            Search Results for "{searchQuery}"
                        </h2>
                        {searchMetadata && (
                            <div className="mt-2 space-y-1">
                                <p className="text-gray-600">
                                    Found {searchMetadata.totalFound} intelligent property analyses in {(searchMetadata.searchTime / 1000).toFixed(1)}s
                                </p>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span>Avg. Confidence: {searchMetadata.analysisQuality.averageConfidence.toFixed(1)}%</span>
                                    <span>•</span>
                                    <span>Detailed Analysis: {searchMetadata.analysisQuality.detailedResults}</span>
                                    {searchMetadata.searchInsights.popularAreas.length > 0 && (
                                        <>
                                            <span>•</span>
                                            <span>Popular Areas: {searchMetadata.searchInsights.popularAreas.slice(0, 2).join(', ')}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                        {searchError && (
                            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-red-800 text-sm">{searchError}</p>
                            </div>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="p-12 text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                            <p className="mt-4 text-gray-600">
                                🤖 AI-powered property intelligence search in progress...
                            </p>
                            <p className="text-sm text-gray-500 mt-2">
                                Analyzing properties with comprehensive market intelligence
                            </p>
                        </div>
                    ) : searchError ? (
                        <div className="p-12 text-center">
                            <p className="text-gray-500">
                                Please try again or check if the services are running.
                            </p>
                        </div>
                    ) : (
                        <div className="p-6">
                            {searchResults.length === 0 ? (
                                <div className="p-12 text-center">
                                    <p className="text-gray-500">No properties found for your search.</p>
                                    <p className="text-sm text-gray-400 mt-2">Try adjusting your search terms.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-6">
                                        {searchResults.map((property) => (
                                            <UnifiedPropertyCard
                                                key={property.id}
                                                property={property}
                                                onRefresh={handleRefresh}
                                                isRefreshing={isRefreshing}
                                            />
                                        ))}
                                    </div>

                                    {/* Results Summary */}
                                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                                        <div className="text-sm text-gray-600 text-center">
                                            <strong>{searchResults.length}</strong> intelligent property analyses completed
                                            {searchMetadata && (
                                                <span className="ml-2">
                                                    • Average confidence: <strong>{searchMetadata.analysisQuality.averageConfidence.toFixed(1)}%</strong>
                                                    • Sources: <strong>{new Set(searchResults.map(p => p.sourceName)).size}</strong> property portals
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}