export type SocietyNew = {
    id: string
    name: string
    description: string
    specifications: any
    location: any
    community: any
    market: any
    narratives: any
    confidence_score: number
    source_url: string
    source_name: string
    last_analyzed: string
    search_score: number
    source_analyses: any[]
    source_citations: any[]
    property_images: any[]
    stored_at: string
    slug: string
}

export type Database = {
    public: {
        Tables: {
            society_new: {
                Row: SocietyNew
                Insert: SocietyNew
                Update: Partial<SocietyNew>
            }
        }
    }
}
