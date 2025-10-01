'use client'

import { useState, useEffect } from 'react'

const realEstateImages = [
    {
        url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
        alt: "Modern luxury home exterior",
        quote: "Finding your dream home has never been easier. Let us guide you to the perfect property.",
        author: "Sarah Johnson, Real Estate Agent"
    },
    {
        url: "https://images.unsplash.com/photo-1560184897-ae75f418493e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
        alt: "Beautiful house with garden",
        quote: "Every property tells a story. We help you write your next chapter.",
        author: "Michael Chen, Property Specialist"
    },
    {
        url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
        alt: "Contemporary home interior",
        quote: "Your perfect home is waiting. Let's make your real estate dreams come true.",
        author: "Emma Rodriguez, Broker"
    },
    {
        url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
        alt: "Cozy family home",
        quote: "From starter homes to luxury estates, we have the key to your future.",
        author: "David Thompson, Realtor"
    },
    {
        url: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
        alt: "Modern apartment living",
        quote: "Whether buying, selling, or renting, we're your trusted real estate partner.",
        author: "Lisa Park, Property Manager"
    },
    {
        url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
        alt: "Luxury villa with pool",
        quote: "Discover luxury living at its finest. Your dream estate awaits.",
        author: "Robert Wilson, Luxury Properties"
    },
    {
        url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
        alt: "Modern kitchen interior",
        quote: "The heart of every home starts in the kitchen. Let's find yours.",
        author: "Jennifer Lee, Interior Specialist"
    },
    {
        url: "https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
        alt: "Spacious living room",
        quote: "Create memories in spaces designed for living. Your family deserves the best.",
        author: "Thomas Garcia, Family Homes"
    },
    {
        url: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
        alt: "Contemporary bedroom",
        quote: "Rest and relaxation begin with the perfect bedroom. Sweet dreams start here.",
        author: "Angela Davis, Residential Expert"
    },
    {
        url: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
        alt: "Outdoor patio area",
        quote: "Extend your living space outdoors. Entertainment and relaxation combined.",
        author: "Kevin Martinez, Outdoor Living"
    }
]

export function LoginImageSide() {
    const [currentImage, setCurrentImage] = useState(realEstateImages[0]) // Use first image as default
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
        // Set random image only after hydration
        const randomIndex = Math.floor(Math.random() * realEstateImages.length)
        setCurrentImage(realEstateImages[randomIndex])
    }, [])

    return (
        <div className="relative hidden bg-muted lg:block overflow-hidden">
            <img
                src={currentImage.url}
                alt={currentImage.alt}
                className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
            {/* Multiple overlay effects for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

            {/* Text with backdrop blur for enhanced readability */}
            <div className="absolute bottom-6 left-6 right-6 text-white">
                <div className="backdrop-blur-sm bg-black/20 rounded-lg p-4">
                    <blockquote>
                        <p className="text-lg font-medium drop-shadow-lg">
                            "{currentImage.quote}"
                        </p>
                    </blockquote>
                </div>
            </div>
        </div>
    )
}