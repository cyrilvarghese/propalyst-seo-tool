/**
 * Next.js API Route for hybrid real estate property search
 * Uses Tavily for web search + Claude for AI-powered property analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    IntelligentSearchResponse,
    IntelligentPropertyResult,
    PropertySearchOptions,
    WebSearchResult
} from '@/lib/types/property-intelligence';
import { HybridSearchService, createHybridSearchService } from '@/lib/services/hybrid-search-service';
import {
    AnalysisPrompts,
    parseAIResponse,
    validatePropertyData,
    normalizePropertyData
} from '@/lib/utils/property-intelligence';
import { fetchPropertyImages } from '@/lib/services/serpapi-service';

/**
 * POST handler with streaming support
 *
 * **Next.js SSR Teaching Point - Streaming:**
 * Next.js 14 supports streaming responses using ReadableStream.
 * This allows us to send data to the client as it becomes available.
 *
 * Benefits of Streaming:
 * 1. Progressive loading - user sees results immediately
 * 2. Better UX - no long waiting times
 * 3. Lower memory usage - don't buffer all results
 * 4. Faster perceived performance
 *
 * In traditional SPA, you'd wait for ALL data before showing anything.
 * With Next.js streaming, we show data as it arrives!
 */
export async function POST(request: NextRequest) {
    const requestId = Math.random().toString(36).substring(7);

    // Log environment variables on first request
    console.log(`[API:${requestId}] 🔐 Environment Check:`);
    console.log(`[API:${requestId}] SUPABASE_KEY:`, process.env.SUPABASE_KEY ? `${process.env.SUPABASE_KEY.substring(0, 20)}...` : '❌ NOT DEFINED');
    console.log(`[API:${requestId}] ANTHROPIC_API_KEY:`, process.env.ANTHROPIC_API_KEY ? 'Defined' : '❌ NOT DEFINED');
    console.log(`[API:${requestId}] SERPAPI_KEY:`, process.env.SERPAPI_KEY ? 'Defined' : '❌ NOT DEFINED');

    try {
        // Parse request body
        const body = await request.json();
        const { query, options = {}, provider, skipCache }: { query: string; options: PropertySearchOptions; provider?: string; skipCache?: boolean } = body;

        console.log(`[Hybrid API:${requestId}] 🚀 Starting streaming property search`);
        console.log(`[Hybrid API:${requestId}] Query: "${query}"`);
        console.log(`[Hybrid API:${requestId}] Skip cache: ${skipCache || false}`);

        if (!query || typeof query !== 'string') {
            return NextResponse.json(
                { error: 'Search query is required' },
                { status: 400 }
            );
        }

        // Create streaming response with provider and skipCache flag
        const stream = createStreamingSearchResponse(query, options, requestId, provider, skipCache);

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        console.error(`[Hybrid API:${requestId}] ❌ Search failed:`, error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            },
            { status: 500 }
        );
    }
}

/**
 * Create streaming search response
 *
 * **Next.js Streaming Architecture:**
 * Uses ReadableStream to send data chunks to client progressively.
 * Each chunk is a JSON object with type + data.
 *
 * Stream phases:
 * 1. 'urls' - Send discovered URLs from Tavily
 * 2. 'analysis' - Send each individual property analysis
 * 3. 'merged' - Send final unified property profile
 * 4. 'complete' - Signal end of stream
 */
