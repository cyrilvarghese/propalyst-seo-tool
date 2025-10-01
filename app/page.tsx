import { RealEstateSearch } from "@/components/home/real-estate-search"

export default function Home() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header Section */}
            <div className="flex flex-col items-center justify-center pt-20 pb-12">
                <div className="text-center mb-12">
                    <h1 className="text-6xl font-bold text-gray-900 mb-4">
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Propalyst
                        </span>
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Find comprehensive real estate information across the web.
                        Search for properties, developers, and societies in one place.
                    </p>
                </div>

                {/* Search Component */}
                <RealEstateSearch />
            </div>
        </main>
    )
}