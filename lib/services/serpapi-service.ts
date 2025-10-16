/**
 * SerpAPI Service - Google Images Integration
 *
 * Fetches property images using SerpAPI's Google Images API
 * Free tier: 100 searches/month
 * Paid: $50/month for 5,000 searches
 */

export interface PropertyImage {
    thumbnail: string;
    original: string;
    title: string;
    source: string;
    link: string;
}

/**
 * Fetch property images from Google Images via SerpAPI
 *
 * @param query - Property search query (e.g., "Embassy Lake Terraces Bangalore")
 * @param count - Number of images to fetch (default: 8)
 * @returns Array of PropertyImage objects
 */
export async function fetchPropertyImages(
    query: string,
    count: number = 8
): Promise<PropertyImage[]> {
    const apiKey = process.env.SERPAPI_KEY;

    if (!apiKey) {
        console.warn('⚠️ SERPAPI_KEY not configured - skipping image fetch');
        return [];
    }

    try {
        // Enhance query to get both interior and exterior photos
        const enhancedQuery = `${query} property apartment interior exterior photos bangalore`;

        const url = new URL('https://serpapi.com/search.json');
        url.searchParams.append('engine', 'google_images');
        url.searchParams.append('q', enhancedQuery);
        url.searchParams.append('num', count.toString());
        url.searchParams.append('api_key', apiKey);
        url.searchParams.append('hl', 'en'); // English results
        url.searchParams.append('gl', 'in'); // India-specific results
        url.searchParams.append('image_type', 'photo'); // Only photos, no clipart

        console.log('🖼️ Fetching property images from SerpAPI...');
        console.log('📸 Query:', enhancedQuery);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`SerpAPI error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.images_results || data.images_results.length === 0) {
            console.log('⚠️ No images found for query:', query);
            return [];
        }

        // Map to our PropertyImage interface
        const images: PropertyImage[] = data.images_results
            .slice(0, count)
            .filter((img: any) => img.thumbnail && img.original) // Only valid images
            .map((img: any) => ({
                thumbnail: img.thumbnail,
                original: img.original,
                title: img.title || 'Property Image',
                source: img.source || 'Unknown',
                link: img.link || ''
            }));

        console.log(`✅ Fetched ${images.length} property images`);
        return images;

    } catch (error) {
        console.error('❌ Error fetching images from SerpAPI:', error);
        return [];
    }
}

/**
 * Fetch area images from Google Images via SerpAPI
 *
 * @param areaName - Area name (e.g., "Whitefield")
 * @param cityName - City name (e.g., "Bangalore")
 * @param count - Number of images to fetch (default: 8)
 * @returns Array of PropertyImage objects
 */
export async function fetchAreaImages(
    areaName: string,
    cityName: string,
    count: number = 8
): Promise<PropertyImage[]> {
    const apiKey = process.env.SERPAPI_KEY;

    if (!apiKey) {
        console.warn('⚠️ SERPAPI_KEY not configured - skipping area image fetch');
        return [];
    }

    try {
        // Enhance query for area/neighborhood photos
        const enhancedQuery = `${areaName} ${cityName} neighborhood locality area photos india`;

        const url = new URL('https://serpapi.com/search.json');
        url.searchParams.append('engine', 'google_images');
        url.searchParams.append('q', enhancedQuery);
        url.searchParams.append('num', count.toString());
        url.searchParams.append('api_key', apiKey);
        url.searchParams.append('hl', 'en'); // English results
        url.searchParams.append('gl', 'in'); // India-specific results
        url.searchParams.append('image_type', 'photo'); // Only photos, no clipart

        console.log('🖼️ Fetching area images from SerpAPI...');
        console.log('📸 Query:', enhancedQuery);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`SerpAPI error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.images_results || data.images_results.length === 0) {
            console.log('⚠️ No area images found for query:', enhancedQuery);
            return [];
        }

        // Map to our PropertyImage interface
        const images: PropertyImage[] = data.images_results
            .slice(0, count)
            .filter((img: any) => img.thumbnail && img.original) // Only valid images
            .map((img: any) => ({
                thumbnail: img.thumbnail,
                original: img.original,
                title: img.title || `${areaName} Area Image`,
                source: img.source || 'Unknown',
                link: img.link || ''
            }));

        console.log(`✅ Fetched ${images.length} area images`);
        return images;

    } catch (error) {
        console.error('❌ Error fetching area images from SerpAPI:', error);
        return [];
    }
}

