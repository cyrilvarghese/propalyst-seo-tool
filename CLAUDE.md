# Propalyst - AI Property Intelligence Platform

## Teaching Mode
IMPORTANT: This is a Next.js learning project. Always explain:
- Why the change was needed
- What Next.js/SSR concepts are being used
- How it differs from SPA frameworks
- Best practices and common pitfalls

## Bash Commands
- `npm install` - Install dependencies
- `npm run dev` - Start development server (http://localhost:3000)
- `npx shadcn@latest add <component>` - Add UI component

## Project Setup
1. Copy `.env.example` to `.env.local`
2. Add required API keys (see Environment Variables below)
3. Login: `demo@propalyst.com` / `password123`

## Environment Variables
```env
# AI Providers (at least one required)
ANTHROPIC_API_KEY=xxx          # Claude WebSearch
GOOGLE_AI_API_KEY=xxx          # Gemini with Google Search

# Optional but recommended
SERPAPI_KEY=xxx                # Property images (100 free/month)
SUPABASE_URL=xxx               # PostgreSQL database
SUPABASE_KEY=xxx               # Supabase anon key
```

## Architecture Overview
**Mission**: Search property name → AI extracts data from web → Save to filesystem + database → Display comprehensive profile

**Tech Stack**:
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Dual storage: Filesystem (cache) + Supabase (persistence)

## Critical Rules

### UI Components
**YOU MUST use shadcn/ui components EXCLUSIVELY**
- Check https://ui.shadcn.com/docs/components before creating ANY component
- NEVER write custom UI without explicit permission
- Installed: button, input, label, table, badge, accordion, collapsible, card, separator, toggle, tabs, carousel, dialog

### Code Style
- Use TypeScript with strict types
- Prefer server components (default in app/)
- Use "use client" only when React hooks needed
- API routes in `app/api/` run server-side (Node.js)
- Keep secrets in environment variables (never expose to client)

### Workflow
- NEVER create files unless absolutely necessary
- ALWAYS prefer editing existing files
- NEVER proactively create docs (*.md, README) unless asked
- Do exactly what's asked - nothing more, nothing less

## Core Files & Services

### API Routes (Server-Side)
- `app/api/search/route.ts` - Main property search (Claude or Gemini)
- `app/api/bulk-search/route.ts` - Batch processing with streaming
- `app/api/properties/[slug]/route.ts` - Fetch by slug

### Services
- `lib/services/property-storage-service.ts` - Dual storage (filesystem + Supabase)
  - `storeProperty()` - Saves to both locations
  - `syncToSupabase()` - Syncs to database
  - `generateSlug()` - Creates URL-safe identifier
- `lib/services/serpapi-service.ts` - Fetch property images (8 per property)

### Key Components
- `components/home/real-estate-search.tsx` - Search form with streaming
- `components/home/unified-property-card.tsx` - Main property display (960 lines)
- `app/properties/page.tsx` - Properties list with bulk search

### Types
- `lib/types/property-intelligence.ts` - Main interfaces
  - `IntelligentPropertyResult` - Property schema
  - `PropertyImage` - Image data
  - `SourceCitation` - Gemini source URLs

## Data Flow (End-to-End)

### Search Flow
```
User searches "Embassy Lake Terraces"
  ↓
Check cache: data/properties/embassy-lake-terraces.json
  ↓ (if not cached)
AI Analysis:
  - Claude: 5-7 web searches → Extract structured data + 9 narratives
  - Gemini: Google Search → Extract data + source citations
  ↓
Fetch Images: SerpAPI → 8 photos (interior + exterior)
  ↓
Save to:
  1. Filesystem: data/properties/[slug].json
  2. Supabase: society_new table (upsert by slug)
  ↓
Stream response to client
  ↓
Display: Hero + Images + Amenities + Narratives
```

### Bulk Search Flow (Current - DEBUG MODE)
```
Upload file (JSON/CSV/TXT with property names)
  ↓
For each property:
  1. Call /api/search internally
  2. Wait for stream completion
  3. Log "✅ Property saved to Supabase"
  4. Update stats (succeeded/failed/skipped)
  ↓
Show summary
```

**IMPORTANT**: Bulk search currently in simplified debug mode. Just saves to Supabase, doesn't fetch/display properties yet.

## Storage Strategy

### Filesystem (Fast Cache)
- **Location**: `data/properties/[slug].json`
- **Slug**: "Sobha Indraprastha" → "sobha-indraprastha"
- **Contains**: Complete property object with images, citations
- **Used for**: Cache hits, instant results

### Supabase (Persistent Database)
- **Table**: `society_new`
- **Key fields**: id, name, slug (unique), specifications, location, community, market, narratives
- **JSONB columns**: specifications, location, community, market, narratives, property_images, source_citations
- **Sync method**: `upsert()` by slug (prevents duplicates)
- **Used for**: Querying, production storage, cross-instance sharing

## Property Schema

### Structured Data
- **specifications**: propertyType, configurations, priceRange, totalArea, totalFloors, totalUnits
- **location**: neighborhood, city, connectivity, workProximity (0-10), nearbyAmenities
- **community**: amenities by category (family, recreation, sports, kids, clubhouse, security)
- **market**: developer, completionYear, investmentPotential, category (Luxury/Premium/Mid-range)

### Narratives (9 Sections)
1. **projectOverview** - Developer, architecture, completion year
2. **neighborhoodDescription** - Location details, landmarks
3. **propertyPositioning** - Luxury category, market segment
4. **connectivityAnalysis** - Business hubs, commute times
5. **familyAppeal** - Why families love it
6. **expatriatePopulation** - Expat community, international appeal
7. **entertainmentLifestyle** - Nearby malls, restaurants, clubs
8. **onlinePresenceBuzz** - Reviews, social proof
9. **celebrityResidents** - Notable residents (if available)

## Next.js SSR Concepts

### Server vs Client Components
- **Server (default)**: Runs on Node.js, can access filesystem/database/secrets, NO React hooks
- **Client ("use client")**: Runs in browser, React hooks allowed, NO direct DB access

### API Routes
- Located in `app/api/`
- Run on server (Node.js)
- Can use `fs`, `path`, `process.env`
- Keep API keys secret here

### Streaming
- Server sends data progressively (ReadableStream)
- Client receives and updates UI in real-time
- Best for long-running operations (AI search takes 20-30 seconds)
- Better UX than waiting for full response

### Caching Strategy
- **First search**: 20-30 seconds (AI + images)
- **Cached search**: < 1 second (read from filesystem)
- **Cache duration**: 24 hours (configurable)

## AI Providers

### Claude WebSearch (Default)
- 5-7 comprehensive web searches per property
- Detailed narratives (3-4 sentences each)
- No domain restrictions
- Cost: $10 per 1,000 searches
- **No source URLs** (WebSearch doesn't provide metadata)

### Google Gemini
- Uses Google Search with grounding
- Provides source URLs for attribution
- Free tier available
- Shorter narratives than Claude
- **Has source citations** (grounding metadata)

### Switching Providers
- UI toggle above search box (saved to localStorage)
- No server restart needed
- Can be set via `SEARCH_PROVIDER` env variable

## Common Issues & Solutions

### Bulk Search Debugging
- Currently in DEBUG MODE: just saves to Supabase
- Check server logs for `/api/search` calls
- Verify Supabase `society_new` table for new rows
- Next step: Add back property fetching + UI display

### Search Not Working
- Check browser console for errors
- Verify API keys in `.env.local`
- Check server logs for detailed error messages
- Try with more specific property name

### No Images
- Optional: Works without SERPAPI_KEY
- Free tier: 100 searches/month
- Check if `propertyImages` array is populated

### Supabase Sync Failed
- Non-blocking: Property still saved to filesystem
- Check Supabase credentials
- Verify table schema matches transformation in `syncToSupabase()`

## Testing
- Try sample properties: "Embassy Lake Terraces", "Brigade Gateway", "Sobha Indraprastha"
- Test both providers: Claude vs Gemini
- Check cache: Second search should be instant
- Verify dual storage: Check both filesystem and Supabase

## Repository Etiquette
- Commit property JSON files to Git (valuable cached data)
- Keep `.env.local` out of Git (secrets)
- Test changes locally before committing
- Follow existing code style (TypeScript, Tailwind utility classes)