function createStreamingSearchResponse(
    query: string,
    options: PropertySearchOptions,
    requestId: string,
    userProvider?: string,
    skipCache?: boolean
): ReadableStream {
    const encoder = new TextEncoder();

    return new ReadableStream({
        async start(controller) {
            try {
                const startTime = Date.now();

                // Helper function to send stream chunk
                const sendChunk = (type: string, data: any) => {
                    const chunk = JSON.stringify({ type, data }) + '\n';
                    controller.enqueue(encoder.encode(chunk));
                };

                // Check cache first (unless skipCache is true)
                if (!skipCache) {
                    console.log(`[Stream:${requestId}] 💾 Checking cache...`);
                    const storage = getPropertyStorage();
                    const cachedProperty = await storage.getCachedProperty(query);

                    if (cachedProperty) {
                        const cacheAge = Date.now() - new Date((cachedProperty as any).storedAt || 0).getTime();
                        const hoursSinceCached = cacheAge / (1000 * 60 * 60);

                        // Use cache if less than 24 hours old
                        if (hoursSinceCached < 24) {
                            console.log(`[Stream:${requestId}] ✅ Cache hit! Using cached data (${hoursSinceCached.toFixed(1)}h old)`);

                            sendChunk('cache_hit', {
                                message: `Using cached data from ${new Date((cachedProperty as any).storedAt).toLocaleString()}`
                            });

                            sendChunk('merged', {
                                property: cachedProperty,
                                sourceCount: cachedProperty.sourceAnalyses?.length || 0
                            });

                            sendChunk('complete', {
                                totalTime: Date.now() - startTime,
                                propertiesAnalyzed: cachedProperty.sourceAnalyses?.length || 1,
                                message: 'Loaded from cache'
                            });

                            controller.close();
                            return;
                        } else {
                            console.log(`[Stream:${requestId}] ⏰ Cache expired (${hoursSinceCached.toFixed(1)}h old), re-analyzing...`);
                        }
                    }
                } else {
                    console.log(`[Stream:${requestId}] 🔄 Skipping cache - forcing fresh search...`);
                }

                // Multi-provider search approach
                // Priority: user selection > env variable > default to claude
                const searchProvider = userProvider || process.env.SEARCH_PROVIDER || 'claude';
                console.log(`[Stream:${requestId}] 📡 Using ${searchProvider} search provider (${userProvider ? 'user selected' : 'default'})...`);

                sendChunk('query_optimized', {
                    originalQuery: query,
                    optimizedQuery: query,
                    queryType: 'direct-search',
                    provider: searchProvider
                });

                // Route to appropriate search provider
                const property = searchProvider === 'gemini'
                    ? await searchWithGemini(query, requestId)
                    : await searchPropertyDirectly(query, requestId);

                if (property) {
                    console.log(`[Stream:${requestId}] ✅ Search complete - Confidence: ${property.confidenceScore}%`);

                    // Fetch property images from SerpAPI
                    console.log(`[Stream:${requestId}] 🖼️ Fetching property images...`);
                    try {
                        const propertyImages = await fetchPropertyImages(query, 8);
                        if (propertyImages.length > 0) {
                            property.propertyImages = propertyImages;
                            console.log(`[Stream:${requestId}] ✅ Added ${propertyImages.length} images to property`);
                        } else {
                            console.log(`[Stream:${requestId}] ⚠️ No images found`);
                        }
                    } catch (imageError) {
                        console.error(`[Stream:${requestId}] ❌ Error fetching images:`, imageError);
                        // Continue without images - not a critical failure
                    }

                    // Store property in cache (with images if available)
                    try {
                        const storage = getPropertyStorage();
                        const slug = await storage.storeProperty(property);
                        console.log(`[Stream:${requestId}] 💾 Cached property: ${slug}`);
                    } catch (storageError) {
                        console.error(`[Stream:${requestId}] ⚠️ Failed to cache property:`, storageError);
                    }

                    // Stream the unified result
                    sendChunk('merged', {
                        property: property,
                        sourceCount: 1
                    });
                } else {
                    console.log(`[Stream:${requestId}] ⚠️ Search returned no data`);
                    sendChunk('error', {
                        message: 'Unable to find comprehensive property information. Try a more specific search query.'
                    });
                }

                /* TAVILY FLOW - Kept for reference, currently bypassed due to domain blocking issues

                // Phase 1: Get URLs from Tavily
                console.log(`[Stream:${requestId}] 📡 Phase 1: Discovering URLs...`);
                const hybridService = createHybridSearchService();
                const tavilyService = getTavilyService();

                // Optimize query
                const queryAnalysis = EnhancedQueryOptimizer.optimizeQuery(query);
                sendChunk('query_optimized', {
                    originalQuery: query,
                    optimizedQuery: queryAnalysis.optimizedQuery,
                    queryType: queryAnalysis.queryType
                });

                // Get URLs from Tavily
                const webResults = await tavilyService.searchProperties(
                    queryAnalysis.optimizedQuery,
                    {
                        maxResults: (options.maxResults || 10) * 2,
                        includeDeveloperSites: queryAnalysis.queryType === 'developer-focused',
                        focusDomains: queryAnalysis.targetDomains.slice(0, 8)
                    }
                );

                // Stream URLs immediately
                sendChunk('urls', {
                    urls: webResults.map(r => ({ url: r.url, title: r.title, source: new URL(r.url).hostname })),
                    totalFound: webResults.length
                });
                console.log(`[Stream:${requestId}] ✅ Phase 1 complete: ${webResults.length} URLs found`);

                // Phase 2: Analyze each URL
                const individualAnalyses: IntelligentPropertyResult[] = [];
                for (let i = 0; i < Math.min(webResults.length, options.maxResults || 10); i++) {
                    const result = webResults[i];
                    const property = await extractWithWebSearch(result.url, query, requestId);
                    if (property) {
                        individualAnalyses.push(property);
                        sendChunk('analysis', { property, index: i + 1, total: webResults.length });
                    }
                }

                // Phase 3: Merge analyses
                if (individualAnalyses.length > 0) {
                    const mergedProperty = await mergePropertyAnalyses(individualAnalyses, query, requestId);
                    await storage.storeProperty(mergedProperty);
                    sendChunk('merged', { property: mergedProperty, sourceCount: individualAnalyses.length });
                }

                END TAVILY FLOW */

                // Complete
                const totalTime = Date.now() - startTime;
                sendChunk('complete', {
                    totalTime,
                    propertiesAnalyzed: property ? 1 : 0,
                    message: property ? 'Search completed successfully' : 'No results found'
                });
                console.log(`[Stream:${requestId}] 🎉 Stream complete in ${totalTime}ms`);

                controller.close();

            } catch (error) {
                console.error(`[Stream:${requestId}] ❌ Stream error:`, error);
                const errorChunk = JSON.stringify({
                    type: 'error',
                    data: { message: error instanceof Error ? error.message : 'Unknown error' }
                }) + '\n';
                controller.enqueue(encoder.encode(errorChunk));
                controller.close();
            }
        }
    });
}

/**
 * Merge multiple property analyses into one unified profile
 */
