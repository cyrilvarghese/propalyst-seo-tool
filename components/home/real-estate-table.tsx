'use client'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, MapPin } from "lucide-react"
import { IntelligentPropertyResult } from '@/lib/types'

interface RealEstateTableProps {
    properties: IntelligentPropertyResult[]
}

export function RealEstateTable({ properties }: RealEstateTableProps) {
    if (!properties || properties.length === 0) {
        return (
            <div className="p-12 text-center">
                <p className="text-gray-500">No properties found for your search.</p>
                <p className="text-sm text-gray-400 mt-2">Try adjusting your search terms or check if the services are running.</p>
            </div>
        )
    }

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString()
        } catch {
            return 'Recently'
        }
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

    return (
        <div className="p-6">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Property Intelligence</TableHead>
                            <TableHead>Location & Connectivity</TableHead>
                            <TableHead>Market Analysis</TableHead>
                            <TableHead>Amenities & Community</TableHead>
                            <TableHead>Confidence</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {properties.map((property, index) => (
                            <TableRow key={property.id || index}>
                                <TableCell className="max-w-xs">
                                    <div>
                                        <div className="font-medium text-sm mb-1">{property.title}</div>
                                        <div className="text-xs text-gray-600 space-y-1">
                                            <div>
                                                <span className="font-medium">{property.specifications.propertyType}</span>
                                                {property.specifications.configurations.length > 0 && (
                                                    <span className="ml-1 text-gray-400">
                                                        • {property.specifications.configurations.slice(0, 2).join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                            {property.specifications.priceRange && (
                                                <div className="font-semibold text-green-700">
                                                    {property.specifications.priceRange}
                                                </div>
                                            )}
                                            {property.market.developerName && (
                                                <div className="text-blue-600 text-xs">
                                                    by {property.market.developerName}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="max-w-sm">
                                    <div className="space-y-2">
                                        <div className="flex items-center text-sm">
                                            <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                                            <span className="truncate">
                                                {property.location.area || property.location.neighborhood || 'Location TBD'}
                                                {property.location.city && `, ${property.location.city}`}
                                            </span>
                                        </div>

                                        {property.location.workProximity?.businessHubs.length > 0 && (
                                            <div className="text-xs text-gray-500">
                                                <span className="font-medium">Business Hubs:</span> {property.location.workProximity.businessHubs.slice(0, 2).join(', ')}
                                            </div>
                                        )}

                                        {property.location.transportationAccess.length > 0 && (
                                            <div className="text-xs text-blue-600">
                                                {property.location.transportationAccess.slice(0, 2).join(', ')}
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="max-w-sm">
                                    <div className="space-y-1 text-xs">
                                        {property.market.propertyCategory && (
                                            <Badge className={getCategoryColor(property.market.propertyCategory)}>
                                                {property.market.propertyCategory}
                                            </Badge>
                                        )}

                                        {property.market.investmentPotential && (
                                            <div className="text-gray-600 mt-1">
                                                {property.market.investmentPotential.substring(0, 80)}
                                                {property.market.investmentPotential.length > 80 && '...'}
                                            </div>
                                        )}

                                        {property.market.projectStatus && (
                                            <div className="text-gray-500">
                                                Status: <span className="font-medium">{property.market.projectStatus}</span>
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="max-w-sm">
                                    <div className="space-y-1 text-xs">
                                        {property.community.familyAmenities.length > 0 && (
                                            <div>
                                                <span className="font-medium text-gray-700">Family:</span>
                                                <div className="text-gray-600">{property.community.familyAmenities.slice(0, 3).join(', ')}</div>
                                            </div>
                                        )}

                                        {property.community.sportsAndFitness.length > 0 && (
                                            <div>
                                                <span className="font-medium text-gray-700">Fitness:</span>
                                                <div className="text-gray-600">{property.community.sportsAndFitness.slice(0, 2).join(', ')}</div>
                                            </div>
                                        )}

                                        {property.specifications.amenitiesCount && property.specifications.amenitiesCount > 0 && (
                                            <div className="text-gray-500 mt-1">
                                                {property.specifications.amenitiesCount}+ amenities
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-1">
                                        <Badge className={getConfidenceColor(property.confidenceScore)}>
                                            {property.confidenceScore}%
                                        </Badge>

                                        {property.location.workProximity?.proximityScore && (
                                            <div className="text-xs text-gray-500">
                                                Proximity: {property.location.workProximity.proximityScore}/10
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(property.sourceUrl, '_blank')}
                                    >
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        View
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Results Summary */}
            <div className="mt-4 text-sm text-gray-600">
                Showing {properties.length} properties from {new Set(properties.map(p => p.sourceName)).size} sources
            </div>
        </div>
    )
}