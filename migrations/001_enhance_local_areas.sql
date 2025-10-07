-- Migration: Enhance local_areas table with AI-powered area intelligence
-- Date: 2025-01-07
-- Description: Add JSONB columns for rich area data (vibe, market, infrastructure, amenities, investment tips)

-- ============================================================================
-- Phase 1: Add new columns to local_areas table
-- ============================================================================

-- Short description (1-2 lines)
ALTER TABLE local_areas
ADD COLUMN IF NOT EXISTS description TEXT;

-- Vibe & Lifestyle data (Q1, Q2)
ALTER TABLE local_areas
ADD COLUMN IF NOT EXISTS vibe_and_lifestyle JSONB;

-- Market data (Q3, Q4, Q5)
ALTER TABLE local_areas
ADD COLUMN IF NOT EXISTS market_data JSONB;

-- Infrastructure & connectivity (Q6, Q7, Q8)
ALTER TABLE local_areas
ADD COLUMN IF NOT EXISTS infrastructure JSONB;

-- Local amenities (Q9, Q10)
ALTER TABLE local_areas
ADD COLUMN IF NOT EXISTS local_amenities JSONB;

-- Buyer intelligence (Q11, Q12, Q13)
ALTER TABLE local_areas
ADD COLUMN IF NOT EXISTS buyer_intelligence JSONB;

-- Rich narratives for display
ALTER TABLE local_areas
ADD COLUMN IF NOT EXISTS narratives JSONB;

-- AI analysis metadata
ALTER TABLE local_areas
ADD COLUMN IF NOT EXISTS confidence_score INTEGER;

ALTER TABLE local_areas
ADD COLUMN IF NOT EXISTS last_analyzed TIMESTAMP WITH TIME ZONE;

ALTER TABLE local_areas
ADD COLUMN IF NOT EXISTS data_source TEXT;

ALTER TABLE local_areas
ADD COLUMN IF NOT EXISTS search_queries_used TEXT[];

-- Display & SEO
ALTER TABLE local_areas
ADD COLUMN IF NOT EXISTS slug TEXT;

ALTER TABLE local_areas
ADD COLUMN IF NOT EXISTS featured_image_url TEXT;

ALTER TABLE local_areas
ADD COLUMN IF NOT EXISTS property_count INTEGER DEFAULT 0;

-- ============================================================================
-- Phase 2: Create indexes for performance
-- ============================================================================

-- Index on slug for fast lookups by URL
CREATE UNIQUE INDEX IF NOT EXISTS idx_local_areas_slug
ON local_areas(slug);

-- Index on last_analyzed to find areas needing refresh
CREATE INDEX IF NOT EXISTS idx_local_areas_last_analyzed
ON local_areas(last_analyzed);

-- Index on confidence_score for filtering quality areas
CREATE INDEX IF NOT EXISTS idx_local_areas_confidence_score
ON local_areas(confidence_score);

-- GIN index on JSONB columns for fast queries
CREATE INDEX IF NOT EXISTS idx_local_areas_vibe_gin
ON local_areas USING GIN (vibe_and_lifestyle);

CREATE INDEX IF NOT EXISTS idx_local_areas_market_gin
ON local_areas USING GIN (market_data);

CREATE INDEX IF NOT EXISTS idx_local_areas_infrastructure_gin
ON local_areas USING GIN (infrastructure);

CREATE INDEX IF NOT EXISTS idx_local_areas_amenities_gin
ON local_areas USING GIN (local_amenities);

-- ============================================================================
-- Phase 3: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN local_areas.description IS 'Short 1-2 line summary of the area';
COMMENT ON COLUMN local_areas.vibe_and_lifestyle IS 'JSONB: unique_vibe, best_suited_for, local_parks, shopping_centers, leisure_spots';
COMMENT ON COLUMN local_areas.market_data IS 'JSONB: avg_price_per_sqft, appreciation_rate, rental_yield, investment_rating';
COMMENT ON COLUMN local_areas.infrastructure IS 'JSONB: water_supply, sewage, commute_times, metro_connectivity, upcoming_projects';
COMMENT ON COLUMN local_areas.local_amenities IS 'JSONB: top_hospitals, top_schools, premium_communities';
COMMENT ON COLUMN local_areas.buyer_intelligence IS 'JSONB: hidden_costs, rtm_vs_uc_recommendation, insider_tips, common_mistakes';
COMMENT ON COLUMN local_areas.narratives IS 'JSONB: Rich text content for each section (vibe_narrative, market_narrative, etc.)';
COMMENT ON COLUMN local_areas.confidence_score IS 'AI confidence score (0-100) based on data completeness';
COMMENT ON COLUMN local_areas.last_analyzed IS 'Timestamp of last AI analysis/enrichment';
COMMENT ON COLUMN local_areas.data_source IS 'AI provider used: claude_websearch or gemini_search';
COMMENT ON COLUMN local_areas.slug IS 'URL-friendly identifier: area-city (e.g., whitefield-bangalore)';
COMMENT ON COLUMN local_areas.property_count IS 'Cached count of societies in this area';

-- ============================================================================
-- Phase 4: Update existing slugs (basic generation for existing records)
-- ============================================================================

-- Generate slugs for existing records that don't have one
-- Format: lowercase, replace spaces with hyphens, remove special characters
UPDATE local_areas
SET slug = LOWER(
    REGEXP_REPLACE(
        REGEXP_REPLACE(area, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
    )
)
WHERE slug IS NULL;

-- ============================================================================
-- Phase 5: Create trigger to auto-update property_count
-- ============================================================================

-- Function to update property_count when societies are added/removed
CREATE OR REPLACE FUNCTION update_area_property_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the property_count for the affected area
    UPDATE local_areas
    SET property_count = (
        SELECT COUNT(*)
        FROM society_new
        WHERE society_new.area = local_areas.id
    )
    WHERE id = COALESCE(NEW.area, OLD.area);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger on society_new table
DROP TRIGGER IF EXISTS trigger_update_area_property_count ON society_new;

CREATE TRIGGER trigger_update_area_property_count
AFTER INSERT OR UPDATE OR DELETE ON society_new
FOR EACH ROW
EXECUTE FUNCTION update_area_property_count();

-- Initial sync of property_count for all areas
UPDATE local_areas
SET property_count = (
    SELECT COUNT(*)
    FROM society_new
    WHERE society_new.area = local_areas.id
);

-- ============================================================================
-- Migration complete!
-- ============================================================================

-- Verify the migration
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'local_areas'
ORDER BY ordinal_position;
