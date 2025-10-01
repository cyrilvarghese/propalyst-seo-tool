'use client'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel"
import {
    ExternalLink,
    MapPin,
    Building2,
    Users,
    TrendingUp,
    Home,
    Car,
    Heart,
    Globe,
    Star,
    ChevronDown,
    ChevronRight,
    Briefcase,
    GraduationCap,
    Hospital,
    ShoppingBag,
    Shield,
    Dumbbell,
    Baby,
    Waves,
    Calendar,
    Award,
    TrendingDown,
    RefreshCw
} from "lucide-react"
import { IntelligentPropertyResult } from '@/lib/types/property-intelligence'
import { useState } from 'react'
import { SourcesDialog } from './sources-dialog'
import Image from 'next/image'

interface UnifiedPropertyCardProps {
    property: IntelligentPropertyResult
    onRefresh?: () => void
    isRefreshing?: boolean
}

/**
 * Enhanced Unified Property Card Component
 *
 * **Next.js Component Teaching Point:**
 * This demonstrates a comprehensive data display component that:
 * - Uses shadcn/ui primitives (Card, Accordion, Tabs, Badge)
 * - Shows ALL available data from JSON (no information loss)
 * - Progressive disclosure pattern (important info visible, details collapsible)
 * - Client-side interactivity with useState for UI state
 *
 * **Design Pattern:**
 * - Hero section: Most critical info (price, location, badges)
 * - Specifications grid: Key stats at a glance
 * - Accordion sections: Rich narratives and detailed data
 * - Tabs for amenities: Organized by category
 * - Source analyses: Collapsible for power users
 */
