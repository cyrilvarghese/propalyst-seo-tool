-- Migration: Add area images support to local_areas table
-- Date: 2025-01-07
-- Description: Add area_images column (TEXT[]) to store Supabase Storage URLs

-- ============================================================================
-- Phase 1: Add area_images column
-- ============================================================================

-- Array of image URLs from Supabase Storage
-- Format: area_images/{area-slug}/image-{i}.jpg
ALTER TABLE local_areas
ADD COLUMN IF NOT EXISTS area_images TEXT[];

-- ============================================================================
-- Phase 2: Create indexes for efficient querying
-- ============================================================================

-- Index for filtering areas that have images
CREATE INDEX IF NOT EXISTS idx_local_areas_has_images
ON local_areas ((area_images IS NOT NULL AND array_length(area_images, 1) > 0));

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. Images are stored in Supabase Storage bucket: area_images/
-- 2. Folder structure: area_images/{area-slug}/image-{i}.jpg
-- 3. URLs are public for use in blogs and content
-- 4. Each area can have 0-8 images
-- 5. Use --images-only flag in migration script to backfill existing areas
