/**
 * Property Intelligence Analysis Utilities
 * Helper functions for processing and analyzing property data
 */

import {
    IntelligentPropertyResult,
    WebSearchResult,
    PropertySpecifications,
    LocationIntelligence,
    CommunityFeatures,
    MarketIntelligence
} from '@/lib/types/property-intelligence';

/**
 * Analysis prompt templates for different types of property analysis
 */
export const AnalysisPrompts = {
    /**
     * Comprehensive property analysis with rich narratives
     */
    fullAnalysis: (title: string, content: string, url: string) => `
    You are a real estate expert analyzing property information. Extract detailed information AND create rich narrative descriptions.

    Property Title: ${title}
    Source URL: ${url}
    Content: ${content.substring(0, 6000)}

    Analyze this content and return ONLY a valid JSON object with this structure:

    {
        "specifications": {
            "propertyType": "Type like Apartment, Villa, Plot, etc.",
            "configurations": ["2BHK", "3BHK", "4BHK etc."],
            "areaRange": "Area range like 1200-1800 sqft",
            "priceRange": "Price range like ₹80L-₹1.2Cr",
            "totalUnits": "Total units if mentioned",
            "totalFloors": "Number of floors",
            "amenitiesCount": 25
        },
        "location": {
            "neighborhood": "Specific neighborhood name",
            "area": "Area/locality name",
            "city": "City name",
            "nearbyAmenities": ["hospitals", "malls", "restaurants"],
            "educationalInstitutions": ["schools", "colleges nearby"],
            "healthcareFacilities": ["hospitals", "clinics nearby"],
            "workProximity": {
                "businessHubs": ["Whitefield", "Electronic City"],
                "techParks": ["specific tech parks nearby"],
                "commercialAreas": ["commercial areas"],
                "commuteAnalysis": "Commute analysis summary",
                "proximityScore": 8
            },
            "transportationAccess": ["metro", "bus", "airport connectivity"]
        },
        "community": {
            "familyAmenities": ["clubhouse", "swimming pool", "kids play area"],
            "recreationalFacilities": ["gym", "sports court", "jogging track"],
            "clubhouseFeatures": ["multipurpose hall", "library", "cafe"],
            "sportsAndFitness": ["gym", "tennis court", "badminton"],
            "childrensFacilities": ["playground", "day care", "kids pool"],
            "securityFeatures": ["24/7 security", "CCTV", "gated community"]
        },
        "market": {
            "developerName": "Developer name",
            "completionYear": "Year of completion",
            "projectStatus": "Completed/Under Construction/Planned",
            "propertyCategory": "Luxury/Premium/Mid-range",
            "targetDemographic": ["families", "professionals", "NRIs"],
            "investmentPotential": "Investment analysis summary",
            "onlinePresence": "Online buzz/reviews summary",
            "communityBuzz": "Community feedback summary"
        },
        "narratives": {
            "projectOverview": "Write a compelling 3-4 sentence opening paragraph highlighting the developer, completion year, architecture (e.g., '37 floors'), number of units, BHK types, and key location appeal. Example: 'Sobha Indraprastha is one of Bangalore's most iconic residential towers, developed by Sobha Limited. Completed around 2022, this project is a landmark high-rise in Rajajinagar, blending luxury living with an unbeatable city-center location. With 37 floors and a premium selection of spacious 3 and 4 BHK apartments, it remains a sought-after address.'",

            "neighborhoodDescription": "Write a detailed 2-3 sentence paragraph about the specific neighborhood with actual landmark names. Include nearby areas like Rajajinagar, Malleshwaram, educational institutions (National Public School Rajajinagar, Cluny Convent), healthcare (Columbia Asia Hospital, Fortis), shopping areas, and traditional markets. Describe the cultural richness and community life.",

            "propertyPositioning": "Write 2-3 sentences about how this property positions itself in the luxury residential category. Mention architectural features (high-rise construction, curated clubhouse, sky lounge, landscaped spaces), and why it's considered a luxury offering.",

            "connectivityAnalysis": "Write a detailed 2-3 sentence paragraph about work proximity and connectivity. Name specific business hubs (Majestic, MG Road, Cunningham Road), tech parks (Manyata Tech Park, UB City), and commute analysis. Explain metro/road connectivity and convenience for working professionals.",

            "familyAppeal": "Write 2-3 sentences about why families are drawn to this property. Mention spacious layouts, panoramic views, community atmosphere, specific amenities (clubhouse, swimming pools, children's play zones, fitness amenities), and nearby schools.",

            "expatriatePopulation": "Write 2 sentences about the expat appeal and target demographic. Mention if it attracts established families, senior corporate professionals, NRIs, or international community due to proximity to business districts and international schools.",

            "entertainmentLifestyle": "Write 2 sentences about nearby entertainment and lifestyle options. Name specific places like Orion Mall, World Trade Center, Sheraton Grand, Bangalore Turf Club, Palace Grounds, Nandi Hills, Malleshwaram for cultural experiences.",

            "onlinePresenceBuzz": "Write 2 sentences about the property's online reputation. Mention if property blogs and forums highlight it as 'one of the tallest residential towers', praise for city views and specifications, early resident experiences, build quality, and maintenance.",

            "celebrityResidents": "Write 1-2 sentences about notable residents or prestige factors. Mention if it's preferred by business leaders, HNIs, reputed families, or if it's considered a 'trophy address'. If no specific info, describe the premium positioning that attracts such residents."
        },
        "confidenceScore": 85
    }

    Important:
    - Return ONLY the JSON object, no additional text or formatting
    - Write narrative paragraphs based on actual content found
    - Use specific names and details from the content
    - If information is missing, write brief generic statements
    - Make narratives engaging and descriptive, not just bullet points
    `,

    /**
     * Basic property analysis for quick results
     */
    basicAnalysis: (title: string, content: string) => `
    Extract basic property information from this content:

    Title: ${title}
    Content: ${content.substring(0, 2000)}

    Return ONLY a JSON object:

    {
        "specifications": {
            "propertyType": "property type",
            "configurations": ["configurations available"],
            "priceRange": "price range"
        },
        "location": {
            "neighborhood": "area name",
            "area": "locality",
            "city": "city"
        },
        "market": {
            "developerName": "developer",
            "completionYear": "year"
        },
        "confidenceScore": 70
    }
    `,

    /**
     * Market intelligence focused analysis
     */
    marketAnalysis: (title: string, content: string) => `
    Analyze market intelligence for this property:

    Title: ${title}
    Content: ${content.substring(0, 3000)}

    Focus on investment potential, developer reputation, market positioning, and target audience.

    Return JSON with market intelligence:

    {
        "market": {
            "developerName": "developer name and reputation",
            "propertyCategory": "market positioning",
            "targetDemographic": ["target audience"],
            "investmentPotential": "investment analysis",
            "onlinePresence": "online reviews and presence"
        },
        "confidenceScore": 80
    }
    `
};

