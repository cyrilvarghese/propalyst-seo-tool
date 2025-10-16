/**
 * Area Intelligence Types
 * Based on the 13 Q&A structure for comprehensive area profiling
 */

// ============================================================================
// Vibe & Lifestyle (Q1, Q2)
// ============================================================================

export interface VibeAndLifestyle {
    uniqueVibe: string; // Description of the local vibe
    bestSuitedFor: ('families' | 'young_professionals' | 'retirees' | 'students')[]; // Target demographics
    localParks: string[]; // Names of nearby parks
    shoppingCenters: string[]; // Shopping malls and centers
    leisureSpots: string[]; // Entertainment and leisure venues
    diningAndSocial: string[]; // Popular restaurants, cafes, social hubs
}

// ============================================================================
// Market Data & Investment Analysis (Q3, Q4, Q5)
// ============================================================================

export interface CommuteTime {
    destination: string; // e.g., "Whitefield", "Airport"
    minMinutes: number;
    maxMinutes: number;
}

export interface MarketData {
    avgPricePerSqft: number; // Average price per sq. ft.
    priceCurrency: string; // "INR"
    appreciationRate: number; // Annual appreciation percentage
    rentalYieldMin: number; // Minimum rental yield percentage
    rentalYieldMax: number; // Maximum rental yield percentage
    rental2bhkMin: number; // Rental range for 2BHK
    rental2bhkMax: number;
    rental3bhkMin?: number; // Rental range for 3BHK
    rental3bhkMax?: number;
    investmentRating: 'rental_income' | 'capital_appreciation' | 'balanced'; // Investment focus
    stampDutyPercentage: number; // Stamp duty and registration percentage
    registrationCostsNote: string; // Additional notes on registration costs
}

// ============================================================================
// Infrastructure & Commute (Q6, Q7, Q8)
// ============================================================================

export interface MetroConnectivity {
    line: string; // e.g., "Pink Line"
    status: 'operational' | 'under_construction' | 'planned';
    nearestStation: string;
    estimatedCompletion?: string; // For under_construction status
}

export interface Infrastructure {
    waterSupplyReliability: 'excellent' | 'good' | 'mixed' | 'poor';
    sewageInfrastructure: string; // Description
    bwssbAccess: boolean; // BWSSB water connection available
    borewellsCommon: boolean; // Borewells commonly used
    commuteTimes: CommuteTime[]; // Array of commute times to major hubs
    upcomingProjects: string[]; // Infrastructure projects in progress
    metroConnectivity?: MetroConnectivity; // Metro access details
}

// ============================================================================
// Local Amenities & Community (Q9, Q10)
// ============================================================================

export interface Hospital {
    name: string;
    distanceKm?: number;
    specialty?: string; // e.g., "Multi-specialty", "Cardiac care"
}

export interface School {
    name: string;
    type: 'international' | 'cbse' | 'icse' | 'state_board';
    distanceKm?: number;
}

export interface LocalAmenities {
    topHospitals: Hospital[];
    topSchools: School[];
    premiumCommunities: string[]; // Top gated communities/projects
    shoppingMalls: string[];
    entertainmentVenues: string[];
}

// ============================================================================
// Buyer Strategy & Tips (Q11, Q12, Q13)
// ============================================================================

export interface BuyerIntelligence {
    hiddenCostsPercentage: number; // Total hidden costs (9-12%)
    hiddenCostsBreakdown: string[]; // List of hidden cost items
    rtmVsUcRecommendation: string; // Ready-to-move vs Under-construction advice
    insiderTips: string[]; // Practical insider tips
    commonMistakes: string[]; // Common buyer mistakes to avoid
    bestForProfile: 'end_user' | 'investor' | 'family' | 'bachelor' | 'any';
}

// ============================================================================
// Narratives (Rich text content for display)
// ============================================================================

export interface AreaNarratives {
    vibeNarrative: string; // 2-3 paragraph description of vibe & lifestyle
    marketNarrative: string; // 2-3 paragraph description of market dynamics
    connectivityNarrative: string; // 2-3 paragraph description of connectivity
    amenitiesNarrative: string; // 2-3 paragraph description of amenities
    investmentNarrative: string; // 2-3 paragraph description of investment potential
}

// ============================================================================
// Main Area Intelligence Result
// ============================================================================

export interface AreaIntelligenceResult {
    // Database fields
    id: string; // UUID
    area: string; // Area name (e.g., "Manyata Tech Park")
    cityId: string; // UUID foreign key to cities table
    cityName: string; // City name (from JOIN)
    citySection: string; // North, South, East, West, Central
    createdAt: string; // ISO timestamp

    // Enhanced data
    description?: string; // Short 1-2 line summary
    overview?: string; // Longer overview paragraph
    slug?: string; // URL-friendly identifier
    featuredImageUrl?: string; // Hero image URL
    propertyCount: number; // Number of societies in this area

    // JSONB data fields
    vibeAndLifestyle?: VibeAndLifestyle;
    marketData?: MarketData;
    infrastructure?: Infrastructure;
    localAmenities?: LocalAmenities;
    buyerIntelligence?: BuyerIntelligence;
    narratives?: AreaNarratives;

    // Images (array of Supabase Storage URLs)
    areaImages?: string[]; // Public URLs from area_images bucket

    // Blog content
    blogContent?: BlogContent;

    // AI metadata
    confidenceScore?: number; // 0-100
    lastAnalyzed?: string; // ISO timestamp
    dataSource?: 'claude_websearch' | 'gemini_search';
    searchQueriesUsed?: string[];
}

// ============================================================================
// Blog Content Types
// ============================================================================

export interface BlogImage {
    url: string;
    thumbnail: string;
    title: string;
    source: string;
}

export interface BlogSection {
    id: string;
    heading: string;
    content: string; // Markdown content
    imageSearchQuery: string; // AI-generated search query for SerpAPI
    images: BlogImage[];
    imageCaption: string;
}

export interface BlogContent {
    title: string;
    metaDescription: string;
    publishedDate: string;
    readingTimeMinutes: number;
    sections: BlogSection[];
    tags: string[];
    generatedAt: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface AreaSearchResponse {
    success: boolean;
    area?: AreaIntelligenceResult;
    error?: string;
    fromCache?: boolean;
}

export interface AreaListResponse {
    success: boolean;
    areas: AreaIntelligenceResult[];
    count: number;
    error?: string;
}

// ============================================================================
// Search Options
// ============================================================================

export interface AreaSearchOptions {
    areaName: string;
    cityName: string;
    provider?: 'claude' | 'gemini';
    skipCache?: boolean;
}

// ============================================================================
// Bulk Enrichment Types
// ============================================================================

export interface AreaToEnrich {
    area: string;
    city: string;
}

export interface BulkEnrichmentProgress {
    type: 'processing' | 'completed' | 'failed' | 'cooldown' | 'complete';
    area?: string;
    current?: number;
    total?: number;
    areaData?: AreaIntelligenceResult;
    error?: string;
    requestId?: string; // For cooldown resume
    cooldownSeconds?: number;
    itemsProcessed?: number;
    summary?: {
        succeeded: number;
        failed: number;
        skipped: number;
    };
}