async function mergePropertyAnalyses(
    analyses: IntelligentPropertyResult[],
    query: string,
    requestId: string
): Promise<IntelligentPropertyResult> {
    console.log(`[Merge:${requestId}] 🔄 Merging ${analyses.length} property analyses...`);

    // Sort by confidence score
    const sortedAnalyses = [...analyses].sort((a, b) => b.confidenceScore - a.confidenceScore);
    const primary = sortedAnalyses[0];

    // Merge arrays and deduplicate
    const mergeArrays = (...arrays: string[][]): string[] => {
        return [...new Set(arrays.flat().filter(Boolean))];
    };

    // Merge narratives - prefer longer, more detailed descriptions
    const mergeNarratives = (field: keyof typeof primary.narratives): string => {
        const narratives = analyses
            .map(a => a.narratives[field])
            .filter(n => n && n.length > 50)
            .sort((a, b) => b.length - a.length);
        return narratives[0] || '';
    };

    const merged: IntelligentPropertyResult = {
        id: `merged-${Date.now()}`,
        title: primary.title,
        description: primary.description,
        specifications: {
            propertyType: primary.specifications.propertyType,
            configurations: mergeArrays(...analyses.map(a => a.specifications.configurations)),
            areaRange: primary.specifications.areaRange,
            priceRange: primary.specifications.priceRange,
            totalUnits: primary.specifications.totalUnits,
            totalFloors: primary.specifications.totalFloors,
            amenitiesCount: Math.max(...analyses.map(a => a.specifications.amenitiesCount || 0))
        },
        location: {
            neighborhood: primary.location.neighborhood,
            area: primary.location.area,
            city: primary.location.city,
            nearbyAmenities: mergeArrays(...analyses.map(a => a.location.nearbyAmenities)),
            educationalInstitutions: mergeArrays(...analyses.map(a => a.location.educationalInstitutions)),
            healthcareFacilities: mergeArrays(...analyses.map(a => a.location.healthcareFacilities)),
            workProximity: {
                businessHubs: mergeArrays(...analyses.map(a => a.location.workProximity.businessHubs)),
                techParks: mergeArrays(...analyses.map(a => a.location.workProximity.techParks)),
                commercialAreas: mergeArrays(...analyses.map(a => a.location.workProximity.commercialAreas)),
                commuteAnalysis: primary.location.workProximity.commuteAnalysis,
                proximityScore: Math.round(analyses.reduce((sum, a) => sum + a.location.workProximity.proximityScore, 0) / analyses.length)
            },
            transportationAccess: mergeArrays(...analyses.map(a => a.location.transportationAccess))
        },
        community: {
            familyAmenities: mergeArrays(...analyses.map(a => a.community.familyAmenities)),
            recreationalFacilities: mergeArrays(...analyses.map(a => a.community.recreationalFacilities)),
            clubhouseFeatures: mergeArrays(...analyses.map(a => a.community.clubhouseFeatures)),
            sportsAndFitness: mergeArrays(...analyses.map(a => a.community.sportsAndFitness)),
            childrensFacilities: mergeArrays(...analyses.map(a => a.community.childrensFacilities)),
            securityFeatures: mergeArrays(...analyses.map(a => a.community.securityFeatures))
        },
        market: {
            developerName: primary.market.developerName,
            completionYear: primary.market.completionYear,
            projectStatus: primary.market.projectStatus,
            propertyCategory: primary.market.propertyCategory,
            targetDemographic: mergeArrays(...analyses.map(a => a.market.targetDemographic)),
            investmentPotential: primary.market.investmentPotential,
            onlinePresence: primary.market.onlinePresence,
            communityBuzz: primary.market.communityBuzz
        },
        narratives: {
            projectOverview: mergeNarratives('projectOverview'),
            neighborhoodDescription: mergeNarratives('neighborhoodDescription'),
            propertyPositioning: mergeNarratives('propertyPositioning'),
            connectivityAnalysis: mergeNarratives('connectivityAnalysis'),
            familyAppeal: mergeNarratives('familyAppeal'),
            expatriatePopulation: mergeNarratives('expatriatePopulation'),
            entertainmentLifestyle: mergeNarratives('entertainmentLifestyle'),
            onlinePresenceBuzz: mergeNarratives('onlinePresenceBuzz'),
            celebrityResidents: mergeNarratives('celebrityResidents')
        },
        confidenceScore: Math.round(analyses.reduce((sum, a) => sum + a.confidenceScore, 0) / analyses.length),
        analysisDepth: 'comprehensive',
        sourceUrl: primary.sourceUrl,
        sourceName: 'Multiple Sources',
        lastAnalyzed: new Date().toISOString(),
        searchScore: calculateRelevanceScore(primary, query),
        sourceAnalyses: analyses // Store individual analyses for expandable view
    };

    console.log(`[Merge:${requestId}] ✅ Merge complete - Overall confidence: ${merged.confidenceScore}%`);
    return merged;
}

// Import required services
import { getTavilyService } from '@/lib/services/tavily-service';
import { EnhancedQueryOptimizer } from '@/lib/utils/enhanced-query-optimization';
import { calculateRelevanceScore } from '@/lib/utils/property-intelligence';
import { getPropertyStorage } from '@/lib/services/property-storage-service';

/**
 * Perform hybrid search with Claude AI analysis
 */
async function performHybridSearchWithClaude(
    hybridService: HybridSearchService,
    query: string,
    options: PropertySearchOptions,
    requestId: string
): Promise<IntelligentSearchResponse> {
    console.log(`[Hybrid API:${requestId}] 🔄 Delegating to hybrid search service...`);

    // The hybrid service will handle:
    // 1. Query optimization
    // 2. Tavily web search with domain focus
    // 3. Claude AI analysis (enhanced in next step)
    // 4. Result ranking and insights

    const searchResults = await hybridService.searchProperties(query, options);

    // Enhance results with Claude AI analysis where possible
    if (searchResults.success && searchResults.properties.length > 0) {
        console.log(`[Hybrid API:${requestId}] 🤖 Enhancing results with Claude AI analysis...`);

        // Process each property for enhanced Claude analysis
        const enhancedProperties = await Promise.all(
            searchResults.properties.map(property =>
                enhancePropertyWithClaude(property, requestId)
            )
        );

        searchResults.properties = enhancedProperties.filter(p => p !== null) as IntelligentPropertyResult[];

        console.log(`[Hybrid API:${requestId}] ✅ Enhanced ${searchResults.properties.length} properties with Claude AI`);
    }

    return searchResults;
}

