# Complete End-to-End Data Flow

**Overview**: This document covers two main workflows:
1. **Property Intelligence** - User searches → AI analyzes property → Images fetched → Results cached → UI display
2. **Area Intelligence** - User searches → AI researches area (13 Q&A) → Results saved to database → UI display

---

## PROPERTY INTELLIGENCE FLOW

---

## Phase 1: User Search & Cache Check

**Flow**: User Input → API Route → Cache Check → Return or Continue

**Steps**:
1. **User enters search query** in `components/home/real-estate-search.tsx`
   - Example: "Embassy Lake Terraces, Hebbal, Bangalore"
   - User selects provider (Claude WebSearch or Google Gemini) via toggle
   - Provider preference saved to localStorage

2. **Frontend sends POST request** to `/api/search`
   ```typescript
   const response = await fetch('/api/search', {
     method: 'POST',
     body: JSON.stringify({
       query: searchQuery,
       provider: selectedProvider,
       skipCache: false // Set to true for refresh
     })
   });
   ```

3. **API Route checks filesystem cache** (`lib/services/property-storage-service.ts`)
   - Generates slug: `"Embassy Lake Terraces"` → `"embassy-lake-terraces"`
   - Checks for `data/properties/embassy-lake-terraces.json`
   - If found and < 24 hours old → Return cached data immediately
   - If `skipCache=true` → Skip cache and perform fresh search

**Why Cache Check First?**
- **Performance**: Instant results for repeat searches
- **Cost savings**: Avoids redundant AI API calls
- **SSR concept**: Server-side cache reduces client wait time

---

## Phase 2: AI-Powered Property Analysis

**Flow**: AI Search → Extract Structured Data → Extract Narratives → Return JSON

**Implementation varies by provider:**

### Option A: Claude WebSearch (Default)
**File**: `app/api/search/route.ts` (Claude provider section)

**Steps**:
1. **Construct comprehensive search prompt**
   - Instructs Claude to use WebSearch tool to find property information
   - Specifies required data: specifications, location, amenities, narratives
   - Requests 9 narrative sections (overview, neighborhood, connectivity, etc.)

2. **Claude performs 5-7 web searches**
   - Searches multiple aspects: overview, amenities, pricing, reviews, location
   - Aggregates information from multiple pages automatically
   - No domain restrictions (searches all real estate portals)

3. **Extract property intelligence**
   - Structured data: price range, configurations, area, floors, amenities
   - Location data: neighborhood, nearby amenities, work proximity
   - Narratives: 9 detailed sections (3-4 sentences each)
   - Confidence score: 0-100 based on data completeness

4. **Return JSON** matching `IntelligentPropertyResult` interface

**Advantages**:
- Deep AI analysis with narrative generation
- No URL parsing issues (WebSearch handles extraction)
- Comprehensive data extraction

