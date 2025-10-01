/**
 * Enhanced Query Optimization for Real Estate Search
 * Intelligent query analysis and optimization for better search results
 */

export interface QueryAnalysis {
    originalQuery: string;
    queryType: 'property-specific' | 'developer-focused' | 'location-based' | 'generic';
    optimizedQuery: string;
    searchVariations: string[];
    targetDomains: string[];
    confidence: number;
}

export class EnhancedQueryOptimizer {

    /**
     * Analyze and optimize query for comprehensive real estate search
     */
    static optimizeQuery(query: string): QueryAnalysis {
        const queryLower = query.toLowerCase().trim();

        const analysis: QueryAnalysis = {
            originalQuery: query,
            queryType: this.identifyQueryType(queryLower),
            optimizedQuery: '',
            searchVariations: [],
            targetDomains: [],
            confidence: 0
        };

        // Generate optimized query based on type
        switch (analysis.queryType) {
            case 'property-specific':
                return this.optimizePropertySpecificQuery(query, queryLower, analysis);
            case 'developer-focused':
                return this.optimizeDeveloperQuery(query, queryLower, analysis);
            case 'location-based':
                return this.optimizeLocationQuery(query, queryLower, analysis);
            default:
                return this.optimizeGenericQuery(query, queryLower, analysis);
        }
    }

    /**
     * Identify the type of query
     */
    private static identifyQueryType(query: string): QueryAnalysis['queryType'] {
        // Property-specific indicators
        const propertyIndicators = [
            'lake terraces', 'gateway', 'heights', 'gardens', 'residency', 'towers',
            'enclave', 'grand', 'royal', 'palace', 'county', 'park', 'square',
            'retreat', 'mansion', 'manor', 'vista', 'ridge', 'woods', 'greens',
            'springs', 'hills', 'valley', 'meadows', 'oaks', 'palms'
        ];

        // Developer indicators
        const developers = [
            'prestige', 'brigade', 'sobha', 'embassy', 'godrej', 'mahindra',
            'dlf', 'lodha', 'tata', 'larsen', 'hiranandani', 'oberoi',
            'shriram', 'mantri', 'purva', 'assetz', 'adarsh'
        ];

        // Location indicators
        const locationTerms = [
            'apartments in', 'flats in', 'properties in', 'houses in',
            'bangalore', 'mumbai', 'delhi', 'pune', 'hyderabad', 'chennai',
            'electronic city', 'whitefield', 'koramangala', 'indiranagar',
            'marathahalli', 'bellandur', 'sarjapur', 'hebbal'
        ];

        if (propertyIndicators.some(indicator => query.includes(indicator))) {
            return 'property-specific';
        }

        if (developers.some(dev => query.includes(dev))) {
            return 'developer-focused';
        }

        if (locationTerms.some(term => query.includes(term))) {
            return 'location-based';
        }

        return 'generic';
    }

    /**
     * Optimize for specific property searches like "Embassy Lake Terraces"
     */
    private static optimizePropertySpecificQuery(
        query: string,
        queryLower: string,
        analysis: QueryAnalysis
    ): QueryAnalysis {
        // Keep query simple - maximum 10 words total
        let optimizedQuery = query;

        // Only add minimal context if query is very short and missing location
        if (!this.hasLocationContext(queryLower) && query.split(' ').length <= 2) {
            optimizedQuery = `${query} Bangalore`;
        }

        // Ensure we don't exceed 10 words
        const words = optimizedQuery.split(' ');
        if (words.length > 10) {
            optimizedQuery = words.slice(0, 10).join(' ');
        }

        // Keep target domains for focused search results
        analysis.optimizedQuery = optimizedQuery;
        analysis.searchVariations = [optimizedQuery]; // Keep it simple
        analysis.targetDomains = this.getPropertySpecificDomains(); // Still use domain focus
        analysis.confidence = 0.9;

        return analysis;
    }

    /**
     * Optimize for developer-focused queries
     */
    private static optimizeDeveloperQuery(
        query: string,
        queryLower: string,
        analysis: QueryAnalysis
    ): QueryAnalysis {
        let optimizedQuery = query;

        // Add minimal context for developer queries
        if (!this.hasLocationContext(queryLower)) {
            optimizedQuery = `${query} properties Bangalore`;
        }

        // Ensure we don't exceed 10 words
        const words = optimizedQuery.split(' ');
        if (words.length > 10) {
            optimizedQuery = words.slice(0, 10).join(' ');
        }

        analysis.optimizedQuery = optimizedQuery;
        analysis.searchVariations = [optimizedQuery];
        analysis.targetDomains = this.getDeveloperFocusedDomains();
        analysis.confidence = 0.85;

        return analysis;
    }