/**
 * Enhance property analysis using Claude WebSearch
 *
 * **Next.js SSR Teaching Point:**
 * Using WebSearch instead of WebFetch provides better results because:
 * - WebSearch can intelligently find content across multiple pages
 * - No direct page fetch failures (400 errors)
 * - Built-in retry and fallback
 * - Better extraction of dynamic content
 */
async function enhancePropertyWithClaude(
    property: IntelligentPropertyResult,
    requestId: string
): Promise<IntelligentPropertyResult | null> {
    try {
        console.log(`[WebSearch:${requestId}] 🧠 Enhancing analysis for: ${property.title.substring(0, 50)}...`);

        // Use WebSearch to extract enhanced property data
        const enhanced = await extractWithWebSearch(
            property.sourceUrl,
            property.title,
            requestId
        );

        if (enhanced) {
            // Merge enhanced analysis with existing property data
            return mergeEnhancedAnalysis(property, enhanced);
        }

        // If enhancement fails, return original property
        return property;

    } catch (error) {
        console.error(`[WebSearch:${requestId}] ❌ Enhancement failed for ${property.sourceUrl}:`, error);
        return property; // Return original on error
    }
}

/**
 * Search property directly using unrestricted WebSearch
 *
 * **Next.js SSR Teaching Point:**
 * This approach uses Claude's WebSearch WITHOUT domain restrictions.
 *
 * Why unrestricted?
 * - Many Indian real estate sites block Anthropic's crawler
 * - Domain-restricted searches fail with "not accessible" errors
 * - Letting Claude search freely finds accessible sources automatically
 *
 * Flow:
 * 1. Single Claude API call with WebSearch tool
 * 2. NO allowed_domains restriction
 * 3. Claude searches web and picks best accessible sources
 * 4. Returns comprehensive property intelligence in one call
 *
 * Benefits:
 * - No domain blocking errors
 * - Faster (1 API call instead of N calls)
 * - Claude automatically finds best sources
 * - More reliable than per-domain extraction
 */
