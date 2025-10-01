/**
 * Claude-Powered Property Intelligence Search Service
 * Uses Claude's WebSearch tool for intelligent real estate analysis
 */

import {
    IntelligentPropertyResult,
    IntelligentSearchResponse,
    PropertySearchOptions,
    WebSearchResult,
    LocationIntelligence,
    CommunityFeatures,
    MarketIntelligence,
    PropertySpecifications
} from '@/lib/types/property-intelligence';

export class ClaudeSearchService {
    private searchId: string;

    constructor() {
        this.searchId = Math.random().toString(36).substring(7);
    }

    /**
     * Main search function - intelligently searches and analyzes properties
     */
    async searchProperties(
        query: string,
        options: PropertySearchOptions = {}
    ): Promise<IntelligentSearchResponse> {
        const startTime = Date.now();

        console.log(`[Claude Search:${this.searchId}] 🤖 Starting intelligent property search for: "${query}"`);

        try {
            // Step 1: Optimize query for real estate search
            const optimizedQuery = this.optimizeRealEstateQuery(query);
            console.log(`[Claude Search:${this.searchId}] 🎯 Optimized query: "${optimizedQuery}"`);

            // Step 2: Perform web search using Claude's WebSearch tool
            // Note: This will be called from the API route context where WebSearch is available
            const searchResults = await this.performWebSearch(optimizedQuery);
            console.log(`[Claude Search:${this.searchId}] 🔍 Found ${searchResults.length} search results`);

            // Step 3: Analyze each result using AI
            const analysisPromises = searchResults.map(result =>
                this.analyzePropertyContent(result, options.analysisDepth || 'detailed')
            );

            const analysisResults = await Promise.all(analysisPromises);
            const validResults = analysisResults.filter(result => result !== null) as IntelligentPropertyResult[];

            console.log(`[Claude Search:${this.searchId}] 📊 Successfully analyzed ${validResults.length} properties`);

            // Step 4: Sort by relevance and confidence
            validResults.sort((a, b) => {
                const scoreA = (a.searchScore * 0.6) + (a.confidenceScore * 0.4);
                const scoreB = (b.searchScore * 0.6) + (b.confidenceScore * 0.4);
                return scoreB - scoreA;
            });

            // Step 5: Generate search insights
            const insights = this.generateSearchInsights(validResults, query);

            const response: IntelligentSearchResponse = {
                success: true,
                query: optimizedQuery,
                properties: validResults.slice(0, options.maxResults || 10),
                totalFound: validResults.length,
                searchTime: Date.now() - startTime,
                analysisQuality: this.calculateAnalysisQuality(validResults),
                searchInsights: insights
            };

            console.log(`[Claude Search:${this.searchId}] ✅ Search completed in ${response.searchTime}ms`);
            return response;

        } catch (error) {
            console.error(`[Claude Search:${this.searchId}] ❌ Search failed:`, error);

            return {
                success: false,
                query,
                properties: [],
                totalFound: 0,
                searchTime: Date.now() - startTime,
                analysisQuality: { averageConfidence: 0, detailedResults: 0, basicResults: 0 },
                searchInsights: { popularAreas: [], priceRangeAnalysis: '', marketTrends: '' },
                error: error instanceof Error ? error.message : 'Unknown search error'
            };
        }
    }

    /**
     * Optimize user query for comprehensive real estate searches
     */
    private optimizeRealEstateQuery(query: string): string {
        const queryLower = query.toLowerCase().trim();

        // Identify query type and optimize accordingly
        if (this.isSpecificPropertyQuery(queryLower)) {
            return this.optimizePropertySpecificQuery(query, queryLower);
        } else if (this.isDeveloperQuery(queryLower)) {
            return this.optimizeDeveloperQuery(query, queryLower);
        } else if (this.isLocationBasedQuery(queryLower)) {
            return this.optimizeLocationQuery(query, queryLower);
        } else {
            return this.optimizeGenericQuery(query, queryLower);
        }
    }

    /**
     * Check if query is for a specific property/project
     */
    private isSpecificPropertyQuery(query: string): boolean {
        const propertyIndicators = [
            'lake terraces', 'gateway', 'heights', 'gardens', 'residency', 'towers',
            'enclave', 'grand', 'royal', 'palace', 'county', 'park', 'square',
            'retreat', 'mansion', 'manor', 'vista', 'ridge', 'woods', 'greens'
        ];

        return propertyIndicators.some(indicator => query.includes(indicator));
    }

    /**
     * Check if query is developer-focused
     */
    private isDeveloperQuery(query: string): boolean {
        const developers = [
            'prestige', 'brigade', 'sobha', 'embassy', 'godrej', 'mahindra',
            'dlf', 'lodha', 'tata', 'larsen', 'hiranandani', 'oberoi'
        ];

        return developers.some(dev => query.includes(dev));
    }

