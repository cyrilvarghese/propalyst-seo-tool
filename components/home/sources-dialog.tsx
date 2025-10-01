'use client'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, LinkIcon } from "lucide-react"
import { SourceCitation } from "@/lib/types/property-intelligence"

interface SourcesDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    sources: SourceCitation[]
    propertyTitle: string
}

/**
 * Sources Dialog Component
 *
 * **Next.js Teaching Point:**
 * This is a client component ('use client') that displays source citations
 * from Gemini's grounding metadata. It demonstrates:
 * - Using shadcn/ui Dialog for modals
 * - External link handling with security (noopener, noreferrer)
 * - Proper attribution for AI-generated content (Gemini requirement)
 *
 * **Why This Matters:**
 * Google's Gemini API provides grounding metadata to show which websites
 * were used to generate the AI response. Displaying these sources:
 * 1. Builds trust with users
 * 2. Complies with Gemini attribution guidelines
 * 3. Allows users to verify information
 * 4. Increases transparency in AI-powered search
 */
export function SourcesDialog({ open, onOpenChange, sources, propertyTitle }: SourcesDialogProps) {
    const handleSourceClick = (uri: string) => {
        window.open(uri, '_blank', 'noopener,noreferrer')
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto overflow-x-hidden">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <LinkIcon className="w-5 h-5 text-blue-600" />
                        Source Citations for {propertyTitle}
                    </DialogTitle>
                    <DialogDescription>
                        This information was gathered from the following {sources.length} trusted sources using Google Gemini AI.
                        Click any source to visit the original webpage.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 mt-4">
                    {sources.map((source, index) => (
                        <div
                            key={index}
                            className="p-4 border rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer group"
                            onClick={() => handleSourceClick(source.uri)}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="outline" className="text-xs">
                                            Source {index + 1}
                                        </Badge>
                                    </div>

                                    <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                                        {source.title}
                                    </h4>

                                    {source.segment && (
                                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700 italic border-l-2 border-gray-300">
                                            "{source.segment}"
                                        </div>
                                    )}
                                </div>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleSourceClick(source.uri)
                                    }}
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                        <div className="text-blue-600 mt-0.5">ℹ️</div>
                        <div className="text-sm text-blue-800">
                            <strong>About Source Attribution:</strong> These sources were automatically identified by Google Gemini AI
                            during the property analysis. The AI used information from these websites to provide comprehensive property intelligence.
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}