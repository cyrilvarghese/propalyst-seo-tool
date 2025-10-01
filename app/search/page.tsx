import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Search, Building, Globe, TrendingUp } from "lucide-react"

export default function SearchPage() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
            {/* Hero Section */}
            <section className="pt-20 pb-16 px-4">
                <div className="max-w-6xl mx-auto text-center">
                    <h1 className="text-7xl font-bold text-gray-900 mb-6">
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Propalyst
                        </span>
                    </h1>
                    <p className="text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                        The ultimate real estate intelligence platform.
                        Search properties, analyze markets, and discover opportunities across the web.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <Button asChild size="lg" className="text-lg px-8 py-4">
                            <Link href="/">
                                <Search className="mr-2 h-5 w-5" />
                                Start Searching
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-16 px-4 bg-white/50">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
                        Comprehensive Real Estate Intelligence
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center p-6 rounded-lg bg-white shadow-sm border">
                            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                                <Search className="h-8 w-8 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Multi-Source Search</h3>
                            <p className="text-gray-600">
                                Search across multiple real estate websites simultaneously.
                                Find properties from 99acres, MagicBricks, Housing.com, and more.
                            </p>
                        </div>
                        <div className="text-center p-6 rounded-lg bg-white shadow-sm border">
                            <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                                <Building className="h-8 w-8 text-purple-600" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Developer Insights</h3>
                            <p className="text-gray-600">
                                Get comprehensive information about developers and their projects.
                                Track societies, amenities, and project timelines.
                            </p>
                        </div>
                        <div className="text-center p-6 rounded-lg bg-white shadow-sm border">
                            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                                <TrendingUp className="h-8 w-8 text-green-600" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Market Analysis</h3>
                            <p className="text-gray-600">
                                Analyze price trends, compare localities, and make informed decisions
                                with comprehensive market data.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl font-bold text-gray-900 mb-6">
                        Ready to Find Your Perfect Property?
                    </h2>
                    <p className="text-xl text-gray-600 mb-8">
                        Join thousands of users who trust Propalyst for their real estate needs.
                    </p>
                    <Button asChild size="lg" className="text-lg px-12 py-4">
                        <Link href="/">
                            <Globe className="mr-2 h-5 w-5" />
                            Explore Properties
                        </Link>
                    </Button>
                </div>
            </section>
        </main>
    )
}