    /**
     * Check if query is location-based
     */
    private isLocationBasedQuery(query: string): boolean {
        const locationTerms = [
            'apartments in', 'flats in', 'properties in', 'houses in',
            'bangalore', 'mumbai', 'delhi', 'pune', 'hyderabad', 'chennai',
            'electronic city', 'whitefield', 'koramangala', 'indiranagar'
        ];

        return locationTerms.some(term => query.includes(term));
    }

    /**
     * Optimize for specific property searches like "Embassy Lake Terraces"
     */
    private optimizePropertySpecificQuery(query: string, queryLower: string): string {
        const components = [];

        // Add the original query
        components.push(`"${query}"`);

        // Add property-specific search terms
        components.push(query);
        components.push(`${query} residential project`);
        components.push(`${query} apartments`);
        components.push(`${query} flats`);
        components.push(`${query} property details`);
        components.push(`${query} price`);
        components.push(`${query} location`);
        components.push(`${query} amenities`);

        // Add developer search if identifiable
        if (queryLower.includes('embassy')) {
            components.push(`Embassy Group ${query}`);
        } else if (queryLower.includes('prestige')) {
            components.push(`Prestige Group ${query}`);
        } else if (queryLower.includes('brigade')) {
            components.push(`Brigade Group ${query}`);
        } else if (queryLower.includes('sobha')) {
            components.push(`Sobha Limited ${query}`);
        }

        // Add location context if missing
        if (!this.hasLocationContext(queryLower)) {
            components.push(`${query} Bangalore`);
            components.push(`${query} India`);
        }

        // Add real estate site specific searches
        components.push(`site:99acres.com ${query}`);
        components.push(`site:magicbricks.com ${query}`);
        components.push(`site:housing.com ${query}`);
        components.push(`site:commonfloor.com ${query}`);
        components.push(`site:nobroker.in ${query}`);

        return components.join(' OR ');
    }

    /**
     * Optimize for developer-focused queries
     */
    private optimizeDeveloperQuery(query: string, queryLower: string): string {
        const components = [];

        components.push(`"${query}"`);
        components.push(`${query} properties`);
        components.push(`${query} projects`);
        components.push(`${query} residential`);
        components.push(`${query} apartments`);

        if (!this.hasLocationContext(queryLower)) {
            components.push(`${query} Bangalore India`);
        }

        return components.join(' OR ');
    }

    /**
     * Optimize for location-based queries
     */
    private optimizeLocationQuery(query: string, queryLower: string): string {
        const components = [];

        components.push(`"${query}"`);
        components.push(`${query} new projects`);
        components.push(`${query} ready to move`);
        components.push(`${query} under construction`);

        return components.join(' OR ');
    }

    /**
     * Optimize generic queries
     */
    private optimizeGenericQuery(query: string, queryLower: string): string {
        const components = [];

        components.push(query);
        components.push(`${query} real estate`);
        components.push(`${query} property`);
        components.push(`${query} residential`);

        if (!this.hasLocationContext(queryLower)) {
            components.push(`${query} Bangalore India`);
        }

        return components.join(' OR ');
    }

    /**
     * Check if query has location context
     */
    private hasLocationContext(query: string): boolean {
        const locations = [
            'bangalore', 'bengaluru', 'mumbai', 'delhi', 'pune', 'hyderabad',
            'chennai', 'kolkata', 'ahmedabad', 'surat', 'india',
            'electronic city', 'whitefield', 'koramangala', 'indiranagar',
            'gurgaon', 'noida', 'andheri', 'bandra', 'thane'
        ];

        return locations.some(location => query.includes(location));
    }

    /**
     * Perform web search - this will be implemented in the API route
     * where WebSearch tool is available
     */
    private async performWebSearch(query: string): Promise<WebSearchResult[]> {
        // This is a placeholder - actual implementation will be in API route
        // where Claude's WebSearch tool is accessible
        throw new Error('Web search must be performed in API route context');
    }

