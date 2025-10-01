'use client'

import { useState } from 'react'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    ChevronDown,
    ChevronRight,
    ExternalLink,
    MapPin,
    Building2,
    Users,
    Car,
    Dumbbell,
    GraduationCap,
    Hospital,
    ShoppingBag,
    Star,
    TrendingUp
} from "lucide-react"
import { IntelligentPropertyResult } from '@/lib/types'

interface PropertyCardProps {
    property: IntelligentPropertyResult
}

interface ExpandableSection {
    id: string
    title: string
    icon: React.ReactNode
    content: React.ReactNode
}

export function PropertyCard({ property }: PropertyCardProps) {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

    const toggleSection = (sectionId: string) => {
        const newExpanded = new Set(expandedSections)
        if (newExpanded.has(sectionId)) {
            newExpanded.delete(sectionId)
        } else {
            newExpanded.add(sectionId)
        }
        setExpandedSections(newExpanded)
    }

    const getConfidenceColor = (score: number) => {
        if (score >= 80) return 'bg-green-100 text-green-800'
        if (score >= 60) return 'bg-yellow-100 text-yellow-800'
        return 'bg-gray-100 text-gray-800'
    }

    const getCategoryColor = (category: string) => {
        switch (category.toLowerCase()) {
            case 'luxury': return 'bg-purple-100 text-purple-800'
            case 'premium': return 'bg-blue-100 text-blue-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const handleViewProperty = () => {
        if (property.sourceUrl) {
            window.open(property.sourceUrl, '_blank', 'noopener,noreferrer')
        }
    }

    const sections: ExpandableSection[] = [
        {
            id: 'overview',
            title: 'Project Overview',
            icon: <Building2 className="w-4 h-4" />,
            content: (
                <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">Project Details</h4>
                            <ul className="space-y-1 text-sm text-gray-600">
                                <li><span className="font-medium">Developer:</span> {property.market.developerName}</li>
                                <li><span className="font-medium">Type:</span> {property.specifications.propertyType}</li>
                                <li><span className="font-medium">Status:</span> {property.market.projectStatus}</li>
                                {property.market.completionYear && (
                                    <li><span className="font-medium">Completion:</span> {property.market.completionYear}</li>
                                )}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">Specifications</h4>
                            <ul className="space-y-1 text-sm text-gray-600">
                                {property.specifications.configurations.length > 0 && (
                                    <li><span className="font-medium">Configurations:</span> {property.specifications.configurations.join(', ')}</li>
                                )}
                                {property.specifications.areaRange && (
                                    <li><span className="font-medium">Area:</span> {property.specifications.areaRange}</li>
                                )}
                                {property.specifications.totalFloors && (
                                    <li><span className="font-medium">Floors:</span> {property.specifications.totalFloors}</li>
                                )}
                                {property.specifications.totalUnits && (
                                    <li><span className="font-medium">Total Units:</span> {property.specifications.totalUnits}</li>
                                )}
                            </ul>
                        </div>
                    </div>
                    {property.market.investmentPotential && (
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">Investment Analysis</h4>
                            <p className="text-sm text-gray-600">{property.market.investmentPotential}</p>
                        </div>
                    )}
                </div>
            )
        },
        {
            id: 'location',
            title: 'Location & Connectivity',
            icon: <MapPin className="w-4 h-4" />,
            content: (
                <div className="space-y-4">
                    <div>
                        <h4 className="font-medium text-gray-900 mb-2">Location Details</h4>
                        <div className="text-sm text-gray-600">
                            <p><span className="font-medium">Area:</span> {property.location.area}</p>
                            <p><span className="font-medium">Neighborhood:</span> {property.location.neighborhood}</p>
                            <p><span className="font-medium">City:</span> {property.location.city}</p>
                        </div>
                    </div>

                    {property.location.workProximity.businessHubs.length > 0 && (
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">Business Hubs & Work Proximity</h4>
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                {property.location.workProximity.businessHubs.map((hub, index) => (
                                    <li key={index}>{hub}</li>
                                ))}
                            </ul>
                            {property.location.workProximity.commuteAnalysis && (
                                <p className="text-sm text-gray-600 mt-2">{property.location.workProximity.commuteAnalysis}</p>
                            )}
                        </div>
                    )}

                    {property.location.transportationAccess.length > 0 && (
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">Transportation</h4>
                            <div className="flex flex-wrap gap-2">
                                {property.location.transportationAccess.map((transport, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                        {transport}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )
        },
        {
            id: 'amenities',
            title: 'Neighborhood & Amenities',
            icon: <ShoppingBag className="w-4 h-4" />,
            content: (
                <div className="space-y-4">
                    {property.location.nearbyAmenities.length > 0 && (
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">Nearby Amenities</h4>
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                {property.location.nearbyAmenities.map((amenity, index) => (
                                    <li key={index}>{amenity}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {property.location.educationalInstitutions.length > 0 && (
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">Educational Institutions</h4>
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                {property.location.educationalInstitutions.map((institution, index) => (
                                    <li key={index}>{institution}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {property.location.healthcareFacilities.length > 0 && (
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">Healthcare Facilities</h4>
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                {property.location.healthcareFacilities.map((facility, index) => (
                                    <li key={index}>{facility}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )
        },
        {
            id: 'family',
            title: 'Family Features & Community',
            icon: <Users className="w-4 h-4" />,
            content: (
                <div className="space-y-4">
                    {property.community.familyAmenities.length > 0 && (
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">Family Amenities</h4>
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                {property.community.familyAmenities.map((amenity, index) => (
                                    <li key={index}>{amenity}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {property.community.childrensFacilities.length > 0 && (
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">Children's Facilities</h4>
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                {property.community.childrensFacilities.map((facility, index) => (
                                    <li key={index}>{facility}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {property.community.securityFeatures.length > 0 && (
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">Security Features</h4>
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                {property.community.securityFeatures.map((feature, index) => (
                                    <li key={index}>{feature}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )
        },
        {
            id: 'lifestyle',
            title: 'Recreation & Lifestyle',
            icon: <Dumbbell className="w-4 h-4" />,
            content: (
                <div className="space-y-4">
                    {property.community.recreationalFacilities.length > 0 && (
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">Recreational Facilities</h4>
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                {property.community.recreationalFacilities.map((facility, index) => (
                                    <li key={index}>{facility}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {property.community.sportsAndFitness.length > 0 && (
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">Sports & Fitness</h4>
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                {property.community.sportsAndFitness.map((facility, index) => (
                                    <li key={index}>{facility}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {property.community.clubhouseFeatures.length > 0 && (
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">Clubhouse Features</h4>
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                {property.community.clubhouseFeatures.map((feature, index) => (
                                    <li key={index}>{feature}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )
        }
    ]

    // Filter out sections with no content
    const availableSections = sections.filter(section => {
        if (section.id === 'overview') return true // Always show overview
        if (section.id === 'location') return true // Always show location
        if (section.id === 'amenities') {
            return property.location.nearbyAmenities.length > 0 ||
                   property.location.educationalInstitutions.length > 0 ||
                   property.location.healthcareFacilities.length > 0
        }
        if (section.id === 'family') {
            return property.community.familyAmenities.length > 0 ||
                   property.community.childrensFacilities.length > 0 ||
                   property.community.securityFeatures.length > 0
        }
        if (section.id === 'lifestyle') {
            return property.community.recreationalFacilities.length > 0 ||
                   property.community.sportsAndFitness.length > 0 ||
                   property.community.clubhouseFeatures.length > 0
        }
        return true
    })

    return (
        <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200">
            {/* Header */}
            <div className="p-6 border-b">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{property.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            <Badge className={getConfidenceColor(property.confidenceScore)}>
                                {property.confidenceScore}% Confidence
                            </Badge>
                            {property.market.propertyCategory && (
                                <Badge className={getCategoryColor(property.market.propertyCategory)}>
                                    {property.market.propertyCategory}
                                </Badge>
                            )}
                            {property.location.workProximity.proximityScore > 0 && (
                                <Badge variant="outline">
                                    Proximity: {property.location.workProximity.proximityScore}/10
                                </Badge>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="font-medium text-gray-700">Price:</span>
                                <div className="text-green-600 font-semibold">
                                    {property.specifications.priceRange || 'Price on request'}
                                </div>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Developer:</span>
                                <div className="text-blue-600">
                                    {property.market.developerName}
                                </div>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Source:</span>
                                <div className="text-gray-600">
                                    {property.sourceName}
                                </div>
                            </div>
                        </div>
                    </div>
                    <Button
                        onClick={handleViewProperty}
                        className="ml-4"
                        size="sm"
                    >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Property
                    </Button>
                </div>
            </div>

            {/* Expandable Sections */}
            <div className="divide-y">
                {availableSections.map((section) => {
                    const isExpanded = expandedSections.has(section.id)

                    return (
                        <div key={section.id}>
                            <button
                                onClick={() => toggleSection(section.id)}
                                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center space-x-3">
                                    {section.icon}
                                    <span className="font-medium text-gray-900">{section.title}</span>
                                </div>
                                {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                )}
                            </button>

                            {isExpanded && (
                                <div className="px-6 pb-4">
                                    {section.content}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}