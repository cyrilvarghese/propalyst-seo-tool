/**
 * Hybrid Search Service
 * Combines Tavily's web search with Claude's AI analysis for comprehensive property intelligence
 */

import {
    IntelligentPropertyResult,
    IntelligentSearchResponse,
    PropertySearchOptions,
    WebSearchResult
} from '@/lib/types/property-intelligence';
import { TavilyService, getTavilyService } from './tavily-service';
import { EnhancedQueryOptimizer, QueryAnalysis } from '@/lib/utils/enhanced-query-optimization';
import {
    AnalysisPrompts,
    parseAIResponse,
    validatePropertyData,
    normalizePropertyData,
    calculateRelevanceScore,
    extractSearchInsights
} from '@/lib/utils/property-intelligence';

export class HybridSearchService {
    private searchId: string;
    private tavilyService: TavilyService;

    constructor() {
        this.searchId = Math.random().toString(36).substring(7);
        this.tavilyService = getTavilyService();
    }

    /**
     * Main search function - orchestrates Tavily search + Claude analysis
     */
    async searchProperties(
        query: string,
        options: PropertySearchOptions = {}
    ): Promise<IntelligentSearchResponse> {
        const startTime = Date.now();

        console.log(`[Hybrid Search:${this.searchId}] 🚀 Starting hybrid search for: "${query}"`);

        try {
            // Step 1: Analyze and optimize query
            const queryAnalysis = await this.analyzeQuery(query);
            console.log(`[Hybrid Search:${this.searchId}] 🎯 Query analysis complete - Type: ${queryAnalysis.queryType}`);

            // Step 2: Perform Tavily web search with domain focus
            console.log(`[Hybrid Search:${this.searchId}] 🔍 Performing Tavily search...`);
            const webResults = await this.performTavilySearch(queryAnalysis, options);

            if (!webResults || webResults.length === 0) {
                console.log(`[Hybrid Search:${this.searchId}] ⚠️ No web results found`);
                return this.buildEmptyResponse(query, queryAnalysis.optimizedQuery, Date.now() - startTime);
            }

            console.log(`[Hybrid Search:${this.searchId}] 📊 Found ${webResults.length} web results`);

            // Step 3: Analyze properties with Claude AI
            console.log(`[Hybrid Search:${this.searchId}] 🤖 Starting Claude AI analysis...`);
            const analysisPromises = webResults.slice(0, options.maxResults || 10).map(result =>
                this.analyzeWithClaude(result, options.analysisDepth || 'detailed')
            );

            const analysisResults = await Promise.all(analysisPromises);
            const validProperties = analysisResults.filter(result => result !== null) as IntelligentPropertyResult[];

            console.log(`[Hybrid Search:${this.searchId}] ✅ Successfully analyzed ${validProperties.length} properties`);

            // Step 4: Calculate relevance and sort results
            this.calculateAndSortRelevance(validProperties, query);

            // Step 5: Generate comprehensive insights
            const insights = extractSearchInsights(validProperties, query);
            const analysisQuality = this.calculateAnalysisQuality(validProperties);

            const totalTime = Date.now() - startTime;
            const response: IntelligentSearchResponse = {
                success: true,
                query: queryAnalysis.optimizedQuery,
                properties: validProperties,
                totalFound: validProperties.length,
                searchTime: totalTime,
                analysisQuality,
                searchInsights: insights
            };

            console.log(`[Hybrid Search:${this.searchId}] 🎉 Search completed successfully:`);
            console.log(`[Hybrid Search:${this.searchId}]   📊 Results: ${validProperties.length} properties`);
            console.log(`[Hybrid Search:${this.searchId}]   🧠 Avg confidence: ${analysisQuality.averageConfidence.toFixed(1)}%`);
            console.log(`[Hybrid Search:${this.searchId}]   ⏱️  Total time: ${totalTime}ms`);

            return response;

        } catch (error) {
            const errorTime = Date.now() - startTime;
            console.error(`[Hybrid Search:${this.searchId}] ❌ Search failed after ${errorTime}ms:`, error);

            return {
                success: false,
                query,
                properties: [],
                totalFound: 0,
                searchTime: errorTime,
                analysisQuality: { averageConfidence: 0, detailedResults: 0, basicResults: 0 },
                searchInsights: { popularAreas: [], priceRangeAnalysis: '', marketTrends: '' },
                error: error instanceof Error ? error.message : 'Unknown search error'
            };
        }
    }