/**
 * Parse AI analysis response with error handling
 */
export function parseAIResponse(response: string): any {
    try {
        // Clean response - remove any markdown formatting
        let cleanResponse = response.trim();

        // Remove markdown code block markers if present
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/```\s*$/, '');
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/```\s*$/, '');

        // Find JSON object boundaries
        const startIndex = cleanResponse.indexOf('{');
        const lastIndex = cleanResponse.lastIndexOf('}');

        if (startIndex !== -1 && lastIndex !== -1) {
            cleanResponse = cleanResponse.substring(startIndex, lastIndex + 1);
        }

        return JSON.parse(cleanResponse);
    } catch (error) {
        console.error('Failed to parse AI response:', error);
        console.error('Raw response:', response);
        return null;
    }
}

/**
 * Validate parsed property data
 */
export function validatePropertyData(data: any): boolean {
    if (!data || typeof data !== 'object') return false;

    // Check required fields
    const hasBasicInfo = data.specifications && data.location;
    const hasConfidenceScore = typeof data.confidenceScore === 'number';

    return hasBasicInfo && hasConfidenceScore;
}

/**
 * Merge multiple analysis results for the same property
 */
export function mergePropertyAnalysis(analyses: any[]): any {
    if (analyses.length === 0) return null;
    if (analyses.length === 1) return analyses[0];

    // Start with the highest confidence analysis
    const primary = analyses.sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0))[0];

    // Merge additional details from other analyses
    const merged = { ...primary };

    analyses.forEach(analysis => {
        if (analysis.location?.nearbyAmenities?.length > 0) {
            merged.location.nearbyAmenities = [
                ...new Set([
                    ...(merged.location.nearbyAmenities || []),
                    ...analysis.location.nearbyAmenities
                ])
            ];
        }

        if (analysis.community?.familyAmenities?.length > 0) {
            merged.community.familyAmenities = [
                ...new Set([
                    ...(merged.community?.familyAmenities || []),
                    ...analysis.community.familyAmenities
                ])
            ];
        }
    });

    return merged;
}

