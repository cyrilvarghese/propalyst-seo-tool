# Service Architecture & AI Search

## Overview

Propalyst uses Google Gemini AI search architecture for both property intelligence and area intelligence extraction, with automatic web search grounding for data accuracy.

---

## AI Search Architecture

### Current Implementation
Google Gemini with search grounding for both properties and areas

### Google Gemini with Search Grounding
**Purpose**: Google Search integration via Gemini 2.0 Flash

**Capabilities**:
- Uses Google Search results with grounding metadata
- Provides source URLs and citations
- Extracts structured data from web sources
- Free tier available

**Configuration**: Requires `GOOGLE_AI_API_KEY`
**Cost**: Free tier, then pay-as-you-go

**Used For**:
1. **Property Intelligence** - Apartment complexes, gated communities
2. **Area Intelligence** - Neighborhoods, localities (13 Q&A format)

### Area Intelligence Feature
**NEW**: Comprehensive area profiling using AI research

**13-Question Research Format**:
1. **Vibe & Lifestyle** (Q1-Q2)
   - Unique local vibe and best demographic fit
   - Local parks, shopping centers, leisure spots

2. **Market Data & Investment** (Q3-Q5)
   - Average price per sq.ft and appreciation rate
   - Rental yield and rental ranges
   - Stamp duty and guidance value

3. **Infrastructure & Commute** (Q6-Q8)
   - Water supply and sewage reliability
   - Commute times to major hubs
   - Upcoming infrastructure projects

4. **Local Amenities** (Q9-Q10)
   - Top hospitals and schools
   - Premium gated communities

5. **Buyer Strategy & Tips** (Q11-Q13)
   - Hidden costs estimation
   - RTM vs UC recommendation
   - Common mistakes and insider tips

**Database Storage**: `local_areas` table with JSONB columns

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

### Area Intelligence Service
**File**: `lib/services/area-intelligence-service.ts`

**Responsibilities**:
- AI-powered area research using Google Gemini
- 13-question structured data extraction
- Confidence score calculation
- JSON parsing from AI response

**Key Methods**:
- `researchArea()` - Main research method
- `buildResearchPrompt()` - Constructs 13-question prompt
- `geminiSearch()` - Google Search with grounding
- `parseAIResponse()` - Extract JSON from response
- `calculateConfidence()` - Score based on completeness

**Data Extracted**:
- Vibe & Lifestyle, Market Data, Infrastructure
- Local Amenities, Buyer Intelligence, Narratives

### Area Helpers
**File**: `lib/utils/area-helpers.ts`

**Responsibilities**:
- Slug generation (area + city combination)
- CSV/JSON/TXT file parsing
- Data validation and deduplication

**Key Functions**:
- `generateAreaSlug()` - Creates unique slug from area+city
- `parseAreaFile()` - Universal file parser
- `validateAreaData()` - Pre-processing validation
- `deduplicateAreas()` - Remove duplicate entries

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

### Property Search Endpoint
**File**: `app/api/search/route.ts`

**Responsibilities**:
- Handle POST requests from client
- Check filesystem cache
- Use Google Gemini for AI analysis
- Fetch property images via SerpAPI
- Store to filesystem + Supabase
- Stream responses to client

