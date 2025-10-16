/**
 * Area Blog Generation Service
 *
 * Two-Phase Approach:
 * 1. Generate blog content with AI (sections + image search queries)
 * 2. Fetch targeted images from SerpAPI for each section
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { AreaIntelligenceResult, BlogContent, BlogSection, BlogImage } from '@/lib/types/area-intelligence'
import { fetchSpecificImages } from '@/lib/services/serpapi-service'

export class AreaBlogService {
    private gemini: GoogleGenerativeAI
    private blogId: string

    constructor() {
        this.blogId = `blog-${Date.now()}-${Math.random().toString(36).substring(7)}`

        const apiKey = process.env.GOOGLE_AI_API_KEY
        if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not configured')
        this.gemini = new GoogleGenerativeAI(apiKey)

        console.log(`[BlogService:${this.blogId}] 🚀 Initialized`)
    }

    /**
     * Main method: Generate complete blog with targeted images
     */
    async generateBlog(area: AreaIntelligenceResult): Promise<BlogContent> {
        console.log(`[BlogService:${this.blogId}] 📝 Generating blog for: ${area.area}`)

        try {
            // Phase 1: Generate blog content + image search queries
            const blogDraft = await this.generateBlogContent(area)
            console.log(`[BlogService:${this.blogId}] ✅ Generated ${blogDraft.sections.length} sections`)

            // Phase 2: Fetch targeted images for each section
            const blogWithImages = await this.enrichBlogWithImages(blogDraft, area.area)
            console.log(`[BlogService:${this.blogId}] ✅ Blog complete with images`)

            return blogWithImages

        } catch (error: any) {
            console.error(`[BlogService:${this.blogId}] ❌ Error:`, error.message)
            throw error
        }
    }

    /**
     * Phase 1: Generate blog content with AI
     */
    private async generateBlogContent(area: AreaIntelligenceResult): Promise<BlogContent> {
        console.log(`[BlogService:${this.blogId}] 🤖 Generating blog content with AI...`)

        const prompt = this.buildBlogPrompt(area)
        const model = this.gemini.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            tools: [{ googleSearch: {} }] as any
        })

        const result = await model.generateContent(prompt)
        const aiResponse = result.response.text()

        return this.parseBlogResponse(aiResponse, area)
    }

    /**
     * Build comprehensive blog generation prompt
     */
    private buildBlogPrompt(area: AreaIntelligenceResult): string {
        return `You are a professional real estate content writer. Generate a comprehensive, SEO-optimized blog post about **${area.area}, ${area.cityName}**.

**EXISTING DATA TO USE:**
${JSON.stringify({
    description: area.description,
    overview: area.overview,
    vibeAndLifestyle: area.vibeAndLifestyle,
    marketData: area.marketData,
    infrastructure: area.infrastructure,
    localAmenities: area.localAmenities,
    buyerIntelligence: area.buyerIntelligence,
    narratives: area.narratives
}, null, 2)}

**BLOG REQUIREMENTS:**
- Title: Catchy, SEO-friendly (include year 2025)
- Meta Description: 150-160 characters
- Word Count: 2500-3000 words total
- Reading Time: Calculate based on 200 words/minute
- Tone: Professional but conversational, helpful for property buyers/investors

**STRUCTURE: 6-8 SECTIONS**

Each section must include:
1. **heading**: Compelling H2 heading
2. **content**: 300-400 words in markdown format (use **bold**, lists, etc.)
3. **imageSearchQuery**: A specific 3-6 word phrase for Google Images that would fetch THE MOST RELEVANT photo for this section

**SECTION GUIDELINES:**

Section 1 - Overview & Introduction
- Content: Introduce the area, key highlights, why it matters
- Image Query: Focus on ICONIC landmarks or aerial views
  Examples: "UB City Bangalore skyline", "Cubbon Park Bangalore aerial", "MG Road Bangalore street view"

Section 2 - Lifestyle & Vibe
- Content: What's it like to live here? Demographics, culture, social scene
- Image Query: SPECIFIC cafes, restaurants, or popular streets with architectural character
  Examples: "Church Street Bangalore cafes", "100 Feet Road Indiranagar", "Brigade Road shopping"

Section 3 - Real Estate Market & Pricing
- Content: Property prices, trends, investment potential
- Image Query: HIGH-RISE residential towers or gated communities (use actual project names if mentioned)
  Examples: "Prestige Shantiniketan Bangalore", "Sobha City apartments", "luxury apartments Bangalore"

Section 4 - Infrastructure & Connectivity
- Content: Metro, roads, commute times, upcoming projects
- Image Query: NAMED metro stations, flyovers, or major road junctions
  Examples: "MG Road metro station", "Trinity metro station Bangalore", "Silk Board flyover"

Section 5 - Schools, Hospitals & Amenities
- Content: Top schools, hospitals, shopping malls
- Image Query: NAMED facilities - use actual school/mall/hospital names mentioned in content
  Examples: "Garuda Mall Bangalore", "Manipal Hospital Bangalore", "Vibgyor School"

Section 6 - Investment & Buyer Tips
- Content: Hidden costs, insider tips, common mistakes
- Image Query: Under-construction premium projects or real estate signage
  Examples: "residential towers under construction Bangalore", "luxury apartment construction"

**CRITICAL IMAGE SEARCH QUERY RULES:**

1. **ALWAYS USE ACTUAL NAMES**: If you mention "Garuda Mall" in content, search "Garuda Mall Bangalore" NOT "shopping mall bangalore"

2. **PRIORITIZE LANDMARKS**: Choose recognizable buildings, metro stations, malls, tech parks by name

3. **QUALITY OVER QUANTITY**: It's OK if some sections don't find images - better than random/irrelevant photos

4. **REAL ESTATE FOCUS**: Prefer:
   - Named residential projects (Prestige, Sobha, Brigade)
   - Named commercial buildings (UB City, RMZ Ecospace)
   - Named metro stations (Trinity, MG Road, Indiranagar)
   - Named malls/landmarks (Forum Mall, Garuda Mall)

5. **AVOID GENERIC TERMS**:
   ❌ "bangalore apartments"
   ❌ "metro station"
   ❌ "shopping center"
   ✅ "Mantri Square Mall Bangalore"
   ✅ "Purple Line metro Bangalore"
   ✅ "Salarpuria Sattva Magnificia"

6. **FORMAT**: 3-6 words, include city name, use proper names from content

7. **TEST MENTALLY**: Would this query return a SPECIFIC, RECOGNIZABLE photo? If not, make it more specific.

**OUTPUT FORMAT:**
Return ONLY valid JSON in this exact structure:

{
  "title": "Complete Guide to Living in ${area.area}, ${area.cityName} (2025)",
  "metaDescription": "150-160 char summary",
  "sections": [
    {
      "id": "overview",
      "heading": "Section heading",
      "content": "Markdown content here (300-400 words)...",
      "imageSearchQuery": "specific 3-6 word phrase"
    },
    {
      "id": "lifestyle",
      "heading": "...",
      "content": "...",
      "imageSearchQuery": "..."
    }
    // ... 4-6 more sections
  ],
  "tags": ["${area.area.toLowerCase()}", "${area.cityName.toLowerCase()}", "real-estate", "property-guide"]
}

IMPORTANT:
- Write engaging, informative content
- Use the provided data but expand with additional context
- Make image search queries VERY specific
- Return ONLY valid JSON, no extra text`
    }

    /**
     * Parse AI response into BlogContent structure
     */
    private parseBlogResponse(aiResponse: string, area: AreaIntelligenceResult): BlogContent {
        try {
            // Extract JSON from response
            const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) ||
                aiResponse.match(/```\n([\s\S]*?)\n```/) ||
                aiResponse.match(/\{[\s\S]*\}/)

            if (!jsonMatch) {
                throw new Error('No JSON found in AI response')
            }

            const jsonString = jsonMatch[1] || jsonMatch[0]
            const parsed = JSON.parse(jsonString)

            // Calculate reading time
            const totalWords = parsed.sections.reduce((sum: number, s: any) => {
                return sum + (s.content?.split(/\s+/).length || 0)
            }, 0)
            const readingTimeMinutes = Math.ceil(totalWords / 200)

            return {
                title: parsed.title,
                metaDescription: parsed.metaDescription,
                publishedDate: new Date().toISOString().split('T')[0],
                readingTimeMinutes,
                sections: parsed.sections.map((s: any) => ({
                    id: s.id,
                    heading: s.heading,
                    content: s.content,
                    imageSearchQuery: s.imageSearchQuery,
                    images: [], // Will be populated in Phase 2
                    imageCaption: '' // Will be generated in Phase 2
                })),
                tags: parsed.tags,
                generatedAt: new Date().toISOString()
            }

        } catch (error) {
            console.error(`[BlogService:${this.blogId}] ❌ Failed to parse JSON:`, error)
            throw new Error('Failed to parse AI blog response')
        }
    }

    /**
     * Phase 2: Fetch targeted images for each section
     */
    private async enrichBlogWithImages(blogDraft: BlogContent, areaName: string): Promise<BlogContent> {
        console.log(`[BlogService:${this.blogId}] 🖼️ Fetching targeted images for ${blogDraft.sections.length} sections...`)

        for (let i = 0; i < blogDraft.sections.length; i++) {
            const section = blogDraft.sections[i]

            try {
                console.log(`[BlogService:${this.blogId}] 📸 [${i + 1}/${blogDraft.sections.length}] Fetching: "${section.imageSearchQuery}"`)

                // Fetch 1 targeted image per section
                const images = await fetchSpecificImages(section.imageSearchQuery, 1)

                if (images.length > 0) {
                    section.images = images.map(img => ({
                        url: img.original,
                        thumbnail: img.thumbnail,
                        title: img.title,
                        source: img.source
                    }))

                    // Generate caption from image title and content
                    section.imageCaption = this.generateCaption(section, images[0].title)

                    console.log(`[BlogService:${this.blogId}] ✅ [${i + 1}/${blogDraft.sections.length}] Image found: ${images[0].title}`)
                } else {
                    console.log(`[BlogService:${this.blogId}] ⚠️ [${i + 1}/${blogDraft.sections.length}] No image found for: "${section.imageSearchQuery}"`)
                }

                // Rate limiting: 1 second delay between requests
                if (i < blogDraft.sections.length - 1) {
                    await this.sleep(1000)
                }

            } catch (error: any) {
                console.error(`[BlogService:${this.blogId}] ❌ Image fetch failed for section ${i + 1}:`, error.message)
                // Continue with next section (non-blocking)
            }
        }

        const imagesFound = blogDraft.sections.filter(s => s.images.length > 0).length
        console.log(`[BlogService:${this.blogId}] 🎉 Blog enriched with ${imagesFound}/${blogDraft.sections.length} images`)

        return blogDraft
    }

    /**
     * Generate contextual caption from image title
     */
    private generateCaption(section: BlogSection, imageTitle: string): string {
        // Simple caption: Use image title as is, or create from section heading
        if (imageTitle && imageTitle.length > 10 && !imageTitle.includes('http')) {
            return imageTitle
        }
        return `Visual representation of ${section.heading.toLowerCase()}`
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
}