/**
 * Calculate property relevance score based on query
 */
export function calculateRelevanceScore(property: IntelligentPropertyResult, query: string): number {
    let score = 0;
    const queryLower = query.toLowerCase();

    // Title relevance (40 points max)
    if (property.title.toLowerCase().includes(queryLower)) {
        score += 40;
    } else {
        // Partial matches
        const queryWords = queryLower.split(' ');
        const titleWords = property.title.toLowerCase().split(' ');
        const matches = queryWords.filter(word => titleWords.some(titleWord => titleWord.includes(word)));
        score += (matches.length / queryWords.length) * 40;
    }

    // Location relevance (20 points max)
    const locationText = `${property.location.area} ${property.location.neighborhood} ${property.location.city}`.toLowerCase();
    if (locationText.includes(queryLower)) {
        score += 20;
    }

    // Developer relevance (15 points max)
    if (property.market.developerName?.toLowerCase().includes(queryLower)) {
        score += 15;
    }

    // Property type relevance (10 points max)
    if (property.specifications.propertyType?.toLowerCase().includes(queryLower)) {
        score += 10;
    }

    // Data completeness bonus (15 points max)
    let completenessScore = 0;
    if (property.specifications.priceRange) completenessScore += 3;
    if (property.location.nearbyAmenities?.length > 0) completenessScore += 3;
    if (property.community.familyAmenities?.length > 0) completenessScore += 3;
    if (property.market.investmentPotential) completenessScore += 3;
    if (property.location.workProximity?.businessHubs?.length > 0) completenessScore += 3;

    score += completenessScore;

    return Math.min(Math.round(score), 100);
}

/**
 * Extract key insights from property search results
 */
export function extractSearchInsights(properties: IntelligentPropertyResult[], query: string) {
    if (properties.length === 0) {
        return {
            popularAreas: [],
            priceRangeAnalysis: 'No properties found for analysis',
            marketTrends: 'Insufficient data for trend analysis'
        };
    }

    // Popular areas analysis
    const areaCount: { [key: string]: number } = {};
    properties.forEach(prop => {
        const area = prop.location.area || prop.location.neighborhood;
        if (area) {
            areaCount[area] = (areaCount[area] || 0) + 1;
        }
    });

    const popularAreas = Object.entries(areaCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([area]) => area);

    // Price range analysis
    const pricesWithRange = properties
        .filter(p => p.specifications.priceRange)
        .map(p => p.specifications.priceRange);

    const priceRangeAnalysis = pricesWithRange.length > 0
        ? `Found ${pricesWithRange.length} properties with pricing information. Price ranges vary from budget to premium segments.`
        : 'Limited pricing information available in search results';

    // Market trends analysis
    const developers = properties
        .filter(p => p.market.developerName)
        .map(p => p.market.developerName);

    const uniqueDevelopers = [...new Set(developers)];

    const marketTrends = `Analysis includes properties from ${uniqueDevelopers.length} developers. ` +
        `${properties.filter(p => p.market.propertyCategory === 'Luxury').length} luxury properties, ` +
        `${properties.filter(p => p.market.propertyCategory === 'Premium').length} premium properties found.`;

    return {
        popularAreas,
        priceRangeAnalysis,
        marketTrends
    };
}

/**
 * Clean and normalize property data
 */
