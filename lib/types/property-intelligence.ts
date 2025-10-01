/**
 * Enhanced Property Intelligence Types
 * Designed to capture comprehensive real estate information using AI analysis
 */

export interface SourceCitation {
    uri: string;
    title: string;
    segment?: string; // Which part of content this citation supports
}

export interface PropertyImage {
    thumbnail: string;
    original: string;
    title: string;
    source: string;
    link: string;
}

export interface WorkProximityInfo {
    businessHubs: string[];
    techParks: string[];
    commercialAreas: string[];
    commuteAnalysis: string;
    proximityScore: number; // 1-10 rating
}

export interface LocationIntelligence {
    neighborhood: string;
    area: string;
    city: string;
    nearbyAmenities: string[];
    educationalInstitutions: string[];
    healthcareFacilities: string[];
    shoppingCenters: string[];
    workProximity: WorkProximityInfo;
    transportationAccess: string[];
}

export interface CommunityFeatures {
    familyAmenities: string[];
    recreationalFacilities: string[];
    clubhouseFeatures: string[];
    sportsAndFitness: string[];
    childrensFacilities: string[];
    securityFeatures: string[];
}

export interface MarketIntelligence {
    developerName: string;
    completionYear: string;
    projectStatus: string; // Completed, Under Construction, Planned
    propertyCategory: string; // Luxury, Premium, Mid-range
    targetDemographic: string[];
    investmentPotential: string;
    onlinePresence: string;
    communityBuzz: string;
    notableResidents?: string;
}

export interface PropertyNarratives {
    projectOverview: string;           // Opening narrative paragraph with key highlights
    neighborhoodDescription: string;    // Detailed location narrative with specific landmarks
    propertyPositioning: string;        // Luxury category analysis and architectural positioning
    connectivityAnalysis: string;       // Business hubs, tech parks, commute analysis
    familyAppeal: string;              // "Why Families Love It" - lifestyle narrative
    expatriatePopulation: string;      // Target demographic and expat appeal
    entertainmentLifestyle: string;    // Nearby attractions with actual names
    onlinePresenceBuzz: string;        // Social proof, reviews, community feedback
    celebrityResidents: string;        // Notable residents and prestige indicators
}

export interface PropertySpecifications {
    propertyType: string; // Apartment, Villa, Plot, etc.
    configurations: string[]; // 2BHK, 3BHK, etc.
    areaRange: string;
    priceRange: string;
    totalUnits?: string;
    totalFloors?: string;
    amenitiesCount?: number;
}

export interface IntelligentPropertyResult {
    // Unique identifier
    id: string;

    // Basic Information
    title: string;
    description: string;

    // Property Specifications
    specifications: PropertySpecifications;

    // Location Intelligence
    location: LocationIntelligence;

    // Community & Lifestyle
    community: CommunityFeatures;

    // Market Analysis
    market: MarketIntelligence;

    // Narrative Content (Rich Descriptions for 9 Sections)
    narratives: PropertyNarratives;

    // AI Analysis Quality
    confidenceScore: number; // 0-100
    analysisDepth: 'basic' | 'detailed' | 'comprehensive';

    // Source Information
    sourceUrl: string;
    sourceName: string;
    lastAnalyzed: string;

    // Search Relevance
    searchScore: number;

    // Individual Source Analyses (for expandable view)
    sourceAnalyses?: IntelligentPropertyResult[];

    // Source Citations (from Gemini grounding metadata)
    sourceCitations?: SourceCitation[];

    // Property Images (from SerpAPI Google Images)
    propertyImages?: PropertyImage[];
}

export interface PropertySearchOptions {
    maxResults?: number;
    analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
    includeMarketAnalysis?: boolean;
    includeCommunityFeatures?: boolean;
    includeLocationIntelligence?: boolean;
    priceRange?: {
        min?: number;
        max?: number;
    };
    propertyTypes?: string[];
    cities?: string[];
}

export interface IntelligentSearchResponse {
    success: boolean;
    query: string;
    properties: IntelligentPropertyResult[];
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
    error?: string;
}

// Web search result structure for processing
export interface WebSearchResult {
    title: string;
    url: string;
    content: string;
    snippet: string;
}

// AI analysis prompt templates
export interface AnalysisPrompts {
    propertyOverview: string;
    locationAnalysis: string;
    marketIntelligence: string;
    communityFeatures: string;
    investmentAnalysis: string;
}