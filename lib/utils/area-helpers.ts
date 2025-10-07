/**
 * Area Helper Utilities
 * Functions for area data processing, slug generation, and CSV parsing
 */

import { AreaToEnrich } from '@/lib/types/area-intelligence'

/**
 * Generate URL-friendly slug from area name and city
 * Example: "Manyata Tech Park", "Bangalore" → "manyata-tech-park-bangalore"
 *
 * NOTE: This slug is guaranteed to be unique because:
 * - Slug = area + city
 * - Database has unique constraint on (city_id, area)
 * - Therefore: unique (city_id, area) → unique slug ✅
 */
export function generateAreaSlug(area: string, city: string): string {
    const combined = `${area}-${city}`
    return combined
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

/**
 * Parse CSV file and extract area-city pairs
 * Supports formats:
 * 1. area,city (with header)
 * 2. area,city (without header)
 * 3. Just area names (one per line) - requires cityName parameter
 */
export async function parseAreaCSV(
    file: File,
    defaultCity?: string
): Promise<AreaToEnrich[]> {
    const text = await file.text()
    const lines = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)

    if (lines.length === 0) {
        throw new Error('CSV file is empty')
    }

    const areas: AreaToEnrich[] = []

    // Check if first line is a header
    const firstLine = lines[0].toLowerCase()
    const hasHeader = firstLine.includes('area') || firstLine.includes('city')
    const startIndex = hasHeader ? 1 : 0

    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i]

        // Check if line has comma (CSV format)
        if (line.includes(',')) {
            const parts = line.split(',').map(p => p.trim())
            if (parts.length >= 2 && parts[0] && parts[1]) {
                areas.push({
                    area: parts[0],
                    city: parts[1]
                })
            }
        } else if (defaultCity) {
            // Single column - use default city
            areas.push({
                area: line,
                city: defaultCity
            })
        } else {
            // Skip lines that don't have city and no default provided
            console.warn(`Skipping line ${i + 1}: No city provided for "${line}"`)
        }
    }

    if (areas.length === 0) {
        throw new Error('No valid area-city pairs found in CSV')
    }

    return areas
}

/**
 * Parse JSON file with area data
 * Supports formats:
 * 1. Array of strings: ["Area 1", "Area 2"] - requires defaultCity
 * 2. Array of objects: [{"area": "Area 1", "city": "City 1"}]
 */
export async function parseAreaJSON(
    file: File,
    defaultCity?: string
): Promise<AreaToEnrich[]> {
    const text = await file.text()
    const data = JSON.parse(text)

    if (!Array.isArray(data)) {
        throw new Error('JSON must contain an array')
    }

    const areas: AreaToEnrich[] = []

    for (const item of data) {
        if (typeof item === 'string') {
            if (defaultCity) {
                areas.push({ area: item, city: defaultCity })
            } else {
                console.warn(`Skipping "${item}": No city provided`)
            }
        } else if (typeof item === 'object' && item.area) {
            areas.push({
                area: item.area,
                city: item.city || defaultCity || ''
            })
        }
    }

    if (areas.length === 0) {
        throw new Error('No valid area data found in JSON')
    }

    return areas
}

/**
 * Parse TXT file (one area per line)
 * Requires defaultCity parameter
 */
export async function parseAreaTXT(
    file: File,
    defaultCity: string
): Promise<AreaToEnrich[]> {
    const text = await file.text()
    const lines = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)

    if (lines.length === 0) {
        throw new Error('TXT file is empty')
    }

    return lines.map(area => ({
        area,
        city: defaultCity
    }))
}

/**
 * Universal file parser - detects format and parses accordingly
 */
export async function parseAreaFile(
    file: File,
    defaultCity?: string
): Promise<AreaToEnrich[]> {
    const extension = file.name.split('.').pop()?.toLowerCase()

    switch (extension) {
        case 'csv':
            return parseAreaCSV(file, defaultCity)
        case 'json':
            return parseAreaJSON(file, defaultCity)
        case 'txt':
            if (!defaultCity) {
                throw new Error('Default city is required for TXT files')
            }
            return parseAreaTXT(file, defaultCity)
        default:
            throw new Error(`Unsupported file format: ${extension}`)
    }
}

/**
 * Validate area data before processing
 */
export function validateAreaData(areas: AreaToEnrich[]): {
    valid: AreaToEnrich[]
    invalid: { area: string; city: string; reason: string }[]
} {
    const valid: AreaToEnrich[] = []
    const invalid: { area: string; city: string; reason: string }[] = []

    for (const item of areas) {
        if (!item.area || item.area.trim().length === 0) {
            invalid.push({
                area: item.area || '',
                city: item.city || '',
                reason: 'Area name is empty'
            })
            continue
        }

        if (!item.city || item.city.trim().length === 0) {
            invalid.push({
                area: item.area,
                city: item.city || '',
                reason: 'City name is empty'
            })
            continue
        }

        if (item.area.length > 200) {
            invalid.push({
                area: item.area,
                city: item.city,
                reason: 'Area name too long (max 200 characters)'
            })
            continue
        }

        valid.push({
            area: item.area.trim(),
            city: item.city.trim()
        })
    }

    return { valid, invalid }
}

/**
 * Deduplicate areas (case-insensitive)
 */
export function deduplicateAreas(areas: AreaToEnrich[]): AreaToEnrich[] {
    const seen = new Set<string>()
    const deduplicated: AreaToEnrich[] = []

    for (const item of areas) {
        const key = `${item.area.toLowerCase()}_${item.city.toLowerCase()}`
        if (!seen.has(key)) {
            seen.add(key)
            deduplicated.push(item)
        }
    }

    return deduplicated
}

/**
 * Format area name for display
 */
export function formatAreaName(area: string, city: string): string {
    return `${area}, ${city}`
}

/**
 * Extract area and city from formatted string
 */
export function parseFormattedAreaName(formatted: string): {
    area: string
    city: string
} | null {
    const parts = formatted.split(',').map(p => p.trim())
    if (parts.length >= 2) {
        return {
            area: parts[0],
            city: parts[1]
        }
    }
    return null
}