export function normalizePropertyData(rawData: any): any {
    if (!rawData) return null;

    // Normalize arrays - ensure they're arrays and remove duplicates
    const normalizeArray = (arr: any[]): string[] => {
        if (!Array.isArray(arr)) return [];
        return [...new Set(arr.filter(item => typeof item === 'string' && item.trim()))];
    };

    return {
        specifications: {
            propertyType: rawData.specifications?.propertyType?.trim() || 'Property',
            configurations: normalizeArray(rawData.specifications?.configurations || []),
            areaRange: rawData.specifications?.areaRange?.trim() || '',
            priceRange: rawData.specifications?.priceRange?.trim() || '',
            totalUnits: rawData.specifications?.totalUnits != null ? Number(rawData.specifications.totalUnits) : null,
            totalFloors: rawData.specifications?.totalFloors != null ? Number(rawData.specifications.totalFloors) : null,
            amenitiesCount: Number(rawData.specifications?.amenitiesCount) || 0
        },
        location: {
            neighborhood: rawData.location?.neighborhood?.trim() || '',
            area: rawData.location?.area?.trim() || '',
            city: rawData.location?.city?.trim() || '',
            nearbyAmenities: normalizeArray(rawData.location?.nearbyAmenities || []),
            educationalInstitutions: normalizeArray(rawData.location?.educationalInstitutions || []),
            healthcareFacilities: normalizeArray(rawData.location?.healthcareFacilities || []),
            workProximity: {
                businessHubs: normalizeArray(rawData.location?.workProximity?.businessHubs || []),
                techParks: normalizeArray(rawData.location?.workProximity?.techParks || []),
                commercialAreas: normalizeArray(rawData.location?.workProximity?.commercialAreas || []),
                commuteAnalysis: rawData.location?.workProximity?.commuteAnalysis?.trim() || '',
                proximityScore: Math.min(Math.max(Number(rawData.location?.workProximity?.proximityScore) || 0, 0), 10)
            },
            transportationAccess: normalizeArray(rawData.location?.transportationAccess || [])
        },
        community: {
            familyAmenities: normalizeArray(rawData.community?.familyAmenities || []),
            recreationalFacilities: normalizeArray(rawData.community?.recreationalFacilities || []),
            clubhouseFeatures: normalizeArray(rawData.community?.clubhouseFeatures || []),
            sportsAndFitness: normalizeArray(rawData.community?.sportsAndFitness || []),
            childrensFacilities: normalizeArray(rawData.community?.childrensFacilities || []),
            securityFeatures: normalizeArray(rawData.community?.securityFeatures || [])
        },
        market: {
            developerName: rawData.market?.developerName?.trim() || '',
            completionYear: rawData.market?.completionYear ? String(rawData.market.completionYear).trim() : '',
            projectStatus: rawData.market?.projectStatus?.trim() || '',
            propertyCategory: rawData.market?.propertyCategory?.trim() || 'Mid-range',
            targetDemographic: normalizeArray(rawData.market?.targetDemographic || []),
            investmentPotential: rawData.market?.investmentPotential?.trim() || '',
            onlinePresence: rawData.market?.onlinePresence?.trim() || '',
            communityBuzz: rawData.market?.communityBuzz?.trim() || ''
        },
        narratives: {
            projectOverview: rawData.narratives?.projectOverview?.trim() || '',
            neighborhoodDescription: rawData.narratives?.neighborhoodDescription?.trim() || '',
            propertyPositioning: rawData.narratives?.propertyPositioning?.trim() || '',
            connectivityAnalysis: rawData.narratives?.connectivityAnalysis?.trim() || '',
            familyAppeal: rawData.narratives?.familyAppeal?.trim() || '',
            expatriatePopulation: rawData.narratives?.expatriatePopulation?.trim() || '',
            entertainmentLifestyle: rawData.narratives?.entertainmentLifestyle?.trim() || '',
            onlinePresenceBuzz: rawData.narratives?.onlinePresenceBuzz?.trim() || '',
            celebrityResidents: rawData.narratives?.celebrityResidents?.trim() || ''
        },
        confidenceScore: Math.min(Math.max(Number(rawData.confidenceScore) || 50, 0), 100)
    };
}