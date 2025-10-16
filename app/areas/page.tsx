"use client"

import { useEffect, useState, useRef } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Loader2, RefreshCw, ExternalLink, Upload, X } from 'lucide-react'
import Link from 'next/link'
import { AreaIntelligenceResult } from '@/lib/types/area-intelligence'

interface Area {
    id: string
    area: string
    cityName: string
    citySection?: string
    description?: string
    propertyCount: number
    confidenceScore?: number
    lastAnalyzed?: string
    createdAt: string
    blogContent?: any
}

export default function AreasPage() {
    const [areas, setAreas] = useState<Area[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [count, setCount] = useState(0)

    // Bulk enrich state
    const [showBulkDialog, setShowBulkDialog] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const bulkProvider = 'gemini' // Fixed to Gemini only
    const [skipCache, setSkipCache] = useState(false)
    const [defaultCity, setDefaultCity] = useState('')
    const [parsedAreas, setParsedAreas] = useState<Array<{ area: string; city: string }>>([])
    const [isBulkProcessing, setIsBulkProcessing] = useState(false)
    const [currentProcessing, setCurrentProcessing] = useState<string | null>(null)
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 })
    const [processingArea, setProcessingArea] = useState<Area | null>(null)
    const abortControllerRef = useRef<AbortController | null>(null)

    // Cooldown state
    const [showCooldown, setShowCooldown] = useState(false)
    const [cooldownRemaining, setCooldownRemaining] = useState(30)
    const [cooldownItemsProcessed, setCooldownItemsProcessed] = useState(0)
    const [currentCooldownRequestId, setCurrentCooldownRequestId] = useState<string | null>(null)
    const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null)
    const [bulkStats, setBulkStats] = useState({ succeeded: 0, failed: 0, skipped: 0 })

    // Blog generation state
    const [generatingBlogFor, setGeneratingBlogFor] = useState<string | null>(null)

    const fetchAreas = async () => {
        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/areas')
            const data = await response.json()

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch areas')
            }

            setAreas(data.areas || [])
            setCount(data.count || 0)
        } catch (err: any) {
            setError(err.message)
            console.error('Error fetching areas:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAreas()
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

            let areasList: Array<{ area: string; city: string }> = []

            if (ext === 'json') {
                const data = JSON.parse(text)
                if (Array.isArray(data)) {
                    areasList = data.map(item => {
                        if (typeof item === 'string') {
                            return { area: item, city: defaultCity || '' }
                        } else if (item.area) {
                            return { area: item.area, city: item.city || defaultCity || '' }
                        }
                        return null
                    }).filter(Boolean) as Array<{ area: string; city: string }>
                }
            } else if (ext === 'csv') {
                const lines = text.split('\n').map(line => line.trim()).filter(line => line)
                const firstLine = lines[0]?.toLowerCase()
                const hasHeader = firstLine?.includes('area') || firstLine?.includes('city')
                const startIndex = hasHeader ? 1 : 0

                for (let i = startIndex; i < lines.length; i++) {
                    const line = lines[i]
                    if (line.includes(',')) {
                        const [area, city] = line.split(',').map(s => s.trim())
                        if (area && city) {
                            areasList.push({ area, city })
                        }
                    } else if (defaultCity) {
                        areasList.push({ area: line, city: defaultCity })
                    }
                }
            } else if (ext === 'txt') {
                const lines = text.split('\n').map(line => line.trim()).filter(line => line)
                if (defaultCity) {
                    areasList = lines.map(area => ({ area, city: defaultCity }))
                }
            }

            setParsedAreas(areasList.filter(item => item.area && item.city))
        } catch (err) {
            console.error('Error parsing file:', err)
            setParsedAreas([])
        }
    }

    // Start bulk enrichment
    const handleStartBulkEnrich = async () => {
        if (!selectedFile || parsedAreas.length === 0) return

        setShowBulkDialog(false)
        setIsBulkProcessing(true)
        setBulkProgress({ current: 0, total: parsedAreas.length })
        setBulkStats({ succeeded: 0, failed: 0, skipped: 0 })

        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('provider', bulkProvider)
        formData.append('skipCache', skipCache.toString())
        if (defaultCity) {
            formData.append('defaultCity', defaultCity)
        }

        abortControllerRef.current = new AbortController()

        try {
            const response = await fetch('/api/areas/bulk-enrich', {
                method: 'POST',
                body: formData,
                signal: abortControllerRef.current.signal
            })

            if (!response.ok) {
                throw new Error('Bulk enrichment failed')
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
                                setCurrentProcessing(message.area)
                                setBulkProgress({ current: message.current, total: message.total })
                                setProcessingArea({
                                    id: 'temp-' + Date.now(),
                                    area: message.area.split(',')[0] || message.area,
                                    cityName: message.area.split(',')[1]?.trim() || '',
                                    propertyCount: 0,
                                    createdAt: new Date().toISOString()
                                })
                                break

                            case 'completed':
                                console.log('✅ Area completed:', message.areaData?.area)

                                // Add area to table at the TOP
                                if (message.areaData) {
                                    const newArea: Area = {
                                        id: message.areaData.id,
                                        area: message.areaData.area,
                                        cityName: message.areaData.cityName,
                                        citySection: message.areaData.citySection,
                                        description: message.areaData.description,
                                        propertyCount: message.areaData.propertyCount || 0,
                                        confidenceScore: message.areaData.confidenceScore,
                                        lastAnalyzed: message.areaData.lastAnalyzed,
                                        createdAt: message.areaData.createdAt || new Date().toISOString()
                                    }

                                    setAreas(prev => [newArea, ...prev])
                                    setCount(prev => prev + 1)
                                    console.log('✅ Area added to table:', newArea.area)
                                }

                                // Clear processing state
                                setProcessingArea(null)

                                // Update stats
                                if (message.fromCache) {
                                    setBulkStats(prev => ({ ...prev, skipped: prev.skipped + 1 }))
                                } else {
                                    setBulkStats(prev => ({ ...prev, succeeded: prev.succeeded + 1 }))
                                }
                                break

                            case 'failed':
                                setProcessingArea(null)
                                setBulkStats(prev => ({ ...prev, failed: prev.failed + 1 }))
                                console.error('Failed:', message.area, message.error)
                                break

                            case 'cooldown':
                                console.log('🧊 Cooldown triggered:', message)
                                setCurrentCooldownRequestId(message.requestId)
                                setCooldownItemsProcessed(message.itemsProcessed)
                                setCooldownRemaining(message.cooldownSeconds)
                                setShowCooldown(true)

                                // Start countdown timer
                                const timerId = setInterval(() => {
                                    setCooldownRemaining(prev => {
                                        if (prev <= 1) {
                                            clearInterval(timerId)
                                            setShowCooldown(false)

                                            // Timer finished - send resume signal
                                            if (message.requestId) {
                                                fetch('/api/areas/bulk-enrich/resume', {
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
                                console.log('Bulk enrichment complete:', message.summary)
                                break
                        }
                    } catch (e) {
                        console.error('Error parsing message:', e)
                    }
                }
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error('Bulk enrichment error:', err)
                setError(err.message)
            }
        } finally {
            setIsBulkProcessing(false)
            setCurrentProcessing(null)
            setProcessingArea(null)
            abortControllerRef.current = null
        }
    }

    // Cancel bulk enrichment
    const handleCancelBulkEnrich = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        setIsBulkProcessing(false)
        setCurrentProcessing(null)
        setProcessingArea(null)
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

        // Close dialog
        setShowCooldown(false)
        setCooldownRemaining(0)
        setCurrentCooldownRequestId(null)
    }

    // Generate blog for a single area
    const handleGenerateBlog = async (areaId: string) => {
        setGeneratingBlogFor(areaId)

        try {
            const response = await fetch(`/api/areas/${areaId}/generate-blog`, {
                method: 'POST'
            })

            const data = await response.json()

            if (!data.success) {
                throw new Error(data.error || 'Failed to generate blog')
            }

            // Update the area in the list
            setAreas(prev => prev.map(area =>
                area.id === areaId
                    ? { ...area, blogContent: data.blogContent }
                    : area
            ))

            console.log('✅ Blog generated successfully')
        } catch (err: any) {
            console.error('Error generating blog:', err)
            alert(`Failed to generate blog: ${err.message}`)
        } finally {
            setGeneratingBlogFor(null)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-3xl">Area Intelligence Archive</CardTitle>
                                <CardDescription className="mt-2">
                                    All analyzed areas with comprehensive market data ({count} total)
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={fetchAreas}
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
                                    Bulk Enrich
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Bulk Enrichment Progress Indicator */}
                        {isBulkProcessing && (
                            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                        <div>
                                            <span className="font-medium text-gray-900">Bulk Enrichment in Progress</span>
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
                                            onClick={handleCancelBulkEnrich}
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
                                <span className="ml-3 text-gray-600">Loading areas...</span>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                                <strong>Error:</strong> {error}
                            </div>
                        )}

                        {!loading && !error && areas.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                <p className="text-lg mb-4">No areas found</p>
                                <Button onClick={() => setShowBulkDialog(true)}>
                                    Add Areas
                                </Button>
                            </div>
                        )}

                        {!loading && !error && areas.length > 0 && (
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[300px]">Area Name</TableHead>
                                            <TableHead>City</TableHead>
                                            <TableHead>Section</TableHead>
                                            <TableHead>Properties</TableHead>
                                            <TableHead>Confidence</TableHead>
                                            <TableHead>Last Analyzed</TableHead>
                                            <TableHead>Blog</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {/* Processing Row (Yellow Highlight) */}
                                        {processingArea && (
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

                                        {areas.map((area) => (
                                            <TableRow key={area.id}>
                                                <TableCell className="font-medium">
                                                    <div>
                                                        <div className="font-semibold text-gray-900">
                                                            {area.area}
                                                        </div>
                                                        {area.description && (
                                                            <div className="text-sm text-gray-500 truncate max-w-[280px]">
                                                                {area.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm font-medium">{area.cityName}</div>
                                                </TableCell>
                                                <TableCell>
                                                    {area.citySection ? (
                                                        <Badge variant="outline">
                                                            {area.citySection}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-gray-400">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-medium text-blue-600">
                                                        {area.propertyCount}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    {area.confidenceScore ? (
                                                        <Badge variant={getConfidenceBadgeVariant(area.confidenceScore)}>
                                                            {area.confidenceScore}%
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-gray-400">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-600">
                                                    {area.lastAnalyzed ? formatDate(area.lastAnalyzed) : 'Not analyzed'}
                                                </TableCell>
                                                <TableCell>
                                                    {area.blogContent ? (
                                                        <Link href={`/areas/${area.id}/blog`}>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-blue-600 hover:text-blue-700"
                                                            >
                                                                📄 View Blog
                                                            </Button>
                                                        </Link>
                                                    ) : generatingBlogFor === area.id ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled
                                                            className="text-gray-500"
                                                        >
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            Generating...
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleGenerateBlog(area.id)}
                                                            className="text-green-600 hover:text-green-700"
                                                        >
                                                            ✨ Generate Blog
                                                        </Button>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Link href={`/areas/${area.id}`}>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            title="View area details"
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
                            <DialogTitle>Bulk Area Enrichment</DialogTitle>
                            <DialogDescription>
                                Upload a file with area names to enrich multiple areas at once.
                                Supported formats: JSON, CSV (area,city), or TXT (with default city)
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
                                    JSON, CSV, or TXT format
                                </p>
                            </div>

                            {/* Default City (for TXT files) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Default City (optional for TXT files)
                                </label>
                                <Input
                                    type="text"
                                    placeholder="e.g., Bangalore"
                                    value={defaultCity}
                                    onChange={(e) => setDefaultCity(e.target.value)}
                                />
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
                            {parsedAreas.length > 0 && (
                                <div className="p-3 bg-gray-50 rounded-lg border">
                                    <p className="font-medium text-sm text-gray-900 mb-1">
                                        ✓ {parsedAreas.length} areas detected
                                    </p>
                                    <p className="text-xs text-gray-600">
                                        {parsedAreas.slice(0, 3).map(a => `${a.area}, ${a.city}`).join(' • ')}
                                        {parsedAreas.length > 3 && ` +${parsedAreas.length - 3} more...`}
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
                                    onClick={handleStartBulkEnrich}
                                    disabled={!selectedFile || parsedAreas.length === 0}
                                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Start Bulk Enrich ({parsedAreas.length})
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
                                Taking a 30-second break after {cooldownItemsProcessed} areas to avoid rate limits.
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
                                    <strong>Why cooldown?</strong> After processing 20 areas,
                                    we pause briefly to prevent API rate limits and ensure reliable results.
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
                                Processed {cooldownItemsProcessed} areas • {bulkProgress.total - cooldownItemsProcessed} remaining
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}
