// Type definitions for the intelligent real estate search application

// Re-export the new intelligent property types
export * from './property-intelligence';

// Legacy type aliases for backward compatibility (will be removed)
export type PropertySearchResult = IntelligentPropertyResult;
export type SearchApiResponse = IntelligentSearchResponse;

import { IntelligentPropertyResult, IntelligentSearchResponse } from './property-intelligence';

export interface SearchFilters {
    minPrice?: number;
    maxPrice?: number;
    location?: string;
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
}

export interface SearchOptions extends SearchFilters {
    maxResults?: number;
    includeImages?: boolean;
    country?: string;
}