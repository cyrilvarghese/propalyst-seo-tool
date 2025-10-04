# Propalyst - AI Property Intelligence Platform

AI-powered real estate intelligence platform that extracts comprehensive property data from the web, analyzes with Claude/Gemini AI, and creates unified narrative-rich property profiles.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and login with:
- **Email**: `demo@propalyst.com`
- **Password**: `password123`

## 📋 Prerequisites

At least **one AI provider** is required:
- **Claude API Key** (for Claude WebSearch) - $10 per 1,000 searches
- **Google AI API Key** (for Gemini with Google Search) - Free tier available

Optional but recommended:
- **SerpAPI Key** - Property images (250 free/month)
- **Supabase Account** - PostgreSQL database (500MB free)

## ⚙️ Environment Setup

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Add your API keys to `.env.local`:
```env
# AI Providers (at least one required)
ANTHROPIC_API_KEY=your_claude_api_key
GOOGLE_AI_API_KEY=your_gemini_api_key

# Optional but recommended
SERPAPI_KEY=your_serpapi_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
```

## 🏗️ Architecture

### Tech Stack
- **Next.js 14** (App Router) - React framework with SSR
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Supabase** - PostgreSQL database
- **Claude/Gemini AI** - Property analysis
- **SerpAPI** - Property images

### Core Features

#### 1. Single Property Search
Search any property by name and get:
- **Structured data**: Price, configurations, area, floors, amenities
- **Location intelligence**: Neighborhood, connectivity, work proximity
- **9 narrative sections**: Overview, positioning, lifestyle, reviews
- **8 property images**: Interior and exterior photos
- **AI analysis**: 85% average confidence score

#### 2. Bulk Property Search
Upload a file with multiple properties (JSON/CSV/TXT):
- Process 20+ properties automatically
- Real-time progress tracking
- Cooldown after every 20 properties (30 seconds)
- Smart resume: Skip cooldown or wait automatically
- Properties appear in table as they complete

#### 3. Dual Storage Strategy
- **Filesystem**: `data/properties/[slug].json` (fast cache, Git-trackable)
- **Supabase**: PostgreSQL database (queryable, production-ready)
- Both synced automatically on every save

## 📁 Project Structure

```
app/
├── api/
│   ├── search/route.ts              # Main property search
│   ├── bulk-search/
│   │   ├── route.ts                 # Bulk processing with streaming
│   │   └── resume/route.ts          # Cooldown resume endpoint
│   └── properties/[slug]/route.ts   # Fetch by slug
├── properties/
│   ├── page.tsx                     # Properties list + bulk upload
│   └── [slug]/page.tsx              # Individual property details
└── page.tsx                         # Home page with search

components/
├── ui/                              # shadcn/ui components
├── home/
│   ├── real-estate-search.tsx       # Search form with streaming
│   ├── unified-property-card.tsx    # Property display (960+ lines)
│   └── sources-dialog.tsx           # Gemini source citations
└── common/
    └── navigation.tsx               # Navigation bar

lib/
├── services/
│   ├── property-storage-service.ts  # Dual storage handler
│   └── serpapi-service.ts           # Image fetching
├── types/
│   └── property-intelligence.ts     # TypeScript interfaces
└── utils/
    └── supabase-client.ts           # Database client

data/
└── properties/                      # Cached property JSON files
```

## 🔄 Data Flow

### Single Property Search
```
1. User searches "Embassy Lake Terraces"
2. Check filesystem cache (data/properties/embassy-lake-terraces.json)
3. If not cached:
   - AI analysis (Claude/Gemini): 5-7 web searches
   - Fetch 8 property images (SerpAPI)
   - Extract structured data + 9 narratives
4. Save to:
   - Filesystem: data/properties/[slug].json
   - Supabase: society table (upsert)
5. Stream results to client
6. Display: Hero + Images + Amenities + Narratives
```

### Bulk Property Search
```
1. Upload file (JSON/CSV/TXT) with property names
2. For each property:
   - Call /api/search internally (reuses existing logic)
   - Show yellow "processing" row in table
   - When complete, add property to table at top
3. After every 20 properties:
   - Show cooldown dialog (30 seconds)
   - User can skip or wait
   - Server waits for client resume signal
4. Summary: X succeeded, Y failed, Z skipped
```

## 🧠 Next.js SSR Concepts

### Server vs Client Components
- **Server Components** (default): Run on Node.js, can access filesystem/database/secrets, NO React hooks
- **Client Components** (`"use client"`): Run in browser, React hooks allowed, NO direct DB access

### API Routes
- Located in `app/api/`
- Run on server (Node.js environment)
- Can use `fs`, `path`, `process.env`
- Keep API keys secret here

### Streaming Responses
- Server sends data progressively (`ReadableStream`)
- Client receives and updates UI in real-time
- Best for long-running operations (AI search takes 20-30 seconds)
- Better UX than waiting for full response

**Example**:
```typescript
// Server: Send data as it arrives
const stream = new ReadableStream({
  async start(controller) {
    controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
    controller.close()
  }
})

// Client: Read and display progressively
const reader = response.body?.getReader()
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  // Update UI immediately
}
```

## 🎨 UI Components

This project uses [shadcn/ui](https://ui.shadcn.com) components exclusively:

**Installed components**:
- button, input, label, table, badge
- accordion, collapsible, card, separator
- toggle, tabs, carousel, dialog

**Add new components**:
```bash
npx shadcn@latest add <component-name>
```

## 🗄️ Database Schema

**Table**: `society` (Supabase PostgreSQL)

```sql
- id (TEXT, PRIMARY KEY)
- name (TEXT, NOT NULL)
- slug (TEXT, UNIQUE, NOT NULL)
- description (TEXT)
- specifications (JSONB) -- price, configs, area
- location (JSONB) -- neighborhood, city, connectivity
- community (JSONB) -- amenities by category
- market (JSONB) -- developer, completion, investment
- narratives (JSONB) -- 9 sections
- property_images (JSONB[]) -- 8 images
- source_citations (JSONB[]) -- Gemini sources
- confidence_score (INTEGER)
- created_at (TIMESTAMPTZ)
```

## 🔧 Development Commands

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev

# Add shadcn/ui component
npx shadcn@latest add <component>

# Type checking
npm run type-check

# Build for production
npm run build

# Start production server
npm start
```

## 🚨 Common Issues

### No Search Results
- Verify API keys in `.env.local`
- Try more specific property name (include location)
- Check browser console for errors

### Bulk Search Not Working
- Check server logs for errors
- Verify file format (JSON array, CSV, or TXT)
- Ensure properties are valid names

### Images Not Loading
- Optional: Works without `SERPAPI_KEY`
- Free tier: 100 searches/month
- Check if `propertyImages` array is populated

### Supabase Sync Failed
- Non-blocking: Property still saved to filesystem
- Verify `SUPABASE_URL` and `SUPABASE_KEY`
- Check table schema matches transformations

## 📊 Performance

- **First search**: 20-30 seconds (AI analysis + images)
- **Cached search**: < 1 second (filesystem read)
- **Cache duration**: 24 hours (configurable)
- **Bulk search**: ~30 seconds per property
- **Cooldown**: 30 seconds after every 20 properties

## 🌐 Deployment

### Render (Node.js)

Click the button to deploy:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

**Required environment variables**:
- `ANTHROPIC_API_KEY` or `GOOGLE_AI_API_KEY`
- `SERPAPI_KEY` (optional)
- `SUPABASE_URL` and `SUPABASE_KEY` (optional)

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

 