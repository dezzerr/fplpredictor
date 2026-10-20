'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Route } from 'next'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { type BlogPostPreview, type BlogCategory } from '@/lib/sanity/client'
import { urlForImage } from '@/lib/sanity/image'
import { Badge } from '@/components/ui/badge'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date(value))
}

export default function HomeBlog() {
  const [posts, setPosts] = useState<BlogPostPreview[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/blog-posts', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch blog posts: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        const nextPosts = Array.isArray(data) ? (data as BlogPostPreview[]) : []
        setPosts(nextPosts.slice(0, 4))
        setLoaded(true)
      })
      .catch((err) => {
        console.error('HomeBlog fetch error:', err)
        setLoaded(true)
      })
  }, [])

  if (!loaded || !posts.length) return null

  const [featured, ...rest] = posts.slice(0, 4)
  const latest = rest.slice(0, 3)
  const featuredImage = featured.coverImage?.asset
    ? urlForImage(featured.coverImage).width(1200).height(675).fit('crop').auto('format').url()
    : null

  return (
    <section className="relative py-24 sm:py-32 cv-auto bg-surface-0 text-white border-t border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Featured post */}
        <Link href={`/blog/${featured.slug}` as Route} className="group block mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {featured.categories?.map((cat: BlogCategory) => (
                  <Badge
                    key={cat.title}
                    className="bg-violet-500/20 border-violet-500/40 text-violet-200 text-xs"
                  >
                    {cat.title}
                  </Badge>
                ))}
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-4 group-hover:text-violet-200 transition-colors">
                {featured.title}
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-6 line-clamp-3">
                {featured.excerpt}
              </p>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {formatDate(featured.publishedAt)}
                </span>
                {featured.author?.name && <span>By {featured.author.name}</span>}
              </div>
            </div>
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 group-hover:border-violet-500/40 transition-colors">
              {featuredImage ? (
                <Image
                  src={featuredImage}
                  alt={featured.title}
                  width={1200}
                  height={675}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-violet-900/40 to-cyan-900/40 text-slate-500 text-sm">
                  FPL Companion
                </div>
              )}
            </div>
          </div>
        </Link>

        {/* Latest articles */}
        {latest.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Our latest articles</h3>
              <Link
                href={'/blog' as Route}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {latest.map((post: BlogPostPreview) => {
                const coverUrl = post.coverImage?.asset
                  ? urlForImage(post.coverImage).width(800).height(450).fit('crop').auto('format').url()
                  : null

                return (
                  <Link key={post._id} href={`/blog/${post.slug}` as Route} className="group block">
                    <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-slate-800 border border-slate-700 group-hover:border-violet-500/40 transition-colors mb-4">
                      {coverUrl ? (
                        <Image
                          src={coverUrl}
                          alt={post.title}
                          width={800}
                          height={450}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-violet-900/30 to-cyan-900/30 text-slate-600 text-sm">
                          FPL Companion
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {formatDate(post.publishedAt)}
                      </span>
                      {post.categories?.slice(0, 2).map((cat: BlogCategory) => (
                        <Badge
                          key={`${post._id}-${cat.title}`}
                          className="bg-slate-800 border-slate-700 text-slate-300 text-[10px] px-1.5 py-0"
                        >
                          {cat.title}
                        </Badge>
                      ))}
                    </div>
                    <h4 className="font-semibold text-white leading-snug group-hover:text-violet-200 transition-colors line-clamp-2">
                      {post.title}
                    </h4>
                    <p className="text-sm text-slate-400 mt-1.5 line-clamp-2">{post.excerpt}</p>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
