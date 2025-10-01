import Link from 'next/link'
import { Button } from "@/components/ui/button"

export default function ProductsPage() {
    // Example product data
    const products = [
        { id: '1', name: 'Laptop', category: 'electronics' },
        { id: '2', name: 'Phone', category: 'electronics' },
    ]

    return (
        <div className="p-24">
            <h1 className="text-4xl font-bold mb-8">Products</h1>

            <div className="space-y-6">
                <h2 className="text-2xl font-semibold">1. URL Parameters (Dynamic Routes)</h2>
                <div className="space-y-2">
                    {products.map(product => (
                        <div key={product.id}>
                            <Link
                                href={`/products/${product.id}`}
                                className="text-blue-500 hover:underline"
                            >
                                {product.name} (using path parameter)
                            </Link>
                        </div>
                    ))}
                </div>

                <h2 className="text-2xl font-semibold mt-8">2. Query Parameters</h2>
                <div className="space-y-2">
                    {products.map(product => (
                        <div key={product.id}>
                            <Link
                                href={`/products/details?id=${product.id}&category=${product.category}`}
                                className="text-blue-500 hover:underline"
                            >
                                {product.name} (using query parameters)
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

