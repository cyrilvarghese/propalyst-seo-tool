'use client'  // This is needed to use searchParams hooks

import { useSearchParams } from 'next/navigation'

export default function ProductDetailsPage() {
    // This is similar to Svelte's $page.url.searchParams
    const searchParams = useSearchParams()

    const id = searchParams.get('id')
    const category = searchParams.get('category')

    return (
        <div className="p-24">
            <h1 className="text-4xl font-bold mb-4">Product Details</h1>
            <div className="space-y-2">
                <p className="text-lg">Product ID: {id}</p>
                <p className="text-lg">Category: {category}</p>
            </div>
        </div>
    )
}