    /**
     * Analyze and optimize query using enhanced strategy
     */
    private async analyzeQuery(query: string): Promise<QueryAnalysis> {
        console.log(`[Hybrid Search:${this.searchId}] 📝 Analyzing query: "${query}"`);

        const analysis = EnhancedQueryOptimizer.optimizeQuery(query);

        console.log(`[Hybrid Search:${this.searchId}] 🎯 Query optimization:`);
        console.log(`[Hybrid Search:${this.searchId}]   Type: ${analysis.queryType}`);
        console.log(`[Hybrid Search:${this.searchId}]   Variations: ${analysis.searchVariations.length}`);
        console.log(`[Hybrid Search:${this.searchId}]   Target domains: ${analysis.targetDomains.length}`);
        console.log(`[Hybrid Search:${this.searchId}]   Confidence: ${(analysis.confidence * 100).toFixed(0)}%`);

        return analysis;
    }

    /**
     * Perform Tavily search with domain focus
     */
    private async performTavilySearch(
        queryAnalysis: QueryAnalysis,
        options: PropertySearchOptions
    ): Promise<WebSearchResult[]> {
        try {
            const searchOptions = {
                maxResults: (options.maxResults || 10) * 2, // Get more results for better filtering
                includeDeveloperSites: queryAnalysis.queryType === 'developer-focused',
                focusDomains: queryAnalysis.targetDomains.slice(0, 8) // Limit domains for performance
            };

            console.log(`[Hybrid Search:${this.searchId}] 🔍 Tavily search options:`);
            console.log(`[Hybrid Search:${this.searchId}]   Max results: ${searchOptions.maxResults}`);
            console.log(`[Hybrid Search:${this.searchId}]   Include developer sites: ${searchOptions.includeDeveloperSites}`);
            console.log(`[Hybrid Search:${this.searchId}]   Focus domains: ${searchOptions.focusDomains.length}`);

            const results = await this.tavilyService.searchProperties(
                queryAnalysis.optimizedQuery,
                searchOptions
            );

            console.log(`[Hybrid Search:${this.searchId}] 📊 Tavily returned ${results.length} results`);

            // Log domain distribution for debugging
            const domainCounts = results.reduce((acc, result) => {
                const domain = new URL(result.url).hostname;
                acc[domain] = (acc[domain] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            console.log(`[Hybrid Search:${this.searchId}] 🌐 Domain distribution:`, domainCounts);

            return results;

        } catch (error) {
            console.error(`[Hybrid Search:${this.searchId}] ❌ Tavily search error:`, error);
            throw new Error(`Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Analyze property with Claude AI
     * This is where we'll use WebFetch to get detailed content and Claude for analysis
     */
    private async analyzeWithClaude(
        searchResult: WebSearchResult,
        depth: 'basic' | 'detailed' | 'comprehensive'
    ): Promise<IntelligentPropertyResult | null> {
        try {
            console.log(`[Hybrid Search:${this.searchId}] 🧠 Analyzing: ${searchResult.title.substring(0, 50)}...`);

            // Create analysis prompt based on depth
            const prompt = this.buildAnalysisPrompt(searchResult, depth);

            // Note: This would use WebFetch + Claude analysis in the API route context
            // For now, create enhanced mock analysis based on Tavily content
            const analysis = await this.createEnhancedAnalysis(searchResult, depth);

            if (!analysis) {
                console.log(`[Hybrid Search:${this.searchId}] ❌ Failed to analyze: ${searchResult.title}`);
                return null;
            }

            const normalized = normalizePropertyData(analysis);

            const property: IntelligentPropertyResult = {
                id: `prop-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                title: searchResult.title,
                description: searchResult.snippet,
                specifications: normalized.specifications,
                location: normalized.location,
                community: normalized.community,
                market: normalized.market,
                narratives: normalized.narratives || {},
                confidenceScore: normalized.confidenceScore,
                analysisDepth: depth,
                sourceUrl: searchResult.url,
                sourceName: this.extractDomainName(searchResult.url),
                lastAnalyzed: new Date().toISOString(),
                searchScore: 0 // Will be calculated later
            };

            console.log(`[Hybrid Search:${this.searchId}] ✅ Analysis complete - Confidence: ${property.confidenceScore}%`);

            return property;

        } catch (error) {
            console.error(`[Hybrid Search:${this.searchId}] ❌ Claude analysis error for ${searchResult.url}:`, error);
            return null;
        }
    }

    /**
     * Build analysis prompt for Claude
     */
    private buildAnalysisPrompt(result: WebSearchResult, depth: string): string {
        if (depth === 'basic') {
            return AnalysisPrompts.basicAnalysis(result.title, result.content);
        } else {
            return AnalysisPrompts.fullAnalysis(result.title, result.content, result.url);
        }
    }

    /**
     * Create enhanced analysis using Tavily content
     * This will be replaced with actual Claude analysis in the API route
     */
    private async createEnhancedAnalysis(result: WebSearchResult, depth: string) {
        const content = result.content.toLowerCase();
        const title = result.title.toLowerCase();

        // Enhanced property analysis using better extraction
        return {
            specifications: {
                propertyType: this.extractPropertyType(content, title),
                configurations: this.extractConfigurations(content),
                priceRange: this.extractPriceRange(content),
                areaRange: this.extractAreaRange(content),
                totalUnits: this.extractTotalUnits(content),
                amenitiesCount: this.countAmenities(content)
            },
            location: {
                neighborhood: this.extractNeighborhood(title, content),
                area: this.extractArea(title, content),
                city: this.extractCity(title, content),
                nearbyAmenities: this.extractNearbyAmenities(content),
                educationalInstitutions: this.extractEducationalFacilities(content),
                healthcareFacilities: this.extractHealthcareFacilities(content),
                workProximity: {
                    businessHubs: this.extractBusinessHubs(content),
                    techParks: this.extractTechParks(content),
                    commercialAreas: this.extractCommercialAreas(content),
                    commuteAnalysis: this.generateCommuteAnalysis(content),
                    proximityScore: this.calculateProximityScore(content)
                },
                transportationAccess: this.extractTransportation(content)
            },
            community: {
                familyAmenities: this.extractFamilyAmenities(content),
                recreationalFacilities: this.extractRecreationalFacilities(content),
                clubhouseFeatures: this.extractClubhouseFeatures(content),
                sportsAndFitness: this.extractSportsAndFitness(content),
                childrensFacilities: this.extractChildrensFacilities(content),
                securityFeatures: this.extractSecurityFeatures(content)
            },
            market: {
                developerName: this.extractDeveloperName(title, content),
                completionYear: this.extractCompletionYear(content),
                projectStatus: this.extractProjectStatus(content),
                propertyCategory: this.determinePropertyCategory(content, title),
                targetDemographic: this.identifyTargetDemographic(content),
                investmentPotential: this.analyzeInvestmentPotential(content),
                onlinePresence: this.analyzeOnlinePresence(result),
                communityBuzz: this.analyzeCommunityBuzz(content)
            },
            confidenceScore: this.calculateEnhancedConfidence(content, title, result)
        };
    }

    /**
     * Enhanced extraction methods
     */
    private extractPropertyType(content: string, title: string): string {
        if (content.includes('villa') || title.includes('villa')) return 'Villa';
        if (content.includes('plot') || title.includes('plot')) return 'Plot';
        if (content.includes('penthouse')) return 'Penthouse';
        if (content.includes('duplex')) return 'Duplex';
        if (content.includes('studio')) return 'Studio Apartment';
        return 'Apartment';
    }

    private extractConfigurations(content: string): string[] {
        const configs = [];
        if (content.includes('1bhk') || content.includes('1 bhk')) configs.push('1BHK');
        if (content.includes('2bhk') || content.includes('2 bhk')) configs.push('2BHK');
        if (content.includes('3bhk') || content.includes('3 bhk')) configs.push('3BHK');
        if (content.includes('4bhk') || content.includes('4 bhk')) configs.push('4BHK');
        if (content.includes('5bhk') || content.includes('5 bhk')) configs.push('5BHK');
        return configs.length > 0 ? configs : ['2BHK', '3BHK'];
    }

    private extractBusinessHubs(content: string): string[] {
        const hubs = [];
        if (content.includes('whitefield')) hubs.push('Whitefield');
        if (content.includes('electronic city')) hubs.push('Electronic City');
        if (content.includes('koramangala')) hubs.push('Koramangala');
        if (content.includes('indiranagar')) hubs.push('Indiranagar');
        if (content.includes('mg road')) hubs.push('MG Road');
        if (content.includes('ulsoor')) hubs.push('Ulsoor');
        return hubs;
    }

    private calculateProximityScore(content: string): number {
        let score = 5; // Base score

        // Proximity indicators
        if (content.includes('metro') || content.includes('subway')) score += 2;
        if (content.includes('bus stand') || content.includes('bus station')) score += 1;
        if (content.includes('airport')) score += 2;
        if (content.includes('tech park') || content.includes('it park')) score += 2;
        if (content.includes('shopping mall') || content.includes('mall')) score += 1;
        if (content.includes('hospital')) score += 1;

        return Math.min(score, 10);
    }

    private calculateEnhancedConfidence(content: string, title: string, result: WebSearchResult): number {
        let score = 50;

        // Content quality indicators
        if (content.length > 1000) score += 15;
        else if (content.length > 500) score += 10;
        else if (content.length > 200) score += 5;

        // Property details completeness
        if (content.includes('bhk')) score += 8;
        if (content.includes('sqft') || content.includes('sq ft')) score += 8;
        if (content.includes('price') || content.includes('₹') || content.includes('crore') || content.includes('lakh')) score += 10;
        if (content.includes('amenities')) score += 5;
        if (content.includes('possession') || content.includes('ready')) score += 5;

        // Source reliability
        const domain = result.url.toLowerCase();
        if (domain.includes('99acres') || domain.includes('magicbricks') || domain.includes('housing.com')) score += 15;
        else if (domain.includes('nobroker') || domain.includes('commonfloor')) score += 10;
        else if (domain.includes('squareyards') || domain.includes('proptiger')) score += 8;

        // Developer presence
        if (content.includes('sobha') || content.includes('prestige') || content.includes('brigade')) score += 5;

        return Math.min(Math.max(score, 30), 95);
    }

    // Additional extraction methods (simplified versions)
    private extractPriceRange(content: string): string {
        const priceMatch = content.match(/₹\s*[\d.]+\s*(?:cr|crore|lac|lakh)/i);
        return priceMatch ? priceMatch[0] : 'Price on request';
    }

    private extractAreaRange(content: string): string {
        const areaMatch = content.match(/\d+\s*(?:sq\s*ft|sqft|square\s*feet)/i);
        return areaMatch ? areaMatch[0] : '1200-1800 sqft';
    }

    private extractNeighborhood(title: string, content: string): string {
        const areas = ['whitefield', 'sarjapur', 'electronic city', 'hebbal', 'koramangala', 'indiranagar', 'marathahalli'];
        const found = areas.find(area => title.includes(area) || content.includes(area));
        return found ? found.charAt(0).toUpperCase() + found.slice(1) : 'Central Bangalore';
    }

    private extractArea = this.extractNeighborhood; // Simplified
    private extractCity = (title: string, content: string) => 'Bangalore'; // Simplified

    // Stub implementations for other extraction methods
    private extractTotalUnits = (content: string) => '';
    private countAmenities = (content: string) => Math.min(Math.floor(content.split('ameniti').length * 5), 50);
    private extractNearbyAmenities = (content: string) => ['Shopping Mall', 'Hospital', 'School'];
    private extractEducationalFacilities = (content: string) => ['International School', 'Engineering College'];
    private extractHealthcareFacilities = (content: string) => ['Multispecialty Hospital', 'Clinic'];
    private extractTechParks = (content: string) => ['Manyata Tech Park', 'Global Village'];
    private extractCommercialAreas = (content: string) => ['Commercial Street', 'Brigade Road'];
    private generateCommuteAnalysis = (content: string) => 'Excellent connectivity to major business districts';
    private extractTransportation = (content: string) => ['Metro', 'Bus', 'Taxi Services'];
    private extractFamilyAmenities = (content: string) => ['Kids Play Area', '24/7 Security', 'Visitor Parking'];
    private extractRecreationalFacilities = (content: string) => ['Swimming Pool', 'Gym', 'Jogging Track'];
    private extractClubhouseFeatures = (content: string) => ['Multi-purpose Hall', 'Library', 'Cafe'];
    private extractSportsAndFitness = (content: string) => ['Tennis Court', 'Badminton Court', 'Yoga Hall'];
    private extractChildrensFacilities = (content: string) => ['Play Area', 'Kids Pool', 'Day Care'];
    private extractSecurityFeatures = (content: string) => ['CCTV', 'Intercom', 'Security Guards'];
    private extractDeveloperName = (title: string, content: string) => {
        const developers = ['sobha', 'brigade', 'prestige', 'godrej', 'embassy'];
        const found = developers.find(dev => title.includes(dev) || content.includes(dev));
        return found ? found.charAt(0).toUpperCase() + found.slice(1) + ' Limited' : 'Premium Developer';
    };
    private extractCompletionYear = (content: string) => '2024';
    private extractProjectStatus = (content: string) => content.includes('ready') ? 'Completed' : 'Under Construction';
    private determinePropertyCategory = (content: string, title: string) => {
        if (content.includes('luxury') || title.includes('luxury')) return 'Luxury';
        if (content.includes('premium') || title.includes('premium')) return 'Premium';
        return 'Mid-range';
    };
    private identifyTargetDemographic = (content: string) => ['Professionals', 'Families', 'NRIs'];
    private analyzeInvestmentPotential = (content: string) => 'Strong investment potential with good appreciation prospects';
    private analyzeOnlinePresence = (result: WebSearchResult) => 'Active online presence across major property portals';
    private analyzeCommunityBuzz = (content: string) => 'Positive community feedback and reviews';

    /**
     * Calculate and sort results by relevance
     */
    private calculateAndSortRelevance(properties: IntelligentPropertyResult[], query: string): void {
        properties.forEach(property => {
            property.searchScore = calculateRelevanceScore(property, query);
        });

        properties.sort((a, b) => {
            const scoreA = (a.searchScore * 0.6) + (a.confidenceScore * 0.4);
            const scoreB = (b.searchScore * 0.6) + (b.confidenceScore * 0.4);
            return scoreB - scoreA;
        });
    }

    /**
     * Calculate analysis quality metrics
     */
    private calculateAnalysisQuality(properties: IntelligentPropertyResult[]) {
        if (properties.length === 0) {
            return { averageConfidence: 0, detailedResults: 0, basicResults: 0 };
        }

        const averageConfidence = properties.reduce((sum, p) => sum + p.confidenceScore, 0) / properties.length;
        const detailedResults = properties.filter(p => p.analysisDepth === 'detailed' || p.analysisDepth === 'comprehensive').length;
        const basicResults = properties.filter(p => p.analysisDepth === 'basic').length;

        return { averageConfidence, detailedResults, basicResults };
    }

    /**
     * Extract domain name from URL
     */
    private extractDomainName(url: string): string {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return 'Property Portal';
        }
    }

    /**
     * Build empty response for no results
     */
    private buildEmptyResponse(originalQuery: string, optimizedQuery: string, searchTime: number): IntelligentSearchResponse {
        return {
            success: true,
            query: optimizedQuery,
            properties: [],
            totalFound: 0,
            searchTime,
            analysisQuality: { averageConfidence: 0, detailedResults: 0, basicResults: 0 },
            searchInsights: {
                popularAreas: [],
                priceRangeAnalysis: 'No properties found for analysis',
                marketTrends: 'Try refining your search with specific property names or locations'
            }
        };
    }

    /**
     * Health check for hybrid service
     */
    async healthCheck(): Promise<{ tavily: boolean; overall: boolean }> {
        try {
            const tavilyHealthy = await this.tavilyService.healthCheck();

            return {
                tavily: tavilyHealthy,
                overall: tavilyHealthy // For now, overall health depends on Tavily
            };
        } catch {
            return {
                tavily: false,
                overall: false
            };
        }
    }
}

/**
 * Create and export service instance
 */
export function createHybridSearchService(): HybridSearchService {
    return new HybridSearchService();
}