# Service Architecture & Multi-Provider AI Search

## Overview

Propalyst uses a multi-provider AI search architecture that allows switching between Claude WebSearch and Google Gemini for property intelligence extraction.

---

## Multi-Provider AI Search Architecture

### Current Implementation
Direct AI search with multiple provider options (no intermediate URL discovery step)

### Search Provider Options

#### 1. Claude WebSearch (Default Provider)
**Purpose**: AI-powered web search using Claude's WebSearch tool

**Capabilities**:
- Performs 5-7 comprehensive web searches per property
- Searches multiple aspects: overview, amenities, location, reviews, pricing, lifestyle
- Extracts detailed narratives (3-4 sentence paragraphs)
- No domain blocking issues (unrestricted search)
- Prefilled response technique for JSON consistency

**Configuration**: Requires `ANTHROPIC_API_KEY`
**Cost**: $10 per 1,000 searches

**Best For**:
- Deep AI analysis with rich narratives
- Comprehensive data extraction
- When source URLs are not required

#### 2. Google Gemini with Search Grounding (Alternative Provider)
**Purpose**: Google Search integration via Gemini 2.5 Flash

**Capabilities**:
- Uses Google Search results with grounding metadata
- Provides source URLs and citations
- Different AI perspective than Claude
- Free tier available

**Configuration**: Requires `GOOGLE_AI_API_KEY`
**Cost**: Free tier, then pay-as-you-go

**Best For**:
- Source attribution requirements
- Google Search quality
- Cost-conscious deployments

### Provider Comparison

| Feature | Claude WebSearch | Gemini Google Search |
|---------|------------------|---------------------|
| Search Quality | AI-curated, comprehensive | Google Search results |
| Source URLs | No metadata | Grounding metadata with sources |
| Max Searches | 7 per request | Unlimited |
| JSON Format | Prefilled technique | Standard response |
| Cost | $10/1000 searches | Free tier available |
| Narrative Detail | 3-4 sentence paragraphs | Shorter descriptions |
| Best For | Deep AI analysis | Google-quality search results |

### Tavily API Integration (Currently Bypassed)
- **Status**: Code preserved but not used due to domain blocking
- **Purpose**: Was used for URL discovery before direct AI search
- **Note**: Available for future use if domain restrictions are lifted

---

## Core Services

### Property Storage Service
**File**: `lib/services/property-storage-service.ts`

**Responsibilities**:
- Dual storage management (filesystem + Supabase)
- Slug generation from property names
- Cache validation (24-hour TTL)
- Non-blocking sync to database

**Key Methods**:
- `storeProperty()` - Saves to both locations
- `syncToSupabase()` - Transforms and uploads to database
- `getCachedProperty()` - Retrieves from filesystem cache
- `propertyExists()` - Cache hit check

**Storage Strategy**: See [STORAGE.md](./STORAGE.md) for complete details

### SerpAPI Service
**File**: `lib/services/serpapi-service.ts`

**Responsibilities**:
- Fetch property images from Google Images
- Query construction with interior/exterior keywords
- Image filtering (8 photos, type:photo only)
- Thumbnail + original URL extraction

**Key Methods**:
- `fetchPropertyImages()` - Main image fetching function

**API Configuration**:
- Free tier: 100 searches/month
- Paid: $50/month for 5,000 searches
- Optional: Works without SERPAPI_KEY (skips images)

### Supabase Client Utility
**File**: `lib/utils/supabase-client.ts`

**Responsibilities**:
- Singleton client initialization
- Server-side environment variable access
- Connection testing

**Key Functions**:
- `getSupabaseClient()` - Get or create client instance
- `testSupabaseConnection()` - Verify database connectivity

**Security**:
- Server-side only (uses process.env)
- Never exposed to client/browser
- Graceful degradation if not configured

### Hybrid Search Service (Deprecated)
**File**: `lib/services/hybrid-search-service.ts`

**Status**: Not currently used (preserved for future)
**Original Purpose**: Orchestrate Tavily + Claude analysis

### Tavily Service (Deprecated)
**File**: `lib/services/tavily-service.ts`

**Status**: Not currently used due to domain blocking
**Original Purpose**: URL discovery from real estate portals

---

## API Routes

### Main Search Endpoint
**File**: `app/api/search/route.ts`

**Responsibilities**:
- Handle POST requests from client
- Check filesystem cache
- Route to appropriate AI provider
- Fetch property images via SerpAPI
- Store to filesystem + Supabase
- Stream responses to client

**Request Format**:
```typescript
{
  query: string,
  provider: 'claude' | 'gemini',
  skipCache: boolean
}
```

**Response Format** (Streaming NDJSON):
```typescript
{
  type: 'analysis',
  data: IntelligentPropertyResult
}
```