**Disadvantages**:
- No source URLs/citations (Claude doesn't provide metadata)
- Costs $10 per 1,000 searches

### Option B: Google Gemini with Search Grounding
**File**: `app/api/search/route.ts` (Gemini provider section)

**Steps**:
1. **Construct search-enabled prompt**
   - Enables Google Search grounding via `tools: [{ googleSearch: {} }]`
   - Same property intelligence schema as Claude
   - Requests structured JSON response

2. **Gemini searches Google and analyzes**
   - Uses Google Search results as grounding
   - Extracts property information from search results
   - Provides grounding metadata with source URLs

3. **Extract property intelligence + source citations**
   ```typescript
   // Extract grounding metadata
   if (data.candidates[0]?.groundingMetadata?.groundingChunks) {
     const sourceCitations = data.candidates[0].groundingMetadata.groundingChunks
       .filter((chunk: any) => chunk.web)
       .map((chunk: any) => ({
         uri: chunk.web.uri,
         title: chunk.web.title || chunk.web.uri
       }));
     property.sourceCitations = sourceCitations;
   }
   ```

4. **Return JSON with source citations**

**Advantages**:
- Google Search quality
- Source URLs with grounding metadata (for attribution)
- Free tier available

**Disadvantages**:
- Less narrative detail than Claude (shorter descriptions)
- Requires manual JSON parsing (no prefilled technique)

---

## Phase 3: Property Images via SerpAPI

**Flow**: AI Analysis Complete → Fetch Images from Google Images → Attach to Property

**File**: `lib/services/serpapi-service.ts`

**Why After AI Analysis?**
- Images are optional enhancement (don't block AI analysis)
- Can be added to cached properties retroactively
- Separates concerns (AI analysis vs image fetching)

**Steps**:
1. **Construct enhanced image search query**
   ```typescript
   const enhancedQuery = `${query} property apartment interior exterior photos bangalore`;
   // Example: "Embassy Lake Terraces property apartment interior exterior photos bangalore"
   ```

2. **Call SerpAPI Google Images API**
   ```typescript
   const url = new URL('https://serpapi.com/search.json');
   url.searchParams.append('engine', 'google_images');
   url.searchParams.append('q', enhancedQuery);
   url.searchParams.append('num', '8'); // Fetch 8 images
   url.searchParams.append('api_key', process.env.SERPAPI_KEY);
   url.searchParams.append('image_type', 'photo'); // Only photos, no clipart
   url.searchParams.append('hl', 'en');
   url.searchParams.append('gl', 'in'); // India-specific results
   ```

3. **Parse image results**
   ```typescript
   const images: PropertyImage[] = data.images_results
     .slice(0, 8)
     .filter((img: any) => img.thumbnail && img.original)
     .map((img: any) => ({
       thumbnail: img.thumbnail,    // For carousel display
       original: img.original,      // For lightbox full-size view
       title: img.title || 'Property Image',
       source: img.source || 'Unknown',
       link: img.link || ''
     }));
   ```

4. **Attach to property object**
   ```typescript
   if (propertyImages.length > 0) {
     property.propertyImages = propertyImages;
   }
   ```

**Why Both Interior and Exterior?**
- Enhanced query includes "interior exterior" keywords
- Provides comprehensive visual representation
- Helps users understand apartment layouts AND building architecture

**API Limits**:
- Free tier: 100 searches/month
- Paid: $50/month for 5,000 searches
- Optional: Works without SERPAPI_KEY (just skips images)

---

## Phase 4: Dual Storage - Filesystem + Supabase

**Flow**: Complete Property Object → Generate Slug → Save to Filesystem → Sync to Supabase → Return to Client

**File**: `lib/services/property-storage-service.ts`

**Dual Storage Strategy**:
This project uses **both** filesystem and database storage simultaneously for different benefits. See [STORAGE.md](./STORAGE.md) for complete details.

### Quick Summary:
1. **Generate unique slug** from property name
2. **Save to filesystem** (`data/properties/[slug].json`)
3. **Sync to Supabase** (`society` table with JSONB columns)
4. **Return slug** for client reference

**Key transformations**:
- `title` → `name` (database column)
- Nested objects → JSONB columns
- Arrays → JSONB columns
- CamelCase → snake_case

---

## Phase 5: Streaming Response to Client

**Flow**: Property Ready → Stream JSON → Client Updates UI Progressively

**Why Streaming?**
- **User experience**: See results immediately (don't wait 30 seconds)
- **Progressive rendering**: Show data as it arrives
- **Next.js SSR concept**: Server streams HTML/data to client

**Implementation** (`app/api/search/route.ts`):
```typescript
const encoder = new TextEncoder();
const stream = new ReadableStream({
  async start(controller) {
    // Send property analysis
    const chunk = JSON.stringify({
      type: 'analysis',
      data: property
    }) + '\n';
    controller.enqueue(encoder.encode(chunk));

    controller.close();
  }
});

return new Response(stream, {
  headers: { 'Content-Type': 'text/event-stream' }
});
```

**Client-Side Streaming** (`components/home/real-estate-search.tsx`):
```typescript
const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n').filter(line => line.trim());

  for (const line of lines) {
    const message = JSON.parse(line);

    if (message.type === 'analysis') {
      setSearchResults([message.data]); // Update UI
    }
  }
}
```

**Next.js SSR Concept**:
- API route runs on **server** (Node.js environment)
- Can access filesystem, make API calls, process data
- Streams results to **client** (browser)
- Client receives and renders progressively

---

## Phase 6: Comprehensive UI Display

**Flow**: Property Data Received → Render Hero → Display Tabs/Accordion → Show Images/Citations

**File**: `components/home/unified-property-card.tsx` (960+ lines)

### 6.1 Hero Section with Gradient Background
```typescript
<CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
  <CardTitle className="text-3xl mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
    {property.title}
  </CardTitle>
  <div className="text-3xl font-bold text-green-600">
    {property.specifications.priceRange || 'Price on request'}
  </div>
  {/* Badges: Confidence, Category, Status, Proximity */}
</CardHeader>
```

**Why Gradient Hero?**
- **Visual hierarchy**: Property name and price are most important
- **Brand consistency**: Blue-purple theme throughout app
- **Tailwind CSS**: Uses utility classes for responsive design

### 6.2 Property Images Carousel (Embla Carousel)
```typescript
{hasPropertyImages && (
  <Carousel className="w-full" opts={{ align: "start", loop: true }}>
    <CarouselContent>
      {property.propertyImages!.map((image, index) => (
        <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
          <div className="relative aspect-video cursor-pointer"
               onClick={() => openLightbox(index)}>
            <Image
              src={image.thumbnail}
              alt={image.title}
              fill
              className="object-cover rounded-lg"
              unoptimized
            />
          </div>
        </CarouselItem>
      ))}
    </CarouselContent>
    <CarouselPrevious />
    <CarouselNext />
  </Carousel>
)}
```

**Key Features**:
- **3 images per viewport** on desktop (responsive)
- **Click to enlarge** → Opens full-screen lightbox
- **Navigation arrows** for scrolling through images
- **Image source attribution** shown in hover/caption

**shadcn Carousel Component**:
- Built on **Embla Carousel** library
- Accessible keyboard navigation
- Touch/swipe support on mobile
- Responsive breakpoints (1/2/3 columns)

### 6.3 Full-Screen Image Lightbox
```typescript
{hasPropertyImages && showImageLightbox && (
  <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
       onClick={() => setShowImageLightbox(false)}>
    <button onClick={() => setShowImageLightbox(false)}
            className="absolute top-4 right-4 text-white">
      <X className="h-8 w-8" />
    </button>

    <Image
      src={property.propertyImages![lightboxImageIndex].original}
      alt={property.propertyImages![lightboxImageIndex].title}
      fill
      className="object-contain"
      unoptimized
    />

    {/* Previous/Next navigation */}
  </div>
)}
```

**Lightbox Features**:
- **Full-screen overlay** (z-50, fixed positioning)
- **Original image** (not thumbnail) for high resolution
- **Close on click outside** or via X button
- **Arrow navigation** between images
- **Image title display** at bottom

**React State Management**:
```typescript
const [showImageLightbox, setShowImageLightbox] = useState(false);
const [lightboxImageIndex, setLightboxImageIndex] = useState(0);

const openLightbox = (index: number) => {
  setLightboxImageIndex(index);
  setShowImageLightbox(true);
};
```

### 6.4 Quick Stats Grid
```typescript
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
  <div className="p-4 bg-blue-50 rounded-lg">
    <div className="text-sm text-gray-600">Property Type</div>
    <div className="font-bold">{property.specifications.propertyType}</div>
  </div>
  {/* Total Units, Total Floors, Amenities Count */}
</div>
```

**Responsive Grid**:
- **2 columns** on mobile (< 768px)
- **4 columns** on desktop (≥ 768px)
- Tailwind `md:` breakpoint for responsive design

### 6.5 Amenities in Tabs (6 Categories)
```typescript
<Tabs defaultValue="family" className="w-full">
  <TabsList className="grid w-full grid-cols-6">
    <TabsTrigger value="family">Family ({familyCount})</TabsTrigger>
    <TabsTrigger value="recreation">Recreation ({recreationCount})</TabsTrigger>
    <TabsTrigger value="sports">Sports ({sportsCount})</TabsTrigger>
    <TabsTrigger value="kids">Kids ({kidsCount})</TabsTrigger>
    <TabsTrigger value="clubhouse">Clubhouse ({clubhouseCount})</TabsTrigger>
    <TabsTrigger value="security">Security ({securityCount})</TabsTrigger>
  </TabsList>

  <TabsContent value="family">
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {property.community.familyAmenities?.map((amenity, i) => (
        <Badge key={i} variant="secondary">{amenity}</Badge>
      ))}
    </div>
  </TabsContent>
  {/* Repeat for other categories */}
</Tabs>
```

**Why Tabs for Amenities?**
- **Organized display**: 30+ amenities grouped by purpose
- **Reduced scrolling**: User chooses category of interest
- **Count badges**: Shows number of amenities per category
- **shadcn Tabs**: Accessible, keyboard navigable

**Amenity Categories**:
1. **Family**: Kids play area, crèche, daycare, pet park
2. **Recreation**: Swimming pool, clubhouse, party hall, sky lounge
3. **Sports**: Gym, tennis court, basketball court, jogging track
4. **Kids**: Play area, skating rink, kids pool, kids studio
5. **Clubhouse**: Indoor games, library, meditation hall, spa
6. **Security**: 24x7 security, CCTV, gated community, video door

### 6.6 Narratives in Accordion (9 Sections)
```typescript
<Accordion type="single" collapsible className="w-full">
  <AccordionItem value="overview">
    <AccordionTrigger>📋 Project Overview</AccordionTrigger>
    <AccordionContent>
      <p className="text-gray-700 leading-relaxed">
        {property.narratives.projectOverview}
      </p>
    </AccordionContent>
  </AccordionItem>

  {/* 8 more narrative sections */}
</Accordion>
```

**9 Narrative Sections**:
1. **Project Overview**: Developer, architecture, completion year
2. **Neighborhood Description**: Location details, nearby landmarks
3. **Property Positioning**: Luxury category, market segment
4. **Connectivity Analysis**: Business hubs, commute times
5. **Family Appeal**: Why families choose this property
6. **Expatriate Population**: Expat community, international appeal
7. **Entertainment & Lifestyle**: Nearby malls, restaurants, clubs
8. **Online Presence & Buzz**: Reviews, social proof, ratings
9. **Celebrity Residents**: Notable residents (if available)

**Why Accordion?**
- **Progressive disclosure**: Show overview, hide details until clicked
- **Reduced cognitive load**: User reads what interests them
- **Mobile-friendly**: Expandable sections work well on small screens

### 6.7 Source Citations Dialog (Gemini Only)
```typescript
{hasSources && (
  <Button variant="outline" size="sm" onClick={() => setShowSourcesDialog(true)}>
    <ExternalLink className="h-4 w-4 mr-2" />
    View Sources ({property.sourceCitations!.length})
  </Button>
)}

<SourcesDialog
  open={showSourcesDialog}
  onOpenChange={setShowSourcesDialog}
  sources={property.sourceCitations || []}
  propertyTitle={property.title}
/>
```

**Why Source Citations?**
- **Transparency**: User can verify AI analysis
- **Attribution**: Follows Google's grounding guidelines
- **Trust**: Shows where information came from
- **Only for Gemini**: Claude WebSearch doesn't provide source URLs

### 6.8 Refresh Button
```typescript
<Button
  variant="outline"
  size="sm"
  onClick={onRefresh}
  disabled={isRefreshing}
>
  <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
  Refresh Data
</Button>
```

**Refresh Functionality**:
- **Bypasses cache**: Sends `skipCache: true` to API
- **Fetches fresh data**: Re-runs AI analysis and image search
- **Loading state**: Button disabled + spinning icon during refresh
- **Updates UI**: New data replaces old property card

**Use Cases**:
- Property updated (new amenities, price change)
- User wants latest information
- Testing different AI providers (Claude vs Gemini)

---

## Complete Data Flow Diagram

```
USER INPUT
   ↓
[Search Form] → POST /api/search { query, provider, skipCache }
   ↓
[Cache Check] → data/properties/[slug].json exists?
   ↓
   YES → Return cached property
   ↓
   NO → Continue to AI analysis
   ↓
[AI Analysis]
   ↓
   Claude WebSearch? → 5-7 searches → Extract property intelligence
   ↓
   Gemini Search Grounding? → Google Search → Extract + source citations
   ↓
[Property Intelligence JSON]
   ↓
[Fetch Images] → SerpAPI Google Images → 8 photos (interior + exterior)
   ↓
[Add Images to Property Object]
   ↓
[DUAL STORAGE]
   ↓
   ├─ Phase 1: Save to Filesystem
   │  └─ data/properties/[slug].json ✅
   │
   └─ Phase 2: Sync to Supabase
      ├─ Transform: title → name
      ├─ JSONB: specifications, location, community, market, narratives
      ├─ Arrays: property_images, source_citations
      └─ supabase.from('society').upsert() ✅
   ↓
[Stream Response] → ReadableStream → Client
   ↓
[Update UI] → UnifiedPropertyCard
   ↓
DISPLAY:
- Hero (title, price, badges)
- Image carousel (3 per view, click to enlarge)
- Quick stats (type, units, floors, amenities)
- Amenities tabs (6 categories)
- Narratives accordion (9 sections)
- Source citations (Gemini only)
- Refresh button

---

STORED IN TWO PLACES:
1. 💾 Filesystem: data/properties/embassy-lake-terraces.json
2. 🗄️ Supabase: society table (row with slug='embassy-lake-terraces')
```

---

## AREA INTELLIGENCE FLOW

---

## Phase 1: User Search & Auto-City Creation

**Flow**: User Input (City + Area) → API Route → Check City → Auto-Create if Missing → Continue

**Steps**:
1. **User enters search query** in `components/home/area-search.tsx`
   - Example: City="Bangalore", Area="Whitefield"
   - Separate input fields for clarity

2. **Frontend sends POST request** to `/api/areas/search`
   ```typescript
   const response = await fetch('/api/areas/search', {
     method: 'POST',
     body: JSON.stringify({
       areaName: 'Whitefield',
       cityName: 'Bangalore',
       skipCache: false
     })
   });
   ```

3. **API Route checks cache** (by slug)
   - Generates slug: `"Whitefield" + "Bangalore"` → `"whitefield-bangalore"`
   - Queries `local_areas` table: `WHERE slug = 'whitefield-bangalore'`
   - If found AND has `last_analyzed` → Return cached data
   - If not found → Continue to city lookup

4. **City lookup with auto-creation**
   ```typescript
   // Try to find existing city
   const { data: existingCity } = await supabase
     .from('cities')
     .select('id')
     .ilike('name', 'Bangalore')
     .single()

   if (!existingCity) {
     // Auto-create city
     const { data: newCity } = await supabase
       .from('cities')
       .insert({ name: 'Bangalore' })
       .select('id')
       .single()
   }
   ```

**Key Feature**: Never fails due to missing city - always auto-creates ✅

---

## Phase 2: AI-Powered Area Research (13 Questions)

**Flow**: AI Search → Extract Structured Data → Calculate Confidence → Return JSON

**File**: `lib/services/area-intelligence-service.ts`

**Steps**:
1. **Construct comprehensive 13-question prompt**
   ```typescript
   const prompt = `Research ${areaName}, ${cityName} and answer:

   VIBE & LIFESTYLE:
   Q1. What is the unique local vibe and best demographic fit?
   Q2. Where are the main parks, shopping centers, leisure spots?

   MARKET DATA & INVESTMENT:
   Q3. Average price per sq.ft and appreciation rate?
   Q4. Rental yield and typical rental ranges?
   Q5. Stamp duty, registration costs, guidance value?

   INFRASTRUCTURE & COMMUTE:
   Q6. Water supply and sewage reliability?
   Q7. Commute times to major hubs?
   Q8. Upcoming infrastructure projects?

   LOCAL AMENITIES:
   Q9. Top hospitals and schools?
   Q10. Premium gated communities?

   BUYER STRATEGY & TIPS:
   Q11. Hidden costs breakdown?
   Q12. RTM vs UC recommendation?
   Q13. Common mistakes and insider tips?

   Return JSON with structured data...`;
   ```

2. **Gemini performs Google Search** with grounding
   ```typescript
   const model = gemini.getGenerativeModel({
     model: 'gemini-flash-latest',
     tools: [{ googleSearch: {} }]
   });

   const result = await model.generateContent(prompt);
   ```

3. **Parse AI response** and extract JSON
   ```typescript
   // Extract JSON from markdown code blocks or plain JSON
   const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) ||
                     aiResponse.match(/\{[\s\S]*\}/);
   const parsed = JSON.parse(jsonString);
   ```

4. **Calculate confidence score** (0-100)
   ```typescript
   // Based on data completeness
   const weights = {
     description: 5,
     vibeAndLifestyle: 15,
     marketData: 20,
     infrastructure: 20,
     localAmenities: 15,
     buyerIntelligence: 15,
     narratives: 5
   };
   // Sum up weights for non-empty fields
   ```

**Data Extracted**:
- Vibe & Lifestyle (demographics, parks, shopping)
- Market Data (prices, rental yields, stamp duty)
- Infrastructure (water, commute times, projects)
- Local Amenities (hospitals, schools, communities)
- Buyer Intelligence (hidden costs, tips, mistakes)
- Narratives (5 paragraphs: vibe, market, connectivity, amenities, investment)

---

## Phase 3: Database Upsert with Constraint Handling

**Flow**: Enriched Data → Prepare Record → Upsert by (city_id, area) → Return Result

**File**: `app/api/areas/search/route.ts`

**Steps**:
1. **Prepare area record**
   ```typescript
   const areaRecord = {
     area: 'Whitefield',
     city_id: cityData.id,
     slug: 'whitefield-bangalore',
     description: enrichedData.description,
     vibe_and_lifestyle: enrichedData.vibeAndLifestyle,
     market_data: enrichedData.marketData,
     infrastructure: enrichedData.infrastructure,
     local_amenities: enrichedData.localAmenities,
     buyer_intelligence: enrichedData.buyerIntelligence,
     narratives: enrichedData.narratives,
     confidence_score: enrichedData.confidenceScore,
     last_analyzed: new Date().toISOString(),
     data_source: 'gemini_search'
   };
   ```

2. **Upsert to database**
   ```typescript
   const { data: savedArea } = await supabase
     .from('local_areas')
     .upsert(areaRecord, {
       onConflict: 'city_id,area'  // Composite unique constraint
     })
     .select('*, cities(name)')
     .single();
   ```

**Key Constraints**:
- **Unique constraint**: `(city_id, area)` - Same area name in same city
- **Slug uniqueness**: Automatically guaranteed by `area + city` formula
- **No conflicts**: Upsert updates existing row if `(city_id, area)` match

**Why This Works**:
```
IF slug = area + city
AND (city_id, area) is unique
THEN slug is automatically unique ✅
```

---

## Phase 4: Response to Client

**Flow**: Saved Area → Transform to Frontend Format → Return JSON

**Steps**:
1. **Transform database row to API response**
   ```typescript
   return NextResponse.json({
     success: true,
     area: {
       id: savedArea.id,
       area: savedArea.area,
       cityId: savedArea.city_id,
       cityName: savedArea.cities.name,  // From JOIN
       vibeAndLifestyle: savedArea.vibe_and_lifestyle,
       marketData: savedArea.market_data,
       infrastructure: savedArea.infrastructure,
       localAmenities: savedArea.local_amenities,
       buyerIntelligence: savedArea.buyer_intelligence,
       narratives: savedArea.narratives,
       confidenceScore: savedArea.confidence_score,
       lastAnalyzed: savedArea.last_analyzed
     },
     fromCache: false
   });
   ```

2. **Client redirects to area detail page**
   ```typescript
   if (data.success && data.area?.id) {
     router.push(`/areas/${data.area.id}`);
   }
   ```

---

## Phase 5: Area Detail Page Display

**Flow**: Fetch Area by ID → Display Structured Information → Show Narratives

**File**: `app/areas/[id]/page.tsx`

**Sections Displayed**:

1. **Hero Section**
   - Area name + city
   - Confidence score badge
   - Last analyzed timestamp

2. **Vibe & Lifestyle Tab**
   - Unique vibe description
   - Best suited for demographics
   - Local parks, shopping centers, leisure spots

3. **Market Data Tab**
   - Average price per sq.ft
   - Appreciation rate
   - Rental yield ranges
   - Stamp duty percentage

4. **Infrastructure Tab**
   - Water supply reliability
   - Commute times grid
   - Upcoming projects list
   - Metro connectivity

5. **Local Amenities Tab**
   - Top hospitals table
   - Top schools table
   - Premium communities
   - Shopping malls

6. **Buyer Intelligence Tab**
   - Hidden costs breakdown
   - RTM vs UC recommendation
   - Insider tips
   - Common mistakes

7. **Narratives Accordion**
   - Vibe narrative (2-3 paragraphs)
   - Market narrative
   - Connectivity narrative
   - Amenities narrative
   - Investment narrative

---

## Complete Area Intelligence Diagram

```
USER INPUT (City + Area)
   ↓
[Area Search Form] → POST /api/areas/search { areaName, cityName, skipCache }
   ↓
[Check Cache] → local_areas WHERE slug = 'whitefield-bangalore' exists?
   ↓
   YES → Return cached area
   ↓
   NO → Continue to city lookup
   ↓
[City Lookup]
   ↓
   Found? → Use existing city_id
   ↓
   Not Found? → INSERT new city → Get new city_id ✅
   ↓
[AI Research] → Gemini Google Search → 13 Questions
   ↓
   Q1-Q2: Vibe & Lifestyle
   Q3-Q5: Market Data & Investment
   Q6-Q8: Infrastructure & Commute
   Q9-Q10: Local Amenities
   Q11-Q13: Buyer Strategy & Tips
   ↓
[Parse JSON Response]
   ↓
   Extract: vibeAndLifestyle, marketData, infrastructure,
            localAmenities, buyerIntelligence, narratives
   ↓
   Calculate: confidenceScore (0-100)
   ↓
[UPSERT TO DATABASE]
   ↓
   Conflict Check: (city_id, area) exists?
   ↓
   YES → UPDATE existing row with fresh data
   NO → INSERT new row
   ↓
   Slug uniqueness: Guaranteed by formula (area + city)
   ↓
[Return Response] → { success: true, area: {...}, fromCache: false }
   ↓
[Redirect to Area Detail] → /areas/{id}
   ↓
DISPLAY:
- Hero (area name, city, confidence)
- Vibe & Lifestyle (demographics, parks, shopping)
- Market Data (prices, rental yields, stamp duty)
- Infrastructure (water, commute, projects)
- Local Amenities (hospitals, schools, communities)
- Buyer Intelligence (hidden costs, tips, mistakes)
- Narratives (5 paragraphs in accordion)

---

STORED IN DATABASE:
🗄️ Supabase local_areas table:
   - Unique constraint on (city_id, area)
   - JSONB columns for structured data
   - Auto-updated property_count trigger
   - Foreign key to cities table
```

---

## Bulk Area Enrichment Flow

**File**: `app/api/areas/bulk-enrich/route.ts`

**Steps**:
1. User uploads CSV/JSON/TXT file with area-city pairs
2. Parse file → Validate → Deduplicate
3. For each area:
   - Call `/api/areas/search` internally
   - Stream progress to client
4. Cooldown every 20 areas (30 seconds)
5. Return summary statistics

**Streaming Messages**:
```typescript
{ type: 'start', total: 50 }
{ type: 'progress', current: 1, area: 'Whitefield', city: 'Bangalore' }
{ type: 'completed', area: { ...enriched data... } }
{ type: 'cooldown', message: 'Pausing for 30 seconds...' }
{ type: 'error', error: 'City not found' }
{ type: 'complete', stats: { total: 50, succeeded: 48, failed: 2 } }
```

---

## Related Documentation

- [STORAGE.md](./STORAGE.md) - Complete dual storage architecture
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Service architecture and providers
- [NEXT-JS-CONCEPTS.md](./NEXT-JS-CONCEPTS.md) - SSR concepts explained