    /**
     * Optimize for location-based queries
     */
    private static optimizeLocationQuery(
        query: string,
        queryLower: string,
        analysis: QueryAnalysis
    ): QueryAnalysis {
        // Keep location queries simple
        let optimizedQuery = query;

        // Ensure we don't exceed 10 words
        const words = optimizedQuery.split(' ');
        if (words.length > 10) {
            optimizedQuery = words.slice(0, 10).join(' ');
        }

        analysis.optimizedQuery = optimizedQuery;
        analysis.searchVariations = [optimizedQuery];
        analysis.targetDomains = this.getLocationFocusedDomains();
        analysis.confidence = 0.8;

        return analysis;
    }

    /**
     * Optimize generic queries
     */
    private static optimizeGenericQuery(
        query: string,
        queryLower: string,
        analysis: QueryAnalysis
    ): QueryAnalysis {
        let optimizedQuery = query;

        // Add minimal context for generic queries
        if (!this.hasLocationContext(queryLower)) {
            optimizedQuery = `${query} real estate Bangalore`;
        }

        // Ensure we don't exceed 10 words
        const words = optimizedQuery.split(' ');
        if (words.length > 10) {
            optimizedQuery = words.slice(0, 10).join(' ');
        }

        analysis.optimizedQuery = optimizedQuery;
        analysis.searchVariations = [optimizedQuery];
        analysis.targetDomains = this.getGenericDomains();
        analysis.confidence = 0.7;

        return analysis;
    }

    /**
     * Extract developer name from query
     */
    private static extractDeveloperName(query: string): string | null {
        const developers = [
            { key: 'embassy', name: 'Embassy' },
            { key: 'prestige', name: 'Prestige' },
            { key: 'brigade', name: 'Brigade' },
            { key: 'sobha', name: 'Sobha' },
            { key: 'godrej', name: 'Godrej' },
            { key: 'mahindra', name: 'Mahindra' },
            { key: 'dlf', name: 'DLF' },
            { key: 'lodha', name: 'Lodha' }
        ];

        const found = developers.find(dev => query.includes(dev.key));
        return found ? found.name : null;
    }

    /**
     * Check if query has location context
     */
    private static hasLocationContext(query: string): boolean {
        const locations = [
            'bangalore', 'bengaluru', 'mumbai', 'delhi', 'pune', 'hyderabad',
            'chennai', 'kolkata', 'ahmedabad', 'surat', 'india',
            'electronic city', 'whitefield', 'koramangala', 'indiranagar',
            'gurgaon', 'noida', 'andheri', 'bandra', 'thane', 'marathahalli',
            'bellandur', 'sarjapur', 'hebbal', 'jp nagar', 'btm layout'
        ];

        return locations.some(location => query.includes(location));
    }

    /**
     * Get domain priorities for different query types
     */
    private static getPropertySpecificDomains(): string[] {
        return [
            '99acres.com',
            'magicbricks.com',
            'housing.com',
            'nobroker.in',
            'commonfloor.com',
            'squareyards.com',
            'proptiger.com'
        ];
    }

    private static getDeveloperFocusedDomains(): string[] {
        return [
            'sobha.com',
            'brigade.co.in',
            'prestigeconstructions.com',
            'godrejproperties.com',
            'embassygroup.co.in',
            '99acres.com',
            'magicbricks.com'
        ];
    }

    private static getLocationFocusedDomains(): string[] {
        return [
            '99acres.com',
            'housing.com',
            'magicbricks.com',
            'nobroker.in',
            'commonfloor.com'
        ];
    }

    private static getGenericDomains(): string[] {
        return [
            '99acres.com',
            'magicbricks.com',
            'housing.com',
            'nobroker.in'
        ];
    }

    /**
     * Generate search insights for a query
     */
    static generateSearchInsights(query: string): {
        suggestedRefinements: string[];
        expectedResultTypes: string[];
        searchTips: string[];
    } {
        const analysis = this.optimizeQuery(query);

        const suggestedRefinements = [];
        const expectedResultTypes = [];
        const searchTips = [];

        // Generate refinement suggestions
        if (analysis.queryType === 'property-specific') {
            suggestedRefinements.push(`${query} 2BHK`, `${query} 3BHK`, `${query} price`);
            expectedResultTypes.push('Property details', 'Floor plans', 'Pricing information');
            searchTips.push('Try adding configuration (2BHK, 3BHK) for specific results');
        } else if (analysis.queryType === 'developer-focused') {
            suggestedRefinements.push(`${query} latest projects`, `${query} Bangalore`);
            expectedResultTypes.push('Developer projects', 'New launches', 'Company information');
            searchTips.push('Add location for area-specific projects');
        }

        return {
            suggestedRefinements: suggestedRefinements.slice(0, 3),
            expectedResultTypes: expectedResultTypes.slice(0, 3),
            searchTips: searchTips.slice(0, 2)
        };
    }
}