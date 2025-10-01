/**
 * Tavily Web Search Service
 * Domain-focused search for Indian real estate properties
 */

import { WebSearchResult } from '@/lib/types/property-intelligence';

interface TavilySearchResponse {
    results: TavilyResult[];
    query: string;
    follow_up_questions?: string[];
}

interface TavilyResult {
    title: string;
    url: string;
    content: string;
    score: number;
    published_date?: string;
}

export class TavilyService {
    private apiKey: string;
    private baseUrl = 'https://api.tavily.com';

    // Primary Indian real estate domains
    private readonly REAL_ESTATE_DOMAINS = [
        '99acres.com',
        'magicbricks.com',
        'housing.com',
        'nobroker.in',
        'commonfloor.com',
        'squareyards.com',
        'proptiger.com',
        'makaan.com'
    ];

    // Developer official sites (when available)
    private readonly DEVELOPER_DOMAINS = [
        'sobha.com',
        'brigade.co.in',
        'prestigeconstructions.com',
        'godrejproperties.com',
        'embassygroup.co.in'
    ];

    constructor() {
        this.apiKey = process.env.TAVILY_API_KEY || '';
        if (!this.apiKey) {
            throw new Error('TAVILY_API_KEY environment variable is required');
        }
    }

    /**
     * Search for properties with domain focus
     */
    async searchProperties(query: string, options: {
        maxResults?: number;
        includeDeveloperSites?: boolean;
        focusDomains?: string[];
    } = {}): Promise<WebSearchResult[]> {
        const { maxResults = 10, includeDeveloperSites = true, focusDomains } = options;

        try {
            console.log(`[Tavily] 🔍 Searching for: "${query}"`);

            // Determine target domains
            const targetDomains = focusDomains || [
                ...this.REAL_ESTATE_DOMAINS,
                ...(includeDeveloperSites ? this.DEVELOPER_DOMAINS : [])
            ];

            console.log(`[Tavily] 🎯 Targeting ${targetDomains.length} domains`);

            // Perform domain-focused search
            const results = await this.performDomainSearch(query, targetDomains, maxResults);

            console.log(`[Tavily] ✅ Found ${results.length} results`);
            return results;

        } catch (error) {
            console.error('[Tavily] ❌ Search error:', error);
            throw error;
        }
    }

    /**
     * Perform search with domain restrictions
     */
    private async performDomainSearch(
        query: string,
        domains: string[],
        maxResults: number
    ): Promise<WebSearchResult[]> {
        // Create domain-specific queries
        const domainQueries = domains.slice(0, 5).map(domain => `site:${domain} ${query}`);
        const generalQuery = `${query} real estate property India`;

        // Combine queries with OR operator
        const combinedQuery = [...domainQueries, generalQuery].join(' OR ');

        console.log(`[Tavily] 📝 Combined query: ${combinedQuery.substring(0, 100)}...`);

        const requestBody = {
            api_key: this.apiKey,
            query: combinedQuery,
            search_depth: "advanced",
            include_domains: domains,
            max_results: maxResults,
            include_answer: false,
            include_raw_content: true
        };

        const response = await fetch(`${this.baseUrl}/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Tavily API error ${response.status}: ${errorText}`);
        }

        const data: TavilySearchResponse = await response.json();

        console.log(`[Tavily] 📊 Raw results: ${data.results.length}`);

        // Convert to WebSearchResult format
        const webResults: WebSearchResult[] = data.results.map(result => ({
            title: result.title,
            url: result.url,
            content: result.content || '',
            snippet: this.extractSnippet(result.content || result.title, 200)
        }));

        // Filter and prioritize real estate results
        const filteredResults = this.filterRealEstateResults(webResults);

        console.log(`[Tavily] ✨ Filtered to ${filteredResults.length} real estate results`);

        return filteredResults.slice(0, maxResults);
    }

    /**
     * Filter results to ensure they're real estate related
     */
    private filterRealEstateResults(results: WebSearchResult[]): WebSearchResult[] {
        const realEstateKeywords = [
            'apartment', 'flat', 'villa', 'house', 'property', 'residential',
            'bhk', 'sqft', 'crore', 'lakh', 'builder', 'developer', 'project',
            'amenities', 'possession', 'ready', 'under construction'
        ];

        return results.filter(result => {
            const text = `${result.title} ${result.content}`.toLowerCase();

            // Must have at least 2 real estate keywords
            const keywordMatches = realEstateKeywords.filter(keyword =>
                text.includes(keyword)
            ).length;

            // Priority for known real estate domains
            const isDomainRelevant = this.REAL_ESTATE_DOMAINS.some(domain =>
                result.url.includes(domain)
            );

            return keywordMatches >= 2 || isDomainRelevant;
        });
    }

    /**
     * Extract snippet from content
     */
    private extractSnippet(content: string, maxLength: number = 200): string {
        if (!content) return '';

        // Clean content
        const cleaned = content
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s.,!?-₹]/g, ' ')
            .trim();

        if (cleaned.length <= maxLength) {
            return cleaned;
        }

        // Find last complete sentence within limit
        const truncated = cleaned.substring(0, maxLength);
        const lastSentence = truncated.lastIndexOf('.');

        if (lastSentence > maxLength * 0.7) {
            return truncated.substring(0, lastSentence + 1);
        }

        return truncated + '...';
    }

    /**
     * Health check for Tavily service
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    api_key: this.apiKey,
                    query: 'test',
                    max_results: 1
                })
            });

            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Get domain-specific search recommendations
     */
    getDomainSearchStrategy(query: string): {
        primaryDomains: string[];
        searchQueries: string[];
        expectedResults: number;
    } {
        const queryLower = query.toLowerCase();

        // Identify if it's a specific developer query
        const isDeveloperQuery = this.DEVELOPER_DOMAINS.some(domain =>
            queryLower.includes(domain.split('.')[0])
        );

        const primaryDomains = isDeveloperQuery
            ? [...this.DEVELOPER_DOMAINS, ...this.REAL_ESTATE_DOMAINS.slice(0, 3)]
            : [...this.REAL_ESTATE_DOMAINS.slice(0, 5)];

        const searchQueries = primaryDomains.slice(0, 3).map(domain =>
            `site:${domain} ${query}`
        );

        return {
            primaryDomains,
            searchQueries,
            expectedResults: Math.min(primaryDomains.length * 2, 15)
        };
    }
}

/**
 * Create and export service instance
 */
export function createTavilyService(): TavilyService {
    return new TavilyService();
}

/**
 * Singleton instance
 */
let tavilyServiceInstance: TavilyService | null = null;

export function getTavilyService(): TavilyService {
    if (!tavilyServiceInstance) {
        tavilyServiceInstance = createTavilyService();
    }
    return tavilyServiceInstance;
}