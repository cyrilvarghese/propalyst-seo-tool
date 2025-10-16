/**
 * Area Image Service
 * Fetches area images from SerpAPI and uploads to Supabase Storage
 *
 * Storage Structure:
 * - Bucket: area_images (public)
 * - Path: area_images/{area-slug}/image-{i}.jpg
 * - Returns: Array of public URLs
 */

import { supabase } from '@/lib/utils/supabase-client'
import { fetchAreaImages as fetchFromSerpAPI } from '@/lib/services/serpapi-service'

/**
 * Fetch area images from SerpAPI and upload to Supabase Storage
 *
 * @param areaName - Area name (e.g., "Whitefield")
 * @param cityName - City name (e.g., "Bangalore")
 * @param slug - Area slug (e.g., "whitefield-bangalore")
 * @param count - Number of images to fetch (default: 8)
 * @returns Array of public URLs from Supabase Storage
 */
export async function fetchAndUploadAreaImages(
    areaName: string,
    cityName: string,
    slug: string,
    count: number = 8
): Promise<string[]> {
    console.log(`[AreaImages] 🖼️ Starting image fetch for: ${areaName}, ${cityName}`)

    try {
        // Step 1: Check if images already exist in storage
        const { data: existingFiles, error: listError } = await supabase.storage
            .from('area_images')
            .list(slug)

        if (existingFiles && existingFiles.length > 0) {
            console.log(`[AreaImages] ✅ Found ${existingFiles.length} existing images, reusing them`)

            // Return existing image URLs
            const urls = existingFiles.map(file => {
                const { data } = supabase.storage
                    .from('area_images')
                    .getPublicUrl(`${slug}/${file.name}`)
                return data.publicUrl
            })

            return urls
        }

        // Step 2: Fetch images from SerpAPI
        console.log(`[AreaImages] 🔍 Fetching from SerpAPI...`)
        const images = await fetchFromSerpAPI(areaName, cityName, count)

        if (images.length === 0) {
            console.log(`[AreaImages] ⚠️ No images found from SerpAPI`)
            return []
        }

        console.log(`[AreaImages] 📥 Fetched ${images.length} images from SerpAPI`)

        // Step 3: Download and upload each image to Supabase Storage
        const uploadedUrls: string[] = []

        for (let i = 0; i < images.length; i++) {
            const image = images[i]

            try {
                // Download image from original URL
                console.log(`[AreaImages] ⬇️ Downloading image ${i + 1}/${images.length}...`)
                const response = await fetch(image.original)

                if (!response.ok) {
                    console.error(`[AreaImages] ❌ Failed to download image ${i + 1}: ${response.status}`)
                    continue
                }

                const blob = await response.blob()
                const arrayBuffer = await blob.arrayBuffer()
                const buffer = Buffer.from(arrayBuffer)

                // Determine file extension from content type
                const contentType = response.headers.get('content-type') || 'image/jpeg'
                const extension = contentType.includes('png') ? 'png' : 'jpg'
                const fileName = `image-${i + 1}.${extension}`
                const filePath = `${slug}/${fileName}`

                // Upload to Supabase Storage
                console.log(`[AreaImages] ⬆️ Uploading to: ${filePath}`)
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('area_images')
                    .upload(filePath, buffer, {
                        contentType,
                        cacheControl: '3600',
                        upsert: true // Overwrite if exists
                    })

                if (uploadError) {
                    console.error(`[AreaImages] ❌ Upload failed for image ${i + 1}:`, uploadError.message)
                    continue
                }

                // Get public URL
                const { data: urlData } = supabase.storage
                    .from('area_images')
                    .getPublicUrl(filePath)

                uploadedUrls.push(urlData.publicUrl)
                console.log(`[AreaImages] ✅ Uploaded image ${i + 1}/${images.length}`)

                // Rate limiting: 500ms delay between uploads
                if (i < images.length - 1) {
                    await sleep(500)
                }

            } catch (error: any) {
                console.error(`[AreaImages] ❌ Error processing image ${i + 1}:`, error.message)
                continue
            }
        }

        console.log(`[AreaImages] 🎉 Successfully uploaded ${uploadedUrls.length}/${images.length} images`)
        return uploadedUrls

    } catch (error: any) {
        console.error(`[AreaImages] ❌ Fatal error:`, error.message)
        return [] // Non-blocking: Return empty array on failure
    }
}

/**
 * Delete all images for an area
 *
 * @param slug - Area slug
 * @returns Number of images deleted
 */
export async function deleteAreaImages(slug: string): Promise<number> {
    try {
        const { data: files, error: listError } = await supabase.storage
            .from('area_images')
            .list(slug)

        if (listError || !files || files.length === 0) {
            return 0
        }

        const filePaths = files.map(file => `${slug}/${file.name}`)

        const { error: deleteError } = await supabase.storage
            .from('area_images')
            .remove(filePaths)

        if (deleteError) {
            console.error(`[AreaImages] ❌ Failed to delete images:`, deleteError.message)
            return 0
        }

        console.log(`[AreaImages] 🗑️ Deleted ${filePaths.length} images for ${slug}`)
        return filePaths.length

    } catch (error: any) {
        console.error(`[AreaImages] ❌ Error deleting images:`, error.message)
        return 0
    }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}
