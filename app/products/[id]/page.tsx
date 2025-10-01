// This is similar to Svelte's [id]/+page.svelte
export default function ProductPage({ params }: { params: { id: string } }) {
    return (
        <div className="p-24">
            <h1 className="text-4xl font-bold mb-4">Product {params.id}</h1>
            <p className="text-lg text-gray-600">
                This page uses dynamic routing - the [id] folder name becomes a parameter
            </p>
        </div>
    )
}