export function UnifiedPropertyCard({ property, onRefresh, isRefreshing }: UnifiedPropertyCardProps) {
    const [showSources, setShowSources] = useState(false)
    const [showSourcesDialog, setShowSourcesDialog] = useState(false)
    const [showImageLightbox, setShowImageLightbox] = useState(false)
    const [lightboxImageIndex, setLightboxImageIndex] = useState(0)

    const getConfidenceColor = (score: number) => {
        if (score >= 80) return 'bg-green-100 text-green-800 border-green-300'
        if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }

    const getCategoryColor = (category: string) => {
        switch (category.toLowerCase()) {
            case 'luxury': return 'bg-purple-100 text-purple-800 border-purple-300'
            case 'premium': return 'bg-blue-100 text-blue-800 border-blue-300'
            default: return 'bg-gray-100 text-gray-800 border-gray-300'
        }
    }

    const getStatusColor = (status: string) => {
        const statusLower = status.toLowerCase()
        if (statusLower.includes('ready') || statusLower.includes('completed')) {
            return 'bg-green-100 text-green-800 border-green-300'
        }
        if (statusLower.includes('construction')) {
            return 'bg-blue-100 text-blue-800 border-blue-300'
        }
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }

    const hasSourceAnalyses = property.sourceAnalyses && property.sourceAnalyses.length > 0
    const hasSourceCitations = property.sourceCitations && property.sourceCitations.length > 0
    const hasPropertyImages = property.propertyImages && property.propertyImages.length > 0

    // Count total amenities across all categories
    const totalAmenities =
        property.community.familyAmenities.length +
        property.community.recreationalFacilities.length +
        property.community.clubhouseFeatures.length +
        property.community.sportsAndFitness.length +
        property.community.childrensFacilities.length +
        property.community.securityFeatures.length

    return (
        <Card className="w-full">
            {/* Hero Section */}
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <CardTitle className="text-3xl mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            {property.title}
                        </CardTitle>

                        {/* Price - Most Important Info */}
                        <div className="mb-4">
                            <div className="text-sm text-gray-600 mb-1">Price Range</div>
                            <div className="text-3xl font-bold text-green-600">
                                {property.specifications.priceRange || 'Price on request'}
                            </div>
                        </div>

                        {/* Key Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            <Badge className={`${getConfidenceColor(property.confidenceScore)} border font-semibold`}>
                                <Star className="w-3 h-3 mr-1" />
                                {property.confidenceScore}% Confidence
                            </Badge>

                            {property.market.propertyCategory && (
                                <Badge className={`${getCategoryColor(property.market.propertyCategory)} border font-semibold`}>
                                    <Award className="w-3 h-3 mr-1" />
                                    {property.market.propertyCategory}
                                </Badge>
                            )}

                            {property.market.projectStatus && (
                                <Badge className={`${getStatusColor(property.market.projectStatus)} border font-semibold`}>
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {property.market.projectStatus}
                                </Badge>
                            )}

                            {property.location.workProximity.proximityScore > 0 && (
                                <Badge variant="outline" className="font-semibold">
                                    <Car className="w-3 h-3 mr-1" />
                                    Work Proximity: {property.location.workProximity.proximityScore}/10
                                </Badge>
                            )}

                            {hasSourceAnalyses && (
                                <Badge variant="outline" className="bg-blue-50 font-semibold">
                                    {property.sourceAnalyses?.length} sources merged
                                </Badge>
                            )}
                        </div>

                        {/* Description */}
                        <CardDescription className="text-base leading-relaxed">
                            {property.description}
                        </CardDescription>
                    </div>

                    <div className="flex gap-2 ml-4">
                        {onRefresh && (
                            <Button
                                onClick={onRefresh}
                                variant="outline"
                                size="lg"
                                disabled={isRefreshing}
                                title="Refresh to get latest property information"
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                                {isRefreshing ? 'Refreshing...' : 'Refresh'}
                            </Button>
                        )}
                        <Button
                            onClick={() => {
                                if (hasSourceCitations) {
                                    setShowSourcesDialog(true)
                                } else {
                                    window.open(property.sourceUrl, '_blank')
                                }
                            }}
                            variant="outline"
                            size="lg"
                        >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            {hasSourceCitations ? `View Sources (${property.sourceCitations!.length})` : 'View Source'}
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
                {/* Property Images Carousel */}
                {hasPropertyImages && (
                    <div className="mb-6">
                        <Carousel className="w-full">
                            <CarouselContent>
                                {property.propertyImages!.map((image, index) => (
                                    <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                                        <div className="p-1">
                                            <div
                                                className="relative aspect-video w-full overflow-hidden rounded-lg border bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                                                onClick={() => {
                                                    setLightboxImageIndex(index);
                                                    setShowImageLightbox(true);
                                                }}
                                            >
                                                <Image
                                                    src={image.thumbnail}
                                                    alt={image.title}
                                                    fill
                                                    className="object-cover"
                                                    unoptimized // SerpAPI images are external
                                                />
                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                                    <p className="text-white text-xs truncate">{image.title}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            <CarouselPrevious className="left-2" />
                            <CarouselNext className="right-2" />
                        </Carousel>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            {property.propertyImages!.length} property photos • Click to enlarge
                        </p>
                    </div>
                )}

                {/* Quick Stats Grid - Always Visible */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg border">
                        <div className="text-sm text-gray-600 mb-1">Configurations</div>
                        <div className="text-lg font-bold text-gray-900">
                            {property.specifications.configurations.join(', ') || 'Various'}
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border">
                        <div className="text-sm text-gray-600 mb-1">Area Range</div>
                        <div className="text-lg font-bold text-gray-900">
                            {property.specifications.areaRange || 'N/A'}
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border">
                        <div className="text-sm text-gray-600 mb-1">Developer</div>
                        <div className="text-lg font-bold text-blue-700">
                            {property.market.developerName}
                        </div>
                    </div>
                </div>

                {/* Additional Stats Row */}
                <div className="grid grid-cols-4 gap-4">
                    {property.specifications.totalUnits && (
                        <div className="p-3 bg-white rounded-lg border text-center">
                            <div className="text-2xl font-bold text-purple-600">{property.specifications.totalUnits}</div>
                            <div className="text-xs text-gray-600">Total Units</div>
                        </div>
                    )}
                    {property.specifications.totalFloors && (
                        <div className="p-3 bg-white rounded-lg border text-center">
                            <div className="text-2xl font-bold text-blue-600">{property.specifications.totalFloors}</div>
                            <div className="text-xs text-gray-600">Floors</div>
                        </div>
                    )}
                    {totalAmenities > 0 && (
                        <div className="p-3 bg-white rounded-lg border text-center">
                            <div className="text-2xl font-bold text-green-600">{totalAmenities}+</div>
                            <div className="text-xs text-gray-600">Amenities</div>
                        </div>
                    )}
                    {property.market.completionYear && (
                        <div className="p-3 bg-white rounded-lg border text-center">
                            <div className="text-2xl font-bold text-orange-600">{property.market.completionYear}</div>
                            <div className="text-xs text-gray-600">Year Built</div>
                        </div>
                    )}
                </div>

                <Separator />

                {/* Detailed Information - Accordion Sections */}
                <Accordion type="multiple" className="w-full">

                    {/* Project Overview */}
                    {property.narratives.projectOverview && (
                        <AccordionItem value="overview">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-blue-600" />
                                    <span className="font-semibold text-lg">Project Overview</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-4 pt-2">
                                    <p className="text-gray-700 leading-relaxed text-base">
                                        {property.narratives.projectOverview}
                                    </p>

                                    {/* Project Details Grid */}
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                                        <div>
                                            <div className="text-sm text-gray-600 mb-1">Developer</div>
                                            <div className="text-base font-semibold text-blue-700">
                                                {property.market.developerName}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-600 mb-1">Property Type</div>
                                            <div className="text-base font-semibold text-gray-900">
                                                {property.specifications.propertyType}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-600 mb-1">Project Status</div>
                                            <div className="text-base font-semibold text-green-700">
                                                {property.market.projectStatus}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-600 mb-1">Completion Year</div>
                                            <div className="text-base font-semibold text-gray-900">
                                                {property.market.completionYear || 'N/A'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Investment Potential */}
                                    {property.market.investmentPotential && (
                                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                <TrendingUp className="w-4 h-4 text-green-600" />
                                                <span className="font-semibold text-green-900">Investment Potential</span>
                                            </div>
                                            <p className="text-sm text-green-800 leading-relaxed">
                                                {property.market.investmentPotential}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )}

                    {/* Location & Connectivity */}
                    <AccordionItem value="location">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-red-600" />
                                <span className="font-semibold text-lg">Location & Connectivity</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-4 pt-2">
                                {/* Location Details */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <div className="text-xs text-gray-600 mb-1">Neighborhood</div>
                                        <div className="text-sm font-semibold text-gray-900">
                                            {property.location.neighborhood}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <div className="text-xs text-gray-600 mb-1">Area</div>
                                        <div className="text-sm font-semibold text-gray-900">
                                            {property.location.area}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <div className="text-xs text-gray-600 mb-1">City</div>
                                        <div className="text-sm font-semibold text-gray-900">
                                            {property.location.city}
                                        </div>
                                    </div>
                                </div>

                                {/* Connectivity Narrative */}
                                {property.narratives.connectivityAnalysis && (
                                    <p className="text-gray-700 leading-relaxed text-base p-4 bg-blue-50 rounded-lg">
                                        {property.narratives.connectivityAnalysis}
                                    </p>
                                )}

                                {/* Work Proximity */}
                                {property.location.workProximity.businessHubs.length > 0 && (
                                    <div className="p-4 bg-white border rounded-lg">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Briefcase className="w-5 h-5 text-blue-600" />
                                            <span className="font-semibold text-gray-900">Work Proximity</span>
                                            <Badge variant="outline" className="ml-auto">
                                                Score: {property.location.workProximity.proximityScore}/10
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            {property.location.workProximity.businessHubs.length > 0 && (
                                                <div>
                                                    <div className="text-sm font-medium text-gray-700 mb-2">Business Hubs</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {property.location.workProximity.businessHubs.map((hub, i) => (
                                                            <Badge key={i} variant="secondary" className="text-xs">{hub}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {property.location.workProximity.techParks.length > 0 && (
                                                <div>
                                                    <div className="text-sm font-medium text-gray-700 mb-2">Tech Parks</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {property.location.workProximity.techParks.map((park, i) => (
                                                            <Badge key={i} variant="secondary" className="text-xs">{park}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {property.location.workProximity.commuteAnalysis && (
                                            <p className="text-sm text-gray-600 mt-3 italic">
                                                {property.location.workProximity.commuteAnalysis}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Transportation */}
                                {property.location.transportationAccess.length > 0 && (
                                    <div className="p-4 bg-white border rounded-lg">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Car className="w-5 h-5 text-green-600" />
                                            <span className="font-semibold text-gray-900">Transportation Access</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {property.location.transportationAccess.map((transport, i) => (
                                                <Badge key={i} variant="outline" className="text-xs">
                                                    {transport}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Neighborhood & Amenities */}
                    {property.narratives.neighborhoodDescription && (
                        <AccordionItem value="neighborhood">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-2">
                                    <ShoppingBag className="w-5 h-5 text-orange-600" />
                                    <span className="font-semibold text-lg">Neighborhood & Amenities</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-4 pt-2">
                                    <p className="text-gray-700 leading-relaxed text-base">
                                        {property.narratives.neighborhoodDescription}
                                    </p>

                                    <div className="grid grid-cols-3 gap-4">
                                        {/* Nearby Amenities */}
                                        {property.location.nearbyAmenities.length > 0 && (
                                            <div className="p-4 bg-white border rounded-lg">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <ShoppingBag className="w-4 h-4 text-orange-600" />
                                                    <span className="font-semibold text-sm">Nearby Places</span>
                                                </div>
                                                <div className="space-y-1">
                                                    {property.location.nearbyAmenities.map((amenity, i) => (
                                                        <Badge key={i} variant="secondary" className="text-xs mr-1 mb-1">
                                                            {amenity}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Educational Institutions */}
                                        {property.location.educationalInstitutions.length > 0 && (
                                            <div className="p-4 bg-white border rounded-lg">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <GraduationCap className="w-4 h-4 text-blue-600" />
                                                    <span className="font-semibold text-sm">Schools</span>
                                                </div>
                                                <div className="space-y-1">
                                                    {property.location.educationalInstitutions.map((school, i) => (
                                                        <Badge key={i} variant="secondary" className="text-xs mr-1 mb-1">
                                                            {school}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Healthcare */}
                                        {property.location.healthcareFacilities.length > 0 && (
                                            <div className="p-4 bg-white border rounded-lg">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Hospital className="w-4 h-4 text-red-600" />
                                                    <span className="font-semibold text-sm">Healthcare</span>
                                                </div>
                                                <div className="space-y-1">
                                                    {property.location.healthcareFacilities.map((facility, i) => (
                                                        <Badge key={i} variant="secondary" className="text-xs mr-1 mb-1">
                                                            {facility}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )}

                    {/* Property Positioning */}
                    {property.narratives.propertyPositioning && (
                        <AccordionItem value="positioning">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-2">
                                    <Star className="w-5 h-5 text-yellow-600" />
                                    <span className="font-semibold text-lg">Property Positioning & Market</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-4 pt-2">
                                    <p className="text-gray-700 leading-relaxed text-base">
                                        {property.narratives.propertyPositioning}
                                    </p>

                                    {/* Target Demographics */}
                                    {property.market.targetDemographic.length > 0 && (
                                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Users className="w-4 h-4 text-purple-600" />
                                                <span className="font-semibold text-purple-900">Target Demographics</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {property.market.targetDemographic.map((demo, i) => (
                                                    <Badge key={i} className="bg-purple-100 text-purple-800 border-purple-300">
                                                        {demo}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )}

                    {/* Community & Amenities - COMPREHENSIVE */}
                    {totalAmenities > 0 && (
                        <AccordionItem value="amenities">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-2">
                                    <Home className="w-5 h-5 text-green-600" />
                                    <span className="font-semibold text-lg">Community & Amenities</span>
                                    <Badge variant="outline" className="ml-2">{totalAmenities}+ Features</Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <Tabs defaultValue="family" className="w-full pt-2">
                                    <TabsList className="grid w-full grid-cols-6">
                                        {property.community.familyAmenities.length > 0 && (
                                            <TabsTrigger value="family">
                                                <Heart className="w-4 h-4 mr-1" />
                                                Family
                                            </TabsTrigger>
                                        )}
                                        {property.community.recreationalFacilities.length > 0 && (
                                            <TabsTrigger value="recreation">
                                                <Waves className="w-4 h-4 mr-1" />
                                                Recreation
                                            </TabsTrigger>
                                        )}
                                        {property.community.sportsAndFitness.length > 0 && (
                                            <TabsTrigger value="sports">
                                                <Dumbbell className="w-4 h-4 mr-1" />
                                                Sports
                                            </TabsTrigger>
                                        )}
                                        {property.community.childrensFacilities.length > 0 && (
                                            <TabsTrigger value="kids">
                                                <Baby className="w-4 h-4 mr-1" />
                                                Kids
                                            </TabsTrigger>
                                        )}
                                        {property.community.clubhouseFeatures.length > 0 && (
                                            <TabsTrigger value="clubhouse">
                                                <Building2 className="w-4 h-4 mr-1" />
                                                Clubhouse
                                            </TabsTrigger>
                                        )}
                                        {property.community.securityFeatures.length > 0 && (
                                            <TabsTrigger value="security">
                                                <Shield className="w-4 h-4 mr-1" />
                                                Security
                                            </TabsTrigger>
                                        )}
                                    </TabsList>

                                    {property.community.familyAmenities.length > 0 && (
                                        <TabsContent value="family" className="space-y-2">
                                            <div className="p-4 bg-pink-50 rounded-lg">
                                                <h4 className="font-semibold text-pink-900 mb-3 flex items-center gap-2">
                                                    <Heart className="w-4 h-4" />
                                                    Family Amenities ({property.community.familyAmenities.length})
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {property.community.familyAmenities.map((amenity, i) => (
                                                        <Badge key={i} variant="outline" className="text-xs">
                                                            {amenity}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </TabsContent>
                                    )}

                                    {property.community.recreationalFacilities.length > 0 && (
                                        <TabsContent value="recreation" className="space-y-2">
                                            <div className="p-4 bg-blue-50 rounded-lg">
                                                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                                    <Waves className="w-4 h-4" />
                                                    Recreational Facilities ({property.community.recreationalFacilities.length})
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {property.community.recreationalFacilities.map((facility, i) => (
                                                        <Badge key={i} variant="outline" className="text-xs">
                                                            {facility}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </TabsContent>
                                    )}

                                    {property.community.sportsAndFitness.length > 0 && (
                                        <TabsContent value="sports" className="space-y-2">
                                            <div className="p-4 bg-green-50 rounded-lg">
                                                <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                                                    <Dumbbell className="w-4 h-4" />
                                                    Sports & Fitness ({property.community.sportsAndFitness.length})
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {property.community.sportsAndFitness.map((facility, i) => (
                                                        <Badge key={i} variant="outline" className="text-xs">
                                                            {facility}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </TabsContent>
                                    )}

                                    {property.community.childrensFacilities.length > 0 && (
                                        <TabsContent value="kids" className="space-y-2">
                                            <div className="p-4 bg-yellow-50 rounded-lg">
                                                <h4 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                                                    <Baby className="w-4 h-4" />
                                                    Children's Facilities ({property.community.childrensFacilities.length})
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {property.community.childrensFacilities.map((facility, i) => (
                                                        <Badge key={i} variant="outline" className="text-xs">
                                                            {facility}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </TabsContent>
                                    )}

                                    {property.community.clubhouseFeatures.length > 0 && (
                                        <TabsContent value="clubhouse" className="space-y-2">
                                            <div className="p-4 bg-purple-50 rounded-lg">
                                                <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                                                    <Building2 className="w-4 h-4" />
                                                    Clubhouse Features ({property.community.clubhouseFeatures.length})
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {property.community.clubhouseFeatures.map((feature, i) => (
                                                        <Badge key={i} variant="outline" className="text-xs">
                                                            {feature}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </TabsContent>
                                    )}

                                    {property.community.securityFeatures.length > 0 && (
                                        <TabsContent value="security" className="space-y-2">
                                            <div className="p-4 bg-gray-50 rounded-lg">
                                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                    <Shield className="w-4 h-4" />
                                                    Security Features ({property.community.securityFeatures.length})
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {property.community.securityFeatures.map((feature, i) => (
                                                        <Badge key={i} variant="outline" className="text-xs">
                                                            {feature}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </TabsContent>
                                    )}
                                </Tabs>
                            </AccordionContent>
                        </AccordionItem>
                    )}

                    {/* Why Families Love It */}
                    {property.narratives.familyAppeal && (
                        <AccordionItem value="family">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-2">
                                    <Heart className="w-5 h-5 text-pink-600" />
                                    <span className="font-semibold text-lg">Why Families Love It</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <p className="text-gray-700 leading-relaxed text-base pt-2">
                                    {property.narratives.familyAppeal}
                                </p>
                            </AccordionContent>
                        </AccordionItem>
                    )}

                    {/* Expatriate Population */}
                    {property.narratives.expatriatePopulation && (
                        <AccordionItem value="expat">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-indigo-600" />
                                    <span className="font-semibold text-lg">Expatriate Community</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <p className="text-gray-700 leading-relaxed text-base pt-2">
                                    {property.narratives.expatriatePopulation}
                                </p>
                            </AccordionContent>
                        </AccordionItem>
                    )}

                    {/* Entertainment & Lifestyle */}
                    {property.narratives.entertainmentLifestyle && (
                        <AccordionItem value="lifestyle">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-purple-600" />
                                    <span className="font-semibold text-lg">Entertainment & Lifestyle</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <p className="text-gray-700 leading-relaxed text-base pt-2">
                                    {property.narratives.entertainmentLifestyle}
                                </p>
                            </AccordionContent>
                        </AccordionItem>
                    )}

                    {/* Online Presence & Buzz */}
                    {property.narratives.onlinePresenceBuzz && (
                        <AccordionItem value="buzz">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-orange-600" />
                                    <span className="font-semibold text-lg">Online Presence & Reviews</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-3 pt-2">
                                    <p className="text-gray-700 leading-relaxed text-base">
                                        {property.narratives.onlinePresenceBuzz}
                                    </p>

                                    {property.market.onlinePresence && (
                                        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                                            <strong>Marketing:</strong> {property.market.onlinePresence}
                                        </div>
                                    )}

                                    {property.market.communityBuzz && (
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                                            <strong>Community Feedback:</strong> {property.market.communityBuzz}
                                        </div>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )}

                    {/* Celebrity & Notable Residents */}
                    {property.narratives.celebrityResidents &&
                        property.narratives.celebrityResidents.toLowerCase() !== 'not publicly available' &&
                        property.narratives.celebrityResidents.toLowerCase() !== 'not available' && (
                            <AccordionItem value="celebrity">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-2">
                                        <Award className="w-5 h-5 text-amber-600" />
                                        <span className="font-semibold text-lg">Notable Residents</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <p className="text-gray-700 leading-relaxed text-base pt-2">
                                        {property.narratives.celebrityResidents}
                                    </p>
                                </AccordionContent>
                            </AccordionItem>
                        )}
                </Accordion>

                {/* Individual Source Analyses - Collapsible */}
                {hasSourceAnalyses && (
                    <>
                        <Separator />
                        <Collapsible open={showSources} onOpenChange={setShowSources}>
                            <CollapsibleTrigger asChild>
                                <Button variant="outline" className="w-full">
                                    {showSources ? (
                                        <ChevronDown className="w-4 h-4 mr-2" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4 mr-2" />
                                    )}
                                    View {property.sourceAnalyses!.length} Individual Source Analyses
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-4 space-y-4">
                                {property.sourceAnalyses!.map((source, index) => (
                                    <Card key={source.id} className="bg-gray-50">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <CardTitle className="text-sm">
                                                        Source {index + 1}: {source.sourceName}
                                                    </CardTitle>
                                                    <CardDescription className="text-xs mt-1">
                                                        {source.sourceUrl}
                                                    </CardDescription>
                                                </div>
                                                <Badge className={`${getConfidenceColor(source.confidenceScore)} border text-xs`}>
                                                    {source.confidenceScore}%
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="text-sm space-y-2">
                                            <div>
                                                <span className="font-medium">Price:</span> {source.specifications.priceRange || 'N/A'}
                                            </div>
                                            <div>
                                                <span className="font-medium">Configurations:</span> {source.specifications.configurations.join(', ') || 'N/A'}
                                            </div>
                                            <div>
                                                <span className="font-medium">Location:</span> {source.location.area}, {source.location.city}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </CollapsibleContent>
                        </Collapsible>
                    </>
                )}
            </CardContent>

            {/* Sources Dialog */}
            {hasSourceCitations && (
                <SourcesDialog
                    open={showSourcesDialog}
                    onOpenChange={setShowSourcesDialog}
                    sources={property.sourceCitations!}
                    propertyTitle={property.title}
                />
            )}

            {/* Image Lightbox Dialog */}
            {hasPropertyImages && showImageLightbox && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setShowImageLightbox(false)}
                >
                    <div className="relative max-w-5xl max-h-[90vh] w-full">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 text-white hover:bg-white/20"
                            onClick={() => setShowImageLightbox(false)}
                        >
                            ✕
                        </Button>

                        <div className="relative w-full h-[80vh]">
                            <Image
                                src={property.propertyImages![lightboxImageIndex].original}
                                alt={property.propertyImages![lightboxImageIndex].title}
                                fill
                                className="object-contain"
                                unoptimized
                            />
                        </div>

                        <div className="mt-4 text-center text-white">
                            <p className="text-lg font-semibold">
                                {property.propertyImages![lightboxImageIndex].title}
                            </p>
                            <p className="text-sm text-gray-300">
                                Image {lightboxImageIndex + 1} of {property.propertyImages!.length} •
                                Source: {property.propertyImages![lightboxImageIndex].source}
                            </p>
                        </div>

                        {/* Navigation Arrows */}
                        {property.propertyImages!.length > 1 && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxImageIndex((lightboxImageIndex - 1 + property.propertyImages!.length) % property.propertyImages!.length);
                                    }}
                                >
                                    ‹
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxImageIndex((lightboxImageIndex + 1) % property.propertyImages!.length);
                                    }}
                                >
                                    ›
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </Card>
    )
}