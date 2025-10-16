"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, Calendar, Clock, Tag } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { AreaIntelligenceResult, BlogContent } from '@/lib/types/area-intelligence'

export default function AreaBlogPage() {
    const params = useParams()
    const id = params.id as string

    const [area, setArea] = useState<AreaIntelligenceResult | null>(null)
    const [blog, setBlog] = useState<BlogContent | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchAreaBlog()
    }, [id])

    const fetchAreaBlog = async () => {
        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/areas/${id}`)
            const data = await response.json()

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch area')
            }

            setArea(data.area)

            if (!data.area.blogContent) {
                setError('Blog not generated for this area yet')
                return
            }

            setBlog(data.area.blogContent)
        } catch (err: any) {
            setError(err.message)
            console.error('Error fetching blog:', err)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <Link href="/areas">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Areas
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-6 py-12">
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        <span className="ml-3 text-gray-600">Loading blog...</span>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-800">
                        <strong>Error:</strong> {error}
                        <div className="mt-4">
                            <Link href={`/areas/${id}`}>
                                <Button variant="outline">View Area Page</Button>
                            </Link>
                        </div>
                    </div>
                )}

                {!loading && !error && blog && area && (
                    <article className="bg-white rounded-lg shadow-sm">
                        {/* Blog Header */}
                        <div className="p-8 border-b">
                            <h1 className="text-4xl font-bold text-gray-900 mb-4">
                                {blog.title}
                            </h1>

                            <p className="text-xl text-gray-600 mb-6">
                                {blog.metaDescription}
                            </p>

                            {/* Meta Info */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>{formatDate(blog.publishedDate)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    <span>{blog.readingTimeMinutes} min read</span>
                                </div>
                            </div>

                            {/* Tags */}
                            {blog.tags && blog.tags.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2 mt-4">
                                    <Tag className="h-4 w-4 text-gray-400" />
                                    {blog.tags.map(tag => (
                                        <Badge key={tag} variant="outline">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Blog Sections */}
                        <div className="p-8 space-y-12">
                            {blog.sections.map((section, index) => (
                                <section key={section.id} className="scroll-mt-6">
                                    {/* Section Heading */}
                                    <h2 className="text-3xl font-bold text-gray-900 mb-6">
                                        {section.heading}
                                    </h2>

                                    {/* Section Content */}
                                    <div
                                        className="prose prose-lg max-w-none mb-6 text-gray-700 leading-relaxed"
                                        dangerouslySetInnerHTML={{
                                            __html: section.content
                                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                .replace(/\n\n/g, '</p><p class="mb-4">')
                                                .replace(/^(.*)$/gm, '<p class="mb-4">$1</p>')
                                                .replace(/- (.*)/g, '<li>$1</li>')
                                                .replace(/(<li>.*<\/li>)+/g, '<ul class="list-disc list-inside space-y-2 mb-4">$&</ul>')
                                        }}
                                    />

                                    {/* Section Image */}
                                    {section.images && section.images.length > 0 && (
                                        <figure className="my-8">
                                            <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-gray-100">
                                                <Image
                                                    src={section.images[0].url}
                                                    alt={section.imageCaption || section.heading}
                                                    fill
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                            </div>
                                            {section.imageCaption && (
                                                <figcaption className="text-sm text-gray-500 text-center mt-3 italic">
                                                    {section.imageCaption}
                                                </figcaption>
                                            )}
                                        </figure>
                                    )}

                                    {/* Divider between sections (except last) */}
                                    {index < blog.sections.length - 1 && (
                                        <hr className="mt-12 border-gray-200" />
                                    )}
                                </section>
                            ))}
                        </div>

                        {/* Footer CTA */}
                        <div className="p-8 bg-gray-50 border-t">
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-gray-900 mb-3">
                                    Explore {area.area} Properties
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    View detailed market data, amenities, and property listings
                                </p>
                                <Link href={`/areas/${id}`}>
                                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                                        View Area Intelligence
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        {/* Generated Timestamp */}
                        <div className="px-8 py-4 bg-gray-100 text-center text-xs text-gray-500">
                            Generated on {formatDate(blog.generatedAt)} • AI-powered insights by Propalyst
                        </div>
                    </article>
                )}
            </div>
        </div>
    )
}