**Request Format**:
```typescript
{
  query: string,
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

### Area Search Endpoints
**Files**: `app/api/areas/*`

#### 1. GET `/api/areas` - List All Areas
**File**: `app/api/areas/route.ts`

**Returns**: All areas with city names (JOIN with cities table)

#### 2. POST `/api/areas/search` - Single Area Search
**File**: `app/api/areas/search/route.ts`

**Request**:
```typescript
{
  areaName: string,
  cityName: string,
  skipCache: boolean
}
```

**Flow**:
1. Check cache (slug-based)
2. Auto-create city if doesn't exist
3. Run AI research (13 questions)
4. Upsert to `local_areas` table
5. Return enriched area data

**Key Features**:
- Auto city creation
- Upsert by `(city_id, area)` constraint
- Slug uniqueness guaranteed by constraint

#### 3. POST `/api/areas/bulk-enrich` - Bulk Upload
**File**: `app/api/areas/bulk-enrich/route.ts`

**Request**: FormData with file (CSV/JSON/TXT)

**Flow**:
1. Parse file (area-city pairs)
2. Validate and deduplicate
3. Process each area sequentially
4. Stream progress to client
5. Cooldown every 20 areas (30 seconds)

**Streaming Messages**:
- `start` - Begin processing
- `progress` - Current area status
- `completed` - Area enriched successfully
- `cooldown` - 30-second pause
- `error` - Failed area
- `complete` - All done (summary stats)

#### 4. GET `/api/areas/[id]` - Single Area Detail
**File**: `app/api/areas/[id]/route.ts`

**Returns**: Full area data by ID

---

## Type Definitions

### Property Types
**File**: `lib/types/property-intelligence.ts`

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

### Area Types
**File**: `lib/types/area-intelligence.ts`

#### Main Interfaces:

**AreaIntelligenceResult**
- Core area data structure
- Contains vibe, market, infrastructure, amenities, buyer intelligence, narratives
- Confidence scoring (0-100)

**VibeAndLifestyle**
- uniqueVibe, bestSuitedFor (families/young_professionals/retirees/students)
- localParks, shoppingCenters, leisureSpots, diningAndSocial

**MarketData**
- avgPricePerSqft, appreciationRate
- rentalYieldMin/Max, rental2bhk/3bhk ranges
- investmentRating (rental_income/capital_appreciation/balanced)
- stampDutyPercentage, registrationCostsNote

**Infrastructure**
- waterSupplyReliability, sewageInfrastructure
- commuteTimes (array of destinations with min/max minutes)
- upcomingProjects, metroConnectivity

**LocalAmenities**
- topHospitals (name, distanceKm, specialty)
- topSchools (name, type, distanceKm)
- premiumCommunities, shoppingMalls, entertainmentVenues

**BuyerIntelligence**
- hiddenCostsPercentage, hiddenCostsBreakdown
- rtmVsUcRecommendation
- insiderTips, commonMistakes
- bestForProfile (end_user/investor/family/bachelor/any)

**AreaNarratives**
- vibeNarrative, marketNarrative, connectivityNarrative
- amenitiesNarrative, investmentNarrative
- 2-3 paragraphs each

---

## UI Components

### Property Search Form
**File**: `components/home/real-estate-search.tsx`

**Responsibilities**:
- Property search query input
- Streaming response handler
- Progress indicators
- Error display

**Key Features**:
- Real-time streaming updates
- Refresh button integration
- Loading states

### Area Search Form
**File**: `components/home/area-search.tsx`

**Responsibilities**:
- Separate City and Area input fields
- Area search with AI research
- Auto-redirect to area detail page

**Key Features**:
- Two-input design (city + area)
- Success toast notifications
- Error handling

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

### Properties Table: `society`
- Stores property/apartment complex data
- JSONB columns for nested data
- Indexed for efficient querying
- See [STORAGE.md](./STORAGE.md) for schema details

### Areas Table: `local_areas`
- Stores neighborhood/locality intelligence
- Foreign key to `cities` table
- JSONB columns: vibe_and_lifestyle, market_data, infrastructure, local_amenities, buyer_intelligence, narratives
- Unique constraints: `slug`, `(city_id, area)`
- Auto-updated property_count via trigger

### Cities Table: `cities`
- Master list of cities
- Auto-created when searching new areas
- Referenced by `local_areas.city_id`

### Database Relationships
```
cities (1) ──< (many) local_areas (1) ──< (many) society
  id                    city_id              area (foreign key)
```

---

## Project Structure

```
Rb-next-app-v3/
├── app/
│   ├── api/
│   │   ├── search/
│   │   │   └── route.ts              # Property search
│   │   ├── bulk-search/
│   │   │   └── route.ts              # Bulk property search
│   │   ├── areas/
│   │   │   ├── route.ts              # List all areas
│   │   │   ├── search/
│   │   │   │   └── route.ts          # Single area search
│   │   │   ├── bulk-enrich/
│   │   │   │   └── route.ts          # Bulk area enrichment
│   │   │   └── [id]/
│   │   │       └── route.ts          # Get area by ID
│   │   └── properties/
│   │       └── [slug]/
│   │           └── route.ts          # Get property by slug
│   ├── areas/
│   │   ├── page.tsx                  # Areas list + bulk upload
│   │   └── [id]/
│   │       └── page.tsx              # Area detail page
│   ├── properties/
│   │   ├── page.tsx                  # Properties list + bulk upload
│   │   └── [slug]/
│   │       └── page.tsx              # Property detail page
│   └── page.tsx                      # Home page
├── components/
│   ├── ui/                           # shadcn/ui components
│   ├── home/                         # Search & display components
│   │   ├── real-estate-search.tsx    # Property search form
│   │   ├── area-search.tsx           # Area search form
│   │   ├── unified-property-card.tsx # Property display
│   │   └── sources-dialog.tsx        # Source citations
│   ├── auth/                         # Authentication
│   └── common/                       # Shared components
├── lib/
│   ├── services/                     # Business logic services
│   │   ├── property-storage-service.ts
│   │   ├── area-intelligence-service.ts  # NEW
│   │   ├── serpapi-service.ts
│   │   ├── hybrid-search-service.ts (deprecated)
│   │   └── tavily-service.ts (deprecated)
│   ├── utils/                        # Utility functions
│   │   ├── supabase-client.ts
│   │   ├── area-helpers.ts           # NEW
│   │   └── cooldown-manager.ts       # NEW
│   └── types/                        # TypeScript interfaces
│       ├── property-intelligence.ts
│       └── area-intelligence.ts      # NEW
├── migrations/
│   └── 001_enhance_local_areas.sql   # Area table migration
├── scripts/
│   └── enrich-existing-areas.ts      # Bulk migration script
├── data/
│   └── properties/                   # Filesystem cache
├── docs/                             # Detailed documentation
│   ├── DATA-FLOW.md
│   ├── ARCHITECTURE.md (this file)
│   ├── STORAGE.md
│   └── NEXT-JS-CONCEPTS.md
└── CLAUDE.md                         # Quick reference guide
```

---

## Related Documentation

- [DATA-FLOW.md](./DATA-FLOW.md) - Complete end-to-end data flow (6 phases)
- [STORAGE.md](./STORAGE.md) - Dual storage architecture
- [NEXT-JS-CONCEPTS.md](./NEXT-JS-CONCEPTS.md) - SSR concepts explained