export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type SocietyRow = {
    id: number
    name: string
    description: string | null
    specifications: Json | null
    location: Json | null
    community: Json | null
    market: Json | null
    narratives: Json | null
    confidence_score: number | null
    source_url: string | null
    source_name: string | null
    last_analyzed: string | null
    search_score: number | null
    source_analyses: Json[] | null
    source_citations: Json[] | null
    property_images: Json[] | null
    stored_at: string | null
    slug: string
    created_at: string | null
    updated_at: string | null
    area: string | null
    blog_post: Json | null
    blog_images: Json[] | null
    area_temp1: string | null
    area_temp2: string | null
    area_temp3: string | null
}

export type SocietyInsert = {
    id?: number
    name: string
    description?: string | null
    specifications?: Json | null
    location?: Json | null
    community?: Json | null
    market?: Json | null
    narratives?: Json | null
    confidence_score?: number | null
    source_url?: string | null
    source_name?: string | null
    last_analyzed?: string | null
    search_score?: number | null
    source_analyses?: Json[] | null
    source_citations?: Json[] | null
    property_images?: Json[] | null
    stored_at?: string | null
    slug: string
    created_at?: string | null
    updated_at?: string | null
    area?: string | null
    blog_post?: Json | null
    blog_images?: Json[] | null
    area_temp1?: string | null
    area_temp2?: string | null
    area_temp3?: string | null
}

export type CityRow = {
    id: string
    name: string
    created_at?: string | null
}

export type LocalAreaRow = {
    id: string
    city_id: string
    area: string
    created_at: string | null
    city_section: string | null
    overview: string | null
    description: string | null
    vibe_and_lifestyle: Json | null
    market_data: Json | null
    infrastructure: Json | null
    local_amenities: Json | null
    buyer_intelligence: Json | null
    narratives: Json | null
    confidence_score: number | null
    last_analyzed: string | null
    data_source: string | null
    search_queries_used: string[] | null
    slug: string | null
    featured_image_url: string | null
    property_count: number | null
    area_images: string[] | null
    blog_content: Json | null
}

export type LocalAreaInsert = {
    id?: string
    city_id: string
    area: string
    created_at?: string | null
    city_section?: string | null
    overview?: string | null
    description?: string | null
    vibe_and_lifestyle?: Json | null
    market_data?: Json | null
    infrastructure?: Json | null
    local_amenities?: Json | null
    buyer_intelligence?: Json | null
    narratives?: Json | null
    confidence_score?: number | null
    last_analyzed?: string | null
    data_source?: string | null
    search_queries_used?: string[] | null
    slug?: string | null
    featured_image_url?: string | null
    property_count?: number | null
    area_images?: string[] | null
    blog_content?: Json | null
}

export type Database = {
    public: {
        Tables: {
            society: {
                Row: SocietyRow
                Insert: SocietyInsert
                Update: Partial<SocietyInsert>
                Relationships: []
            }
            local_areas: {
                Row: LocalAreaRow
                Insert: LocalAreaInsert
                Update: Partial<LocalAreaInsert>
                Relationships: []
            }
            cities: {
                Row: CityRow
                Insert: { id?: string; name: string; created_at?: string | null }
                Update: { id?: string; name?: string; created_at?: string | null }
                Relationships: []
            }
        }
        Views: Record<string, never>
        Functions: Record<string, never>
        Enums: Record<string, never>
        CompositeTypes: Record<string, never>
    }
}