async function searchPropertyDirectly(
    query: string,
    requestId: string
): Promise<IntelligentPropertyResult | null> {
    try {
        console.log(`[DirectSearch:${requestId}] 🔍 Searching web for: ${query}`);

        // Comprehensive extraction prompt with schema
        const searchPrompt = `Search the web for "${query}" real estate property in India and extract comprehensive property intelligence.

CRITICAL: Return ONLY valid JSON with no additional text, explanation, or markdown formatting. Do not include any text before or after the JSON object.

Extract data following this EXACT structure (this is an example with proper formatting):

{
  "specifications": {
    "propertyType": "Apartment",
    "configurations": ["3 BHK", "4 BHK", "5 BHK"],
    "areaRange": "3544-9788 sq ft",
    "priceRange": "₹6.20 Cr - ₹11.62 Cr",
    "totalUnits": 467,
    "totalFloors": 21,
    "amenitiesCount": 30
  },
  "location": {
    "neighborhood": "Subramani Nagar",
    "area": "Guddadahalli, Hebbal Kempapura",
    "city": "Bangalore",
    "nearbyAmenities": ["Orion Mall", "Columbia Asia Hospital", "Phoenix Market City"],
    "educationalInstitutions": ["Delhi Public School", "St. Joseph's College"],
    "healthcareFacilities": ["Columbia Asia Hospital", "Manipal Hospital"],
    "workProximity": {
      "businessHubs": ["Manyata Tech Park", "Hebbal Business District"],
      "techParks": ["Embassy Tech Village", "Kirloskar Business Park"],
      "commercialAreas": ["Hebbal", "Yelahanka"],
      "commuteAnalysis": "15 minutes to Manyata Tech Park, 25 minutes to Electronic City via ORR",
      "proximityScore": 8
    },
    "transportationAccess": ["Hebbal Metro Station - 3 km", "Kempegowda Airport - 15 km"]
  },
  "community": {
    "familyAmenities": ["Kids play area", "Crèche", "Daycare center"],
    "recreationalFacilities": ["Swimming pool", "Clubhouse", "Party hall"],
    "clubhouseFeatures": ["Indoor games room", "Library", "Meditation hall"],
    "sportsAndFitness": ["Gym", "Tennis court", "Jogging track"],
    "childrensFacilities": ["Play area", "Skating rink", "Kids pool"],
    "securityFeatures": ["24x7 security", "CCTV surveillance", "Gated community"]
  },
  "market": {
    "developerName": "Embassy Group",
    "completionYear": "2018",
    "projectStatus": "Ready to Move",
    "propertyCategory": "Luxury",
    "targetDemographic": ["Working professionals", "Expat families", "HNI buyers"],
    "investmentPotential": "Strong appreciation potential due to proximity to tech hubs and excellent connectivity. High rental demand from expat community working in nearby IT parks.",
    "onlinePresence": "Well-marketed with professional photography and virtual tours across major portals",
    "communityBuzz": "Highly rated for amenities and maintenance. Popular among expat community"
  },
  "narratives": {
    "projectOverview": "Embassy Lake Terraces is a prestigious residential development by Embassy Group, completed in 2018. Spread across acres of landscaped gardens, it offers luxurious apartments with world-class amenities and stunning views.",
    "neighborhoodDescription": "Located in the upscale Hebbal area, the property enjoys proximity to major IT hubs, shopping malls, and international schools. The neighborhood is known for its excellent infrastructure and cosmopolitan community.",
    "propertyPositioning": "Positioned as a luxury residential project targeting high-net-worth individuals and expat families. Premium finishes, expansive layouts, and resort-style amenities set it apart in the luxury segment.",
    "connectivityAnalysis": "Excellent connectivity with 15-minute drive to Manyata Tech Park and direct access to Outer Ring Road. Hebbal Metro station is 3 km away, and the international airport is just 15 km, making it ideal for frequent travelers.",
    "familyAppeal": "Perfect for families with extensive kid-friendly amenities including play areas, kids pool, and dedicated activity zones. Proximity to top international schools and healthcare facilities adds to family appeal.",
    "expatriatePopulation": "Very popular among expat community, particularly employees of MNCs in Manyata and Embassy Tech Village. International school proximity and modern amenities cater well to expat lifestyle.",
    "entertainmentLifestyle": "Surrounded by premium malls like Orion and Phoenix Market City. Fine dining restaurants, cafes, and entertainment options within short driving distance. Vibrant social scene with nearby clubs.",
    "onlinePresenceBuzz": "Consistently receives 4+ star ratings on property portals. Residents praise the maintenance, amenities, and professional management. Active community on social media.",
    "celebrityResidents": "Not publicly available"
  },
  "confidenceScore": 85
}

CRITICAL FORMATTING RULES:
- All strings must use double quotes (")
- Numbers must be unquoted: 467, 21, 8.5
- Arrays must use proper format: ["item1", "item2"]
- No trailing commas after last item
- No extra text inside string values
- Dates/years as strings: "2018"

SEARCH STRATEGY FOR DEPTH:
1. Perform 5-7 comprehensive web searches covering different aspects:
   - Search 1: "${query} project overview developer completion year"
   - Search 2: "${query} amenities facilities clubhouse specs"
   - Search 3: "${query} location connectivity nearby landmarks"
   - Search 4: "${query} reviews ratings resident feedback"
   - Search 5: "${query} pricing floor plans configurations"
   - Search 6: "${query} neighborhood lifestyle entertainment"
   - Search 7: "${query} expat community international schools"

2. Look for DETAILED sources:
   - Property blogs and detailed articles (not just listings)
   - Developer websites with comprehensive descriptions
   - Resident review sites and forums
   - Local area guides and neighborhood profiles
   - Real estate news and market analysis

3. Extract comprehensive information:
   - Write 3-4 sentence narrative paragraphs (not bullet points)
   - Include SPECIFIC names (e.g., "Orion Mall" not "nearby mall")
   - Provide detailed connectivity info with times/distances
   - List complete amenity names (e.g., "Olympic-sized swimming pool")
   - Include market positioning and target demographics

4. Quality requirements:
   - Each narrative field should be 2-4 sentences minimum
   - Include at least 5-10 specific amenity names
   - List 3-5 specific nearby landmarks for each category
   - Provide detailed commute analysis with times
   - Confidence score: 80+ = excellent, 60-79 = good, <60 = limited

CRITICAL - YOUR RESPONSE MUST BE:
- ONLY the JSON object, nothing else
- Follow the EXACT example format shown above
- Start with { and end with }
- No markdown, no explanations, no extra text
- Valid JSON with proper quotes and commas
- Numbers without quotes, strings with double quotes

Return the complete JSON now.`;

        // Call Claude API with unrestricted WebSearch
        // Using prefilled response technique for consistency (https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/increase-consistency)
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY || '',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 4096,
                tools: [{
                    type: 'web_search_20250305',
                    name: 'web_search',
                    // NO allowed_domains - let Claude search freely
                    max_uses: 7 // Allow 5-7 searches for comprehensive depth
                }],
                messages: [
                    {
                        role: 'user',
                        content: searchPrompt
                    },
                    {
                        role: 'assistant',
                        content: '{'  // Prefill response to force JSON output without preamble
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Claude API error ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        // Extract text content from Claude's response
        let aiResponse = '';
        for (const content of data.content || []) {
            if (content.type === 'text') {
                aiResponse += content.text;
            }
        }

        console.log(`[DirectSearch:${requestId}] 📄 Received response (${aiResponse.length} chars)`);

        // Since we prefilled with '{', we need to add it back to complete the JSON
        let cleanedResponse = '{' + aiResponse.trim();

        // Remove markdown code blocks if present
        if (cleanedResponse.includes('```json')) {
            cleanedResponse = cleanedResponse.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
        } else if (cleanedResponse.includes('```')) {
            cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
        }

        // Find JSON object boundaries (should already be clean with prefilling)
        const jsonStart = cleanedResponse.indexOf('{');
        const jsonEnd = cleanedResponse.lastIndexOf('}');

        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
            console.log(`[DirectSearch:${requestId}] 🔧 Extracted JSON from position ${jsonStart} to ${jsonEnd}`);
        }

        // Parse JSON from response
        console.log(`[DirectSearch:${requestId}] 🔧 Attempting to parse cleaned response...`);
        console.log(`[DirectSearch:${requestId}] First 200 chars:`, cleanedResponse.substring(0, 200));

        const parsedData = parseAIResponse(cleanedResponse);

        if (!parsedData) {
            console.error(`[DirectSearch:${requestId}] ❌ Failed to parse JSON. Raw response:`, aiResponse.substring(0, 500));
            return null;
        }

        console.log(`[DirectSearch:${requestId}] ✅ JSON parsed successfully`);

        if (parsedData && validatePropertyData(parsedData)) {
            const property: IntelligentPropertyResult = {
                id: `prop-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                title: query,
                description: parsedData.narratives?.projectOverview || '',
                ...normalizePropertyData(parsedData),
                sourceUrl: 'Multiple Sources',
                sourceName: 'Web Search',
                lastAnalyzed: new Date().toISOString(),
                searchScore: 0,
                sourceAnalyses: [] // Single unified result, no individual sources
            };

            console.log(`[DirectSearch:${requestId}] ✅ Search complete - Confidence: ${property.confidenceScore}%`);
            return property;
        }

        console.log(`[DirectSearch:${requestId}] ⚠️ Validation failed or incomplete data`);
        return null;

    } catch (error) {
        console.error(`[DirectSearch:${requestId}] ❌ Search failed:`, error);
        return null;
    }
}

/**
 * Search property using Google Gemini with Google Search grounding
 *
 * **Alternative to Claude WebSearch:**
 * Uses Gemini 2.5 Flash with Google Search integration.
 *
 * Benefits of Gemini:
 * - Google Search results (different from Claude's search)
 * - Grounding metadata with source URLs
 * - Free tier available
 * - Different AI perspective
 *
 * Differences from Claude:
 * - Uses google_search tool (not web_search_20250305)
 * - Different response format (candidates structure)
 * - Includes groundingMetadata with sources
 */
async function searchWithGemini(
    query: string,
    requestId: string
): Promise<IntelligentPropertyResult | null> {
    try {
        console.log(`[Gemini:${requestId}] 🔍 Searching with Gemini + Google Search for: ${query}`);

        // Same comprehensive prompt as Claude (reuse for consistency)
        const searchPrompt = `Search the web for "${query}" real estate property in India and extract comprehensive property intelligence.

CRITICAL: Return ONLY valid JSON with no additional text, explanation, or markdown formatting.

Extract data following this EXACT structure (this is an example with proper formatting):

{
  "specifications": {
    "propertyType": "Apartment",
    "configurations": ["3 BHK", "4 BHK", "5 BHK"],
    "areaRange": "3544-9788 sq ft",
    "priceRange": "₹6.20 Cr - ₹11.62 Cr",
    "totalUnits": 467,
    "totalFloors": 21,
    "amenitiesCount": 30
  },
  "location": {
    "neighborhood": "Subramani Nagar",
    "area": "Guddadahalli, Hebbal Kempapura",
    "city": "Bangalore",
    "nearbyAmenities": ["Orion Mall", "Columbia Asia Hospital", "Phoenix Market City"],
    "educationalInstitutions": ["Delhi Public School", "St. Joseph's College"],
    "healthcareFacilities": ["Columbia Asia Hospital", "Manipal Hospital"],
    "workProximity": {
      "businessHubs": ["Manyata Tech Park", "Hebbal Business District"],
      "techParks": ["Embassy Tech Village", "Kirloskar Business Park"],
      "commercialAreas": ["Hebbal", "Yelahanka"],
      "commuteAnalysis": "15 minutes to Manyata Tech Park, 25 minutes to Electronic City via ORR",
      "proximityScore": 8
    },
    "transportationAccess": ["Hebbal Metro Station - 3 km", "Kempegowda Airport - 15 km"]
  },
  "community": {
    "familyAmenities": ["Kids play area", "Crèche", "Daycare center"],
    "recreationalFacilities": ["Swimming pool", "Clubhouse", "Party hall"],
    "clubhouseFeatures": ["Indoor games room", "Library", "Meditation hall"],
    "sportsAndFitness": ["Gym", "Tennis court", "Jogging track"],
    "childrensFacilities": ["Play area", "Skating rink", "Kids pool"],
    "securityFeatures": ["24x7 security", "CCTV surveillance", "Gated community"]
  },
  "market": {
    "developerName": "Embassy Group",
    "completionYear": "2018",
    "projectStatus": "Ready to Move",
    "propertyCategory": "Luxury",
    "targetDemographic": ["Working professionals", "Expat families", "HNI buyers"],
    "investmentPotential": "Strong appreciation potential due to proximity to tech hubs and excellent connectivity. High rental demand from expat community working in nearby IT parks.",
    "onlinePresence": "Well-marketed with professional photography and virtual tours across major portals",
    "communityBuzz": "Highly rated for amenities and maintenance. Popular among expat community"
  },
  "narratives": {
    "projectOverview": "Embassy Lake Terraces is a prestigious residential development by Embassy Group, completed in 2018. Spread across acres of landscaped gardens, it offers luxurious apartments with world-class amenities and stunning views.",
    "neighborhoodDescription": "Located in the upscale Hebbal area, the property enjoys proximity to major IT hubs, shopping malls, and international schools. The neighborhood is known for its excellent infrastructure and cosmopolitan community.",
    "propertyPositioning": "Positioned as a luxury residential project targeting high-net-worth individuals and expat families. Premium finishes, expansive layouts, and resort-style amenities set it apart in the luxury segment.",
    "connectivityAnalysis": "Excellent connectivity with 15-minute drive to Manyata Tech Park and direct access to Outer Ring Road. Hebbal Metro station is 3 km away, and the international airport is just 15 km, making it ideal for frequent travelers.",
    "familyAppeal": "Perfect for families with extensive kid-friendly amenities including play areas, kids pool, and dedicated activity zones. Proximity to top international schools and healthcare facilities adds to family appeal.",
    "expatriatePopulation": "Very popular among expat community, particularly employees of MNCs in Manyata and Embassy Tech Village. International school proximity and modern amenities cater well to expat lifestyle.",
    "entertainmentLifestyle": "Surrounded by premium malls like Orion and Phoenix Market City. Fine dining restaurants, cafes, and entertainment options within short driving distance. Vibrant social scene with nearby clubs.",
    "onlinePresenceBuzz": "Consistently receives 4+ star ratings on property portals. Residents praise the maintenance, amenities, and professional management. Active community on social media.",
    "celebrityResidents": "Not publicly available"
  },
  "confidenceScore": 85
}

SEARCH STRATEGY FOR DEPTH:
1. Perform thorough Google searches covering different aspects:
   - "${query} project overview developer completion year"
   - "${query} amenities facilities clubhouse specs"
   - "${query} location connectivity nearby landmarks"
   - "${query} reviews ratings resident feedback"
   - "${query} pricing floor plans configurations"

2. Look for DETAILED sources: property blogs, developer websites, resident reviews, local guides

3. Write 3-4 sentence narrative paragraphs with SPECIFIC names

Return ONLY the JSON object, no extra text.`;

        // Call Gemini API with Google Search grounding
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: searchPrompt
                        }]
                    }],
                    tools: [{
                        google_search: {}  // Enable Google Search grounding
                    }],
                    generationConfig: {
                        temperature: 0.2,  // Lower temperature for consistency
                        maxOutputTokens: 4096,
                    }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log(`[Gemini:${requestId}] 📄 Response received`);

        // Extract text from Gemini's response format
        let aiResponse = '';
        if (data.candidates && data.candidates[0]?.content?.parts) {
            for (const part of data.candidates[0].content.parts) {
                if (part.text) {
                    aiResponse += part.text;
                }
            }
        }

        // Log grounding metadata if available
        if (data.candidates[0]?.groundingMetadata) {
            const metadata = data.candidates[0].groundingMetadata;
            console.log(`[Gemini:${requestId}] 🔗 Used ${metadata.webSearchQueries?.length || 0} search queries`);
            console.log(`[Gemini:${requestId}] 📚 Found ${metadata.groundingChunks?.length || 0} source chunks`);
        }

        console.log(`[Gemini:${requestId}] 📄 Extracted response (${aiResponse.length} chars)`);

        // Enhanced JSON extraction (same as Claude)
        let cleanedResponse = aiResponse.trim();

        // Remove markdown code blocks
        if (cleanedResponse.includes('```json')) {
            cleanedResponse = cleanedResponse.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
        } else if (cleanedResponse.includes('```')) {
            cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
        }

        // Find JSON object boundaries
        const jsonStart = cleanedResponse.indexOf('{');
        const jsonEnd = cleanedResponse.lastIndexOf('}');

        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
            console.log(`[Gemini:${requestId}] 🔧 Extracted JSON from position ${jsonStart} to ${jsonEnd}`);
        }

        // Parse JSON
        console.log(`[Gemini:${requestId}] 🔧 Attempting to parse JSON...`);
        console.log(`[Gemini:${requestId}] First 200 chars:`, cleanedResponse.substring(0, 200));

        const parsedData = parseAIResponse(cleanedResponse);

        if (!parsedData) {
            console.error(`[Gemini:${requestId}] ❌ Failed to parse JSON. Raw response:`, aiResponse.substring(0, 500));
            return null;
        }

        console.log(`[Gemini:${requestId}] ✅ JSON parsed successfully`);

        // Extract source citations from grounding metadata
        let sourceCitations: any[] = [];
        if (data.candidates[0]?.groundingMetadata?.groundingChunks) {
            sourceCitations = data.candidates[0].groundingMetadata.groundingChunks
                .filter((chunk: any) => chunk.web)
                .map((chunk: any) => ({
                    uri: chunk.web.uri,
                    title: chunk.web.title || chunk.web.uri
                }));

            console.log(`[Gemini:${requestId}] 📚 Extracted ${sourceCitations.length} source citations`);
            if (sourceCitations.length > 0) {
                console.log(`[Gemini:${requestId}] 🔗 First source:`, sourceCitations[0]);
            }
        }

        if (parsedData && validatePropertyData(parsedData)) {
            const property: IntelligentPropertyResult = {
                id: `prop-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                title: query,
                description: parsedData.narratives?.projectOverview || '',
                ...normalizePropertyData(parsedData),
                sourceUrl: sourceCitations.length > 0 ? sourceCitations[0].uri : 'Multiple Sources',
                sourceName: 'Google Search (Gemini)',
                lastAnalyzed: new Date().toISOString(),
                searchScore: 0,
                sourceAnalyses: [],
                sourceCitations: sourceCitations.length > 0 ? sourceCitations : undefined
            };

            console.log(`[Gemini:${requestId}] ✅ Search complete - Confidence: ${property.confidenceScore}%`);
            return property;
        }

        console.log(`[Gemini:${requestId}] ⚠️ Validation failed or incomplete data`);
        return null;

    } catch (error) {
        console.error(`[Gemini:${requestId}] ❌ Search failed:`, error);
        return null;
    }
}

/**
 * Extract property data using Claude WebSearch tool (DEPRECATED - use searchPropertyDirectly)
 *
 * **Next.js SSR Teaching Point:**
 * This function uses Claude's WebSearch tool with domain restrictions.
 * NOTE: Currently deprecated due to domain blocking issues.
 * Many sites block Anthropic's crawler when using allowed_domains.
 * Use searchPropertyDirectly() instead for better results.
 */
async function extractWithWebSearch(
    url: string,
    propertyName: string,
    requestId: string
): Promise<IntelligentPropertyResult | null> {
    try {
        const domain = new URL(url).hostname.replace('www.', '');
        console.log(`[WebSearch:${requestId}] 🔍 Searching ${domain} for: ${propertyName}`);

        // Create extraction prompt with our schema
        const extractionPrompt = `Search for "${propertyName}" on ${domain} and extract comprehensive property intelligence in this exact JSON schema:

{
  "specifications": {
    "propertyType": "string (Apartment/Villa/Plot)",
    "configurations": ["2 BHK", "3 BHK"],
    "areaRange": "string (e.g., 1200-1800 sq ft)",
    "priceRange": "string (e.g., ₹80L - ₹1.2Cr)",
    "totalUnits": "number or null",
    "totalFloors": "number or null",
    "amenitiesCount": number
  },
  "location": {
    "neighborhood": "string (specific locality name)",
    "area": "string (broader area)",
    "city": "string",
    "nearbyAmenities": ["schools", "malls", "parks"],
    "educationalInstitutions": ["specific school names"],
    "healthcareFacilities": ["hospital names"],
    "workProximity": {
      "businessHubs": ["Whitefield", "Electronic City"],
      "techParks": ["specific tech park names"],
      "commercialAreas": ["areas"],
      "commuteAnalysis": "string (detailed commute info)",
      "proximityScore": number (0-10 scale)
    },
    "transportationAccess": ["Metro station name - 2km", "Airport - 15km"]
  },
  "community": {
    "familyAmenities": ["Kids play area", "Crèche"],
    "recreationalFacilities": ["Swimming pool", "Clubhouse"],
    "clubhouseFeatures": ["specific features"],
    "sportsAndFitness": ["Gym", "Tennis court"],
    "childrensFacilities": ["Play area", "Activity room"],
    "securityFeatures": ["24/7 security", "CCTV", "Gated community"]
  },
  "market": {
    "developerName": "string",
    "completionYear": "string",
    "projectStatus": "Ready to Move/Under Construction/Upcoming",
    "propertyCategory": "Luxury/Premium/Mid-range",
    "targetDemographic": ["Working professionals", "Families"],
    "investmentPotential": "string (detailed analysis)",
    "onlinePresence": "string (how property is presented online)",
    "communityBuzz": "string (reviews, reputation)"
  },
  "narratives": {
    "projectOverview": "Write compelling 3-4 sentence opening paragraph about the property",
    "neighborhoodDescription": "Detailed 2-3 sentences about the area and surroundings",
    "propertyPositioning": "How this property is positioned in the market (2-3 sentences)",
    "connectivityAnalysis": "Comprehensive connectivity and accessibility analysis (3-4 sentences)",
    "familyAppeal": "Why this property appeals to families (2-3 sentences)",
    "expatriatePopulation": "Information about expat community and appeal (2-3 sentences)",
    "entertainmentLifestyle": "Nearby entertainment, dining, lifestyle options (2-3 sentences)",
    "onlinePresenceBuzz": "Online reviews, social media presence, community discussions (2-3 sentences)",
    "celebrityResidents": "Any known celebrity residents or high-profile owners (1-2 sentences or 'Not available')"
  },
  "confidenceScore": number (0-100, based on data completeness)
}

Important:
1. Search ${domain} specifically for "${propertyName}"
2. Extract ALL available information
3. Write detailed narratives (not just keywords)
4. Return ONLY valid JSON, no extra text
5. If information not available, use empty string "" or empty array []
6. Confidence score should reflect data completeness (80+ = excellent, 60-79 = good, <60 = limited)`;

        // Call Claude API with WebSearch tool enabled
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY || '',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 4096,
                tools: [{
                    type: 'web_search_20250305',
                    name: 'web_search',
                    allowed_domains: [domain], // Restrict search to this domain
                    max_uses: 3 // Allow up to 3 searches for thorough extraction
                }],
                messages: [{
                    role: 'user',
                    content: extractionPrompt
                }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Claude API error ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        // Extract text content from Claude's response
        let aiResponse = '';
        for (const content of data.content || []) {
            if (content.type === 'text') {
                aiResponse += content.text;
            }
        }

        console.log(`[WebSearch:${requestId}] 📄 Received response (${aiResponse.length} chars)`);

        // Parse JSON from response
        const parsedData = parseAIResponse(aiResponse);

        if (parsedData && validatePropertyData(parsedData)) {
            const property: IntelligentPropertyResult = {
                id: `prop-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                title: propertyName,
                description: parsedData.narratives?.projectOverview || '',
                ...normalizePropertyData(parsedData),
                sourceUrl: url,
                sourceName: domain,
                lastAnalyzed: new Date().toISOString(),
                searchScore: 0
            };

            console.log(`[WebSearch:${requestId}] ✅ Extraction successful - Confidence: ${property.confidenceScore}%`);
            return property;
        }

        console.log(`[WebSearch:${requestId}] ⚠️ Validation failed or incomplete data`);
        return null;

    } catch (error) {
        console.error(`[WebSearch:${requestId}] ❌ Extraction failed:`, error);
        return null;
    }
}

/**
 * Merge enhanced analysis with existing property
 */
function mergeEnhancedAnalysis(
    originalProperty: IntelligentPropertyResult,
    enhancedAnalysis: any
): IntelligentPropertyResult {
    // Merge enhanced data while preserving original structure
    return {
        ...originalProperty,
        specifications: {
            ...originalProperty.specifications,
            ...enhancedAnalysis.specifications
        },
        location: {
            ...originalProperty.location,
            ...enhancedAnalysis.location
        },
        community: {
            ...originalProperty.community,
            ...enhancedAnalysis.community
        },
        market: {
            ...originalProperty.market,
            ...enhancedAnalysis.market
        },
        confidenceScore: Math.max(originalProperty.confidenceScore, enhancedAnalysis.confidenceScore || 0),
        analysisDepth: 'comprehensive' as const
    };
}

// Handle unsupported methods
export async function GET() {
    return NextResponse.json(
        { error: 'Method not allowed. Use POST to search for properties.' },
        { status: 405 }
    );
}