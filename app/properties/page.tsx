"use client"

import { useEffect, useState, useRef } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import { Loader2, RefreshCw, ExternalLink, Upload, X, Pause, Play } from 'lucide-react'
import Link from 'next/link'

interface Property {
    id: string
    name: string
    slug: string
    description?: string
    confidence_score?: number
    created_at: string
    specifications?: {
        propertyType?: string
        priceRange?: string
    }
    location?: {
        city?: string
        neighborhood?: string
    }
    isProcessing?: boolean
    fromCache?: boolean
}

export default function PropertiesPage() {
    const [properties, setProperties] = useState<Property[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [count, setCount] = useState(0)

    // Bulk search state
    const [showBulkDialog, setShowBulkDialog] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [bulkProvider, setBulkProvider] = useState<'claude' | 'gemini'>('claude')
    const [skipCache, setSkipCache] = useState(false)
    const [parsedSocieties, setParsedSocieties] = useState<string[]>([])
    const [isBulkProcessing, setIsBulkProcessing] = useState(false)
    const [currentProcessing, setCurrentProcessing] = useState<string | null>(null)
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 })
    const [processingProperty, setProcessingProperty] = useState<Property | null>(null)
    const [isPaused, setIsPaused] = useState(false)
    const abortControllerRef = useRef<AbortController | null>(null)

    // Cooldown state
    const [showCooldown, setShowCooldown] = useState(false)
    const [cooldownRemaining, setCooldownRemaining] = useState(30)
    const [cooldownItemsProcessed, setCooldownItemsProcessed] = useState(0)
    const [currentCooldownRequestId, setCurrentCooldownRequestId] = useState<string | null>(null)
    const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null)
    const [bulkStats, setBulkStats] = useState({ succeeded: 0, failed: 0, skipped: 0 })

    const fetchProperties = async () => {
        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/properties')
            const data = await response.json()

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch properties')
            }

            setProperties(data.properties || [])
            setCount(data.count || 0)
        } catch (err: any) {
            setError(err.message)
            console.error('Error fetching properties:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProperties()
    }, [])

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getConfidenceBadgeVariant = (score?: number): "default" | "secondary" | "destructive" | "outline" => {
        if (!score) return "secondary"
        if (score >= 80) return "default"
        if (score >= 60) return "secondary"
        return "outline"
    }

    // Parse file when selected
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setSelectedFile(file)

        try {
            const text = await file.text()
            const ext = file.name.split('.').pop()?.toLowerCase()

            let societies: string[] = []

            if (ext === 'json') {
                const data = JSON.parse(text)
                societies = Array.isArray(data) ? data : []
            } else if (ext === 'csv') {
                const lines = text.split('\n').map(line => line.trim()).filter(line => line)
                const firstLine = lines[0]?.toLowerCase()
                societies = firstLine?.includes('name') || firstLine?.includes('property') ? lines.slice(1) : lines
            } else if (ext === 'txt') {
                societies = text.split('\n').map(line => line.trim()).filter(line => line)
            }

            setParsedSocieties(societies.filter(s => s))
        } catch (err) {
            console.error('Error parsing file:', err)
            setParsedSocieties([])
        }
    }

    // Start bulk search
    const handleStartBulkSearch = async () => {
        if (!selectedFile || parsedSocieties.length === 0) return

        setShowBulkDialog(false)
        setIsBulkProcessing(true)
        setBulkProgress({ current: 0, total: parsedSocieties.length })
        setBulkStats({ succeeded: 0, failed: 0, skipped: 0 })

        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('provider', bulkProvider)
        formData.append('skipCache', skipCache.toString())

        abortControllerRef.current = new AbortController()

        try {
            const response = await fetch('/api/bulk-search', {
                method: 'POST',
                body: formData,
                signal: abortControllerRef.current.signal
            })

            if (!response.ok) {
                throw new Error('Bulk search failed')
            }

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()

            if (!reader) throw new Error('Response body is not readable')

            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    if (!line.trim()) continue

                    try {
                        const message = JSON.parse(line)

                        switch (message.type) {
                            case 'processing':
                                setCurrentProcessing(message.society)
                                setBulkProgress({ current: message.current, total: message.total })
                                setProcessingProperty({
                                    id: 'temp-' + Date.now(),
                                    name: message.society,
                                    slug: '',
                                    created_at: new Date().toISOString(),
                                    isProcessing: true
                                })
                                break

                            case 'completed':
                                console.log('✅ Property completed:', message.property?.name || message.society)

                                // Add property to table at the TOP (newest first)
                                if (message.property) {
                                    const newProperty: Property = {
                                        id: message.property.id,
                                        name: message.property.name,
                                        slug: message.property.slug,
                                        description: message.property.description,
                                        confidence_score: message.property.confidence_score,
                                        created_at: message.property.created_at || new Date().toISOString(),
                                        specifications: message.property.specifications,
                                        location: message.property.location
                                    }

                                    setProperties(prev => [newProperty, ...prev])
                                    setCount(prev => prev + 1)
                                    console.log('✅ Property added to table:', newProperty.name)
                                } else {
                                    console.warn('⚠️ Completed but no property data received')
                                }

                                // Clear processing state
                                setProcessingProperty(null)

                                // Update stats
                                if (message.fromCache) {
                                    setBulkStats(prev => ({ ...prev, skipped: prev.skipped + 1 }))
                                } else {
                                    setBulkStats(prev => ({ ...prev, succeeded: prev.succeeded + 1 }))
                                }
                                break

                            case 'failed':
                                setProcessingProperty(null)
                                setBulkStats(prev => ({ ...prev, failed: prev.failed + 1 }))
                                console.error('Failed:', message.society, message.error)
                                break

                            case 'cooldown':
                                console.log('🧊 Cooldown triggered:', message)
                                setCurrentCooldownRequestId(message.requestId)  // ← Store for resume
                                setCooldownItemsProcessed(message.itemsProcessed)
                                setCooldownRemaining(message.cooldownSeconds)
                                setShowCooldown(true)

                                // Start countdown timer
                                const timerId = setInterval(() => {
                                    setCooldownRemaining(prev => {
                                        if (prev <= 1) {
                                            clearInterval(timerId)
                                            setShowCooldown(false)

                                            // Timer finished - send resume signal to server
                                            if (message.requestId) {
                                                fetch('/api/bulk-search/resume', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ requestId: message.requestId })
                                                }).then(() => console.log('✅ Auto-resume signal sent'))
                                                  .catch(err => console.error('Failed to send resume:', err))
                                            }

                                            return 0
                                        }
                                        return prev - 1
                                    })
                                }, 1000)

                                cooldownTimerRef.current = timerId
                                break

                            case 'complete':
                                console.log('Bulk search complete:', message.summary)
                                break
                        }
                    } catch (e) {
                        console.error('Error parsing message:', e)
                    }
                }
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error('Bulk search error:', err)
                setError(err.message)
            }
        } finally {
            setIsBulkProcessing(false)
            setCurrentProcessing(null)
            setProcessingProperty(null)
            abortControllerRef.current = null
        }
    }

    // Cancel bulk search
    const handleCancelBulkSearch = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        setIsBulkProcessing(false)
        setCurrentProcessing(null)
        setProcessingProperty(null)
    }

    // Continue immediately (skip cooldown)
    const handleContinueImmediately = async () => {
        console.log('⚡ User requesting immediate continue')

        // Send resume signal to server
        if (currentCooldownRequestId) {
            try {
                await fetch('/api/bulk-search/resume', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requestId: currentCooldownRequestId })
                })
                console.log('✅ Resume signal sent to server')
            } catch (err) {
                console.error('Failed to send resume signal:', err)
            }
        }

        // Clear the countdown timer
        if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current)
            cooldownTimerRef.current = null
        }

        // Close dialog and reset cooldown
        setShowCooldown(false)
        setCooldownRemaining(0)
        setCurrentCooldownRequestId(null)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-3xl">Property Intelligence Archive</CardTitle>
                                <CardDescription className="mt-2">
                                    All previously analyzed properties ({count} total)
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={fetchProperties}
                                    disabled={loading}
                                >
                                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                    Refresh
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowBulkDialog(true)}
                                    disabled={isBulkProcessing}
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Bulk Search
                                </Button>
                                <Link href="/">
                                    <Button variant="default" size="sm">
                                        New Search
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Bulk Search Progress Indicator */}
                        {isBulkProcessing && (
                            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                        <div>
                                            <span className="font-medium text-gray-900">Bulk Search in Progress</span>
                                            <p className="text-sm text-gray-600 mt-0.5">
                                                Processing: {currentProcessing || '...'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-700">
                                            {bulkProgress.current} / {bulkProgress.total}
                                        </span>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={handleCancelBulkSearch}
                                        >
                                            <X className="h-4 w-4 mr-1" />
                                            Cancel
                                        </Button>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                                    <div
                                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                        style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                                    />
                                </div>

                                {/* Stats */}
                                <div className="flex gap-4 text-sm">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        <span className="text-gray-600">Succeeded: <strong>{bulkStats.succeeded}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                        <span className="text-gray-600">Skipped: <strong>{bulkStats.skipped}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-red-500" />
                                        <span className="text-gray-600">Failed: <strong>{bulkStats.failed}</strong></span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {loading && (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                <span className="ml-3 text-gray-600">Loading properties...</span>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                                <strong>Error:</strong> {error}
                            </div>
                        )}

                        {!loading && !error && properties.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                <p className="text-lg mb-4">No properties found</p>
                                <Link href="/">
                                    <Button>Search for Properties</Button>
                                </Link>
                            </div>
                        )}

                        {!loading && !error && properties.length > 0 && (
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[300px]">Property Name</TableHead>
                                            <TableHead>Location</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Price Range</TableHead>
                                            <TableHead>Confidence</TableHead>
                                            <TableHead>Analyzed</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {/* Processing Row (Yellow Highlight) */}
                                        {processingProperty && (
                                            <TableRow className="bg-yellow-100 animate-pulse">
                                                <TableCell colSpan={7} className="py-4">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                                        <span className="font-medium text-gray-900">
                                                            ⏳ Processing: {currentProcessing}...
                                                        </span>
                                                        <span className="text-sm text-gray-500">
                                                            ({bulkProgress.current}/{bulkProgress.total})
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}

                                        {properties.map((property) => (
                                            <TableRow key={property.id}>
                                                <TableCell className="font-medium">
                                                    <div>
                                                        <div className="font-semibold text-gray-900">
                                                            {property.name}
                                                        </div>
                                                        {property.description && (
                                                            <div className="text-sm text-gray-500 truncate max-w-[280px]">
                                                                {property.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        {property.location?.neighborhood && (
                                                            <div className="font-medium">{property.location.neighborhood}</div>
                                                        )}
                                                        {property.location?.city && (
                                                            <div className="text-gray-500">{property.location.city}</div>
                                                        )}
                                                        {!property.location?.neighborhood && !property.location?.city && (
                                                            <span className="text-gray-400">N/A</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {property.specifications?.propertyType ? (
                                                        <Badge variant="secondary">
                                                            {property.specifications.propertyType}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-gray-400">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {property.specifications?.priceRange ? (
                                                        <span className="font-medium text-green-600">
                                                            {property.specifications.priceRange}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {property.confidence_score ? (
                                                        <Badge variant={getConfidenceBadgeVariant(property.confidence_score)}>
                                                            {property.confidence_score}%
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-gray-400">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-600">
                                                    {formatDate(property.created_at)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Link href={`/properties/${property.slug}`}>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Bulk Upload Dialog */}
                <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Bulk Property Search</DialogTitle>
                            <DialogDescription>
                                Upload a file with property names to analyze multiple properties at once.
                                Supported formats: JSON array, CSV, or TXT (one per line)
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 mt-4">
                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select File
                                </label>
                                <Input
                                    type="file"
                                    accept=".json,.csv,.txt"
                                    onChange={handleFileSelect}
                                    className="cursor-pointer"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    JSON, CSV, or TXT format (one property name per line)
                                </p>
                            </div>

                            {/* Provider Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    AI Provider
                                </label>
                                <div className="inline-flex gap-1 rounded-lg border bg-background p-1 w-full">
                                    <Toggle
                                        pressed={bulkProvider === 'claude'}
                                        onPressedChange={() => setBulkProvider('claude')}
                                        className="flex-1 data-[state=on]:bg-gradient-to-r data-[state=on]:from-indigo-600 data-[state=on]:to-purple-600 data-[state=on]:text-white"
                                    >
                                        Claude WebSearch
                                    </Toggle>
                                    <Toggle
                                        pressed={bulkProvider === 'gemini'}
                                        onPressedChange={() => setBulkProvider('gemini')}
                                        className="flex-1 data-[state=on]:bg-gradient-to-r data-[state=on]:from-indigo-600 data-[state=on]:to-purple-600 data-[state=on]:text-white"
                                    >
                                        Google Gemini
                                    </Toggle>
                                </div>
                            </div>

                            {/* Skip Cache Checkbox */}
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="skipCache"
                                    checked={skipCache}
                                    onChange={(e) => setSkipCache(e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="skipCache" className="text-sm text-gray-700 cursor-pointer">
                                    Force re-analyze (ignore cache)
                                </label>
                            </div>

                            {/* Preview */}
                            {parsedSocieties.length > 0 && (
                                <div className="p-3 bg-gray-50 rounded-lg border">
                                    <p className="font-medium text-sm text-gray-900 mb-1">
                                        ✓ {parsedSocieties.length} properties detected
                                    </p>
                                    <p className="text-xs text-gray-600">
                                        {parsedSocieties.slice(0, 3).join(', ')}
                                        {parsedSocieties.length > 3 && ` +${parsedSocieties.length - 3} more...`}
                                    </p>
                                </div>
                            )}

                            {/* Start Button */}
                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowBulkDialog(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleStartBulkSearch}
                                    disabled={!selectedFile || parsedSocieties.length === 0}
                                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Start Bulk Search ({parsedSocieties.length})
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Cooldown Dialog */}
                <Dialog open={showCooldown} onOpenChange={() => { }}>
                    <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                Cooling Off Period
                            </DialogTitle>
                            <DialogDescription>
                                Taking a 30-second break after {cooldownItemsProcessed} properties to avoid rate limits and ensure optimal performance.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {/* Countdown Timer */}
                            <div className="text-center">
                                <div className="text-6xl font-bold text-blue-600 mb-2 font-mono">
                                    {Math.floor(cooldownRemaining / 60)}:{String(cooldownRemaining % 60).padStart(2, '0')}
                                </div>
                                <div className="text-sm text-gray-500">
                                    Time remaining
                                </div>
                            </div>

                            {/* Explanation Box */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-gray-700">
                                    <strong>Why cooldown?</strong> After processing 20 properties,
                                    we pause briefly to prevent API rate limits and ensure reliable results for all searches.
                                </p>
                            </div>

                            {/* Continue Button */}
                            <Button
                                onClick={handleContinueImmediately}
                                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                size="lg"
                            >
                                ⚡ Continue Immediately
                            </Button>

                            {/* Progress Info */}
                            <div className="text-center text-xs text-gray-500">
                                Processed {cooldownItemsProcessed} properties • {bulkProgress.total - cooldownItemsProcessed} remaining
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}