/**
 * Fetch specific images based on custom search query (for blog sections)
 *
 * @param searchQuery - Specific search phrase (e.g., "Trinity Metro Station Bangalore")
 * @param count - Number of images to fetch (default: 1)
 * @returns Array of PropertyImage objects
 */
export async function fetchSpecificImages(
    searchQuery: string,
    count: number = 1
): Promise<PropertyImage[]> {
    const apiKey = process.env.SERPAPI_KEY;

    if (!apiKey) {
        console.warn('⚠️ SERPAPI_KEY not configured - skipping specific image fetch');
        return [];
    }

    try {
        const url = new URL('https://serpapi.com/search.json');
        url.searchParams.append('engine', 'google_images');
        url.searchParams.append('q', searchQuery); // Use query as-is (AI-generated, already specific)
        url.searchParams.append('num', Math.min(count * 3, 10).toString()); // Fetch extra to filter for quality
        url.searchParams.append('api_key', apiKey);
        url.searchParams.append('hl', 'en');
        url.searchParams.append('gl', 'in');
        url.searchParams.append('image_type', 'photo');
        url.searchParams.append('image_size', 'large'); // Only large, high-quality images
        url.searchParams.append('safe', 'active'); // Filter inappropriate content

        console.log(`🖼️ Fetching high-quality images: "${searchQuery}"`);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`SerpAPI error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.images_results || data.images_results.length === 0) {
            console.log(`⚠️ No images found for: "${searchQuery}"`);
            return [];
        }

        // Filter and score images by quality indicators
        const scoredImages = data.images_results
            .filter((img: any) => {
                // Basic validation
                if (!img.thumbnail || !img.original) return false;

                // Filter out very small images (likely low quality)
                const hasGoodSize = !img.original_width || img.original_width >= 800;

                // Filter out images from suspicious sources
                const suspiciousSources = ['pinterest', 'facebook', 'instagram', 'twitter'];
                const isSuspicious = suspiciousSources.some(s =>
                    img.source?.toLowerCase().includes(s) ||
                    img.link?.toLowerCase().includes(s)
                );

                return hasGoodSize && !isSuspicious;
            })
            .map((img: any) => {
                let score = 0;

                // Prefer images from real estate, news, or official sources
                const goodSources = ['99acres', 'magicbricks', 'housing.com', 'wikipedia', 'official', 'government'];
                if (goodSources.some(s => img.source?.toLowerCase().includes(s) || img.link?.toLowerCase().includes(s))) {
                    score += 3;
                }

                // Prefer larger images
                if (img.original_width >= 1200) score += 2;
                else if (img.original_width >= 800) score += 1;

                // Prefer images with descriptive titles
                if (img.title && img.title.length > 20) score += 1;

                return { img, score };
            })
            .sort((a, b) => b.score - a.score) // Sort by quality score
            .slice(0, count) // Take top N
            .map(({ img }) => ({
                thumbnail: img.thumbnail,
                original: img.original,
                title: img.title || searchQuery,
                source: img.source || 'Unknown',
                link: img.link || ''
            }));

        console.log(`✅ Found ${scoredImages.length} high-quality image(s) (from ${data.images_results.length} candidates)`);
        return scoredImages;

    } catch (error) {
        console.error(`❌ Error fetching images for "${searchQuery}":`, error);
        return [];
    }
}

/**
 * Get SerpAPI account info (for debugging/monitoring)
 */
export async function getSerpAPIAccountInfo(): Promise<any> {
    const apiKey = process.env.SERPAPI_KEY;

    if (!apiKey) {
        return { error: 'No API key configured' };
    }

    try {
        const response = await fetch(`https://serpapi.com/account.json?api_key=${apiKey}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching SerpAPI account info:', error);
        return { error: String(error) };
    }
}