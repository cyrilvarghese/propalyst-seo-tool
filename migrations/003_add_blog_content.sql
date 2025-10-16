-- Migration: Add blog_content column to local_areas table
-- Date: 2025-01-16
-- Description: Add JSONB column to store AI-generated blog content with targeted images

-- ============================================================================
-- Phase 1: Add blog_content column
-- ============================================================================

-- JSONB column to store blog content with sections and images
ALTER TABLE local_areas
ADD COLUMN IF NOT EXISTS blog_content JSONB;

-- ============================================================================
-- Phase 2: Create index for efficient querying
-- ============================================================================

-- Index for filtering areas that have blog content
CREATE INDEX IF NOT EXISTS idx_local_areas_has_blog
ON local_areas ((blog_content IS NOT NULL));

-- GIN index for JSONB queries (for searching within blog content)
CREATE INDEX IF NOT EXISTS idx_local_areas_blog_content_gin
ON local_areas USING GIN (blog_content);

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. Blog content is stored as JSONB for flexibility
-- 2. Structure includes: title, sections (with content + images), metadata
-- 3. Each section has its own imageSearchQuery for targeted image fetching
-- 4. Images are fetched from SerpAPI based on AI-generated search queries
-- 5. Use --generate-blogs flag in migration script to populate existing areas