    /**
     * Analyze property content using AI
     */
    private async analyzePropertyContent(
        searchResult: WebSearchResult,
        depth: 'basic' | 'detailed' | 'comprehensive'
    ): Promise<IntelligentPropertyResult | null> {
        try {
            // This will use Claude's analysis capabilities
            // Placeholder for AI analysis logic
            const analysisPrompt = this.buildAnalysisPrompt(searchResult, depth);

            // Parse AI response into structured data
            const analysis = await this.parseAIAnalysis(searchResult.content, analysisPrompt);

            if (!analysis) return null;

            return {
                id: `prop-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                title: searchResult.title,
                description: this.extractDescription(searchResult.content),
                specifications: analysis.specifications,
                location: analysis.location,
                community: analysis.community,
                market: analysis.market,
                confidenceScore: analysis.confidenceScore,
                analysisDepth: depth,
                sourceUrl: searchResult.url,
                sourceName: this.extractDomainName(searchResult.url),
                lastAnalyzed: new Date().toISOString(),
                searchScore: this.calculateRelevanceScore(searchResult, analysis)
            };

        } catch (error) {
            console.error(`[Claude Search:${this.searchId}] Failed to analyze:`, searchResult.url, error);
            return null;
        }
    }

    /**
     * Build analysis prompt based on search result and depth
     */
    private buildAnalysisPrompt(result: WebSearchResult, depth: string): string {
        const basePrompt = `
        Analyze this real estate content and extract structured information:

        Title: ${result.title}
        URL: ${result.url}
        Content: ${result.content}

        Please extract and return ONLY a JSON object with this exact structure:
        `;

        if (depth === 'basic') {
            return basePrompt + `
            {
                "specifications": {
                    "propertyType": "string",
                    "configurations": ["array of strings"],
                    "priceRange": "string"
                },
                "location": {
                    "neighborhood": "string",
                    "area": "string",
                    "city": "string"
                },
                "confidenceScore": number
            }`;
        }

        return basePrompt + `
        {
            "specifications": {
                "propertyType": "string",
                "configurations": ["array"],
                "areaRange": "string",
                "priceRange": "string",
                "totalUnits": "string",
                "amenitiesCount": number
            },
            "location": {
                "neighborhood": "string",
                "area": "string",
                "city": "string",
                "nearbyAmenities": ["array"],
                "educationalInstitutions": ["array"],
                "workProximity": {
                    "businessHubs": ["array"],
                    "techParks": ["array"],
                    "commuteAnalysis": "string",
                    "proximityScore": number
                }
            },
            "community": {
                "familyAmenities": ["array"],
                "recreationalFacilities": ["array"],
                "clubhouseFeatures": ["array"],
                "sportsAndFitness": ["array"]
            },
            "market": {
                "developerName": "string",
                "completionYear": "string",
                "propertyCategory": "string",
                "targetDemographic": ["array"],
                "investmentPotential": "string"
            },
            "confidenceScore": number
        }`;
    }

    /**
     * Parse AI analysis response
     */
    private async parseAIAnalysis(content: string, prompt: string): Promise<any> {
        // This would use Claude's analysis in the API route context
        // For now, return null to indicate analysis needed
        return null;
    }

    /**
     * Extract description from content
     */
    private extractDescription(content: string): string {
        // Extract first meaningful paragraph
        const sentences = content.split('.').slice(0, 3);
        return sentences.join('.') + '.';
    }

    /**
     * Extract domain name from URL
     */
    private extractDomainName(url: string): string {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return 'Unknown Source';
        }
    }

    /**
     * Calculate relevance score for property
     */
    private calculateRelevanceScore(searchResult: WebSearchResult, analysis: any): number {
        let score = 0;

        // Base score from title relevance
        score += 30;

        // Bonus for having price information
        if (analysis.specifications?.priceRange) score += 20;

        // Bonus for location details
        if (analysis.location?.neighborhood) score += 15;

        // Bonus for amenities information
        if (analysis.community?.familyAmenities?.length > 0) score += 15;

        // Bonus for developer information
        if (analysis.market?.developerName) score += 20;

        return Math.min(score, 100);
    }

    /**
     * Calculate analysis quality metrics
     */
    private calculateAnalysisQuality(results: IntelligentPropertyResult[]) {
        if (results.length === 0) {
            return { averageConfidence: 0, detailedResults: 0, basicResults: 0 };
        }

        const averageConfidence = results.reduce((sum, r) => sum + r.confidenceScore, 0) / results.length;
        const detailedResults = results.filter(r => r.analysisDepth === 'detailed' || r.analysisDepth === 'comprehensive').length;
        const basicResults = results.filter(r => r.analysisDepth === 'basic').length;

        return { averageConfidence, detailedResults, basicResults };
    }

    /**
     * Generate search insights
     */
    private generateSearchInsights(results: IntelligentPropertyResult[], query: string) {
        const areas = results.map(r => r.location.area).filter(Boolean);
        const popularAreas = [...new Set(areas)].slice(0, 5);

        return {
            popularAreas,
            priceRangeAnalysis: 'Price analysis based on search results',
            marketTrends: 'Market trend analysis for searched properties'
        };
    }
}

/**
 * Create and export service instance
 */
export function createClaudeSearchService(): ClaudeSearchService {
    return new ClaudeSearchService();
}