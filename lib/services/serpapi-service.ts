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