**Error Handling**:
- Non-blocking Supabase sync (logs errors, doesn't fail)
- Graceful image fetch failures (proceeds without images)
- Cache misses handled transparently

---

## Type Definitions

### File: `lib/types/property-intelligence.ts`

#### Main Interfaces:

**IntelligentPropertyResult**
- Core property data structure
- Contains specifications, location, community, market, narratives
- Optional arrays: propertyImages, sourceCitations
- Confidence scoring (0-100)

**PropertyImage**
- thumbnail: string (carousel display)
- original: string (lightbox full-size)
- title: string
- source: string
- link: string

**SourceCitation**
- uri: string
- title: string
- segment?: string (optional)

**PropertySpecifications**
- propertyType, configurations, areaRange, priceRange
- totalUnits, totalFloors, amenitiesCount

**LocationIntelligence**
- neighborhood, area, city
- nearbyAmenities, educationalInstitutions, healthcareFacilities
- workProximity (with proximity score 1-10)

**CommunityFeatures**
- 6 categories: family, recreational, clubhouse, sports, children's, security
- Each category as string array

**MarketIntelligence**
- developerName, completionYear, projectStatus
- propertyCategory (Luxury, Premium, Mid-range)
- targetDemographic, investmentPotential

**PropertyNarratives**
- 9 rich narrative sections (3-4 sentences each)
- projectOverview, neighborhoodDescription, propertyPositioning
- connectivityAnalysis, familyAppeal, expatriatePopulation
- entertainmentLifestyle, onlinePresenceBuzz, celebrityResidents

---

## UI Components

### Search Form & Streaming Handler
**File**: `components/home/real-estate-search.tsx`

**Responsibilities**:
- Provider selection toggle (Claude/Gemini)
- Search query input
- Streaming response handler
- Progress indicators
- Error display

**Key Features**:
- Provider preference saved to localStorage
- Real-time streaming updates
- Refresh button integration
- Loading states

### Unified Property Card
**File**: `components/home/unified-property-card.tsx` (960+ lines)

**Responsibilities**:
- Comprehensive property display
- Image carousel (Embla Carousel)
- Full-screen lightbox
- Amenities tabs (6 categories)
- Narratives accordion (9 sections)
- Source citations dialog (Gemini only)
- Refresh functionality

**shadcn/ui Components Used**:
- Card, CardHeader, CardTitle, CardContent
- Carousel, CarouselContent, CarouselItem
- Tabs, TabsList, TabsTrigger, TabsContent
- Accordion, AccordionItem, AccordionTrigger
- Badge, Button, Dialog
- Separator

### Source Citations Dialog
**File**: `components/home/sources-dialog.tsx`

**Responsibilities**:
- Display Gemini grounding metadata
- Clickable source cards (open in new tab)
- Source attribution compliance

**Only shown for**: Gemini provider (Claude doesn't provide sources)

---

## Component Organization

```
components/
├── ui/               # shadcn/ui base components
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   ├── tabs.tsx
│   ├── carousel.tsx
│   ├── dialog.tsx
│   └── ...
├── home/             # Home page components
│   ├── real-estate-search.tsx
│   ├── unified-property-card.tsx
│   └── sources-dialog.tsx
├── auth/             # Authentication components
│   ├── login-form.tsx
│   └── login-image.tsx
└── common/           # Shared components
    ├── navigation.tsx
    └── layouts.tsx
```

---

## Data Storage

```
data/
└── properties/       # JSON cache directory
    ├── embassy-lake-terraces.json
    ├── brigade-gateway.json
    └── ...
```

**Supabase Database**:
- Table: `society`
- JSONB columns for nested data
- Indexed for efficient querying
- See [STORAGE.md](./STORAGE.md) for schema details

---

## Project Structure

```
Rb-next-app-v3/
├── app/
│   ├── api/
│   │   └── search/
│   │       └── route.ts        # Main API endpoint
│   └── page.tsx                # Home page
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── home/                   # Search & display components
│   ├── auth/                   # Authentication
│   └── common/                 # Shared components
├── lib/
│   ├── services/               # Business logic services
│   │   ├── property-storage-service.ts
│   │   ├── serpapi-service.ts
│   │   ├── hybrid-search-service.ts (deprecated)
│   │   └── tavily-service.ts (deprecated)
│   ├── utils/                  # Utility functions
│   │   └── supabase-client.ts
│   └── types/                  # TypeScript interfaces
│       └── property-intelligence.ts
├── data/
│   └── properties/             # Filesystem cache
├── docs/                       # Detailed documentation
│   ├── DATA-FLOW.md
│   ├── ARCHITECTURE.md (this file)
│   ├── STORAGE.md
│   └── NEXT-JS-CONCEPTS.md
└── CLAUDE.md                   # Quick reference guide
```

---

## Related Documentation

- [DATA-FLOW.md](./DATA-FLOW.md) - Complete end-to-end data flow (6 phases)
- [STORAGE.md](./STORAGE.md) - Dual storage architecture
- [NEXT-JS-CONCEPTS.md](./NEXT-JS-CONCEPTS.md) - SSR concepts explained