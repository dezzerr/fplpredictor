import type {Metadata, Route} from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {ArrowRight, CalendarDays} from 'lucide-react'

import {PublicNavbar} from '@/components/PublicNavbar'
import {Badge} from '@/components/ui/badge'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import {getAllPosts, type BlogCategory, type BlogPostPreview} from '@/lib/sanity/client'
import {urlForImage} from '@/lib/sanity/image'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'FPL Blog',
  description: 'Read FPL gameweek guides, captaincy picks, transfer tips, and strategy articles from FPL Companion.',
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'FPL Blog | FPL Companion',
    description: 'Read FPL gameweek guides, captaincy picks, transfer tips, and strategy articles from FPL Companion.',
    url: 'https://fplcompanion.co.uk/blog',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FPL Blog | FPL Companion',
    description: 'Read FPL gameweek guides, captaincy picks, transfer tips, and strategy articles from FPL Companion.',
  },
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {dateStyle: 'long'}).format(new Date(value))
}

export default async function BlogIndexPage() {
  const posts = await getAllPosts()
  const contentUnavailable = posts === null
  const visiblePosts = posts ?? []

  return (
    <main className="min-h-screen">
      <PublicNavbar />
      <section className="relative border-b border-slate-800 overflow-hidden">
        <div className="absolute inset-0 bg-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.18),_transparent_40%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.16),_transparent_30%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <Badge className="border-violet-500/30 bg-violet-500/10 text-violet-200">FPL Content Hub</Badge>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">FPL guides, captain picks, and transfer strategy that support your next move.</h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-300">Use the blog to capture search traffic around gameweek questions and connect readers directly to your comparison, fixture, and optimization tools.</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/login" className="inline-flex items-center rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition-colors hover:bg-slate-100">
              Open FPL Companion
            </Link>
            <Link href="/compare" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3 font-semibold text-white transition-colors hover:border-slate-500 hover:bg-slate-900">
              Compare players
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {contentUnavailable ? (
          <Card className="border-red-200 bg-white">
            <CardHeader>
              <CardTitle className="text-slate-900">Blog content is temporarily unavailable</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-600">
              <p>We could not reach the content service. Please try again shortly.</p>
              <Link href="/blog" className="inline-flex items-center rounded-lg bg-gradient-brand-cta px-4 py-2 font-medium text-white transition-opacity hover:opacity-90">
                Try again
              </Link>
            </CardContent>
          </Card>
        ) : visiblePosts.length === 0 ? (
          <Card className="border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="text-slate-900">No blog posts published yet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-600">
              <p>Your Sanity integration is live. Publish your first article in the Studio and it will appear here automatically.</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/login" className="inline-flex items-center rounded-lg bg-gradient-brand-cta px-4 py-2 font-medium text-white transition-opacity hover:opacity-90">
                  Go to app
                </Link>
                <Link href="/fixtures" className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-100">
                  Explore fixtures
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePosts.map((post: BlogPostPreview) => {
              const coverImageUrl = post.coverImage?.asset ? urlForImage(post.coverImage).width(800).height(450).fit('crop').auto('format').url() : null

              return (
                <Link key={post._id} href={`/blog/${post.slug}` as Route} className="group block">
                  <Card className="h-full overflow-hidden border-surface-border bg-surface-1 shadow-sm transition-all duration-200 hover:border-violet-500/40 hover:shadow-md">
                    <div className="relative aspect-[16/9] overflow-hidden border-b border-surface-border bg-gradient-to-br from-violet-500/10 to-cyan-500/10">
                      {coverImageUrl ? (
                        <Image
                          src={coverImageUrl}
                          alt={post.title}
                          width={800}
                          height={450}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-full items-end bg-gradient-to-br from-violet-500/10 to-cyan-500/10 p-4 text-sm font-medium text-slate-400">
                          FPL Companion Blog
                        </div>
                      )}
                    </div>
                    <CardHeader className="space-y-2 p-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(post.publishedAt)}
                        </span>
                        {post.author?.name ? <span>By {post.author.name}</span> : null}
                      </div>
                      <CardTitle className="text-base font-semibold text-white leading-snug transition-colors group-hover:text-violet-300">{post.title}</CardTitle>
                      <p className="text-sm leading-relaxed text-slate-400 line-clamp-2">{post.excerpt}</p>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0 space-y-3">
                      {post.categories?.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {post.categories.map((category: BlogCategory) => (
                            <Badge key={`${post._id}-${category.title}`} className="border-surface-border bg-surface-2 text-slate-400 text-[10px] px-2 py-0.5">
                              {category.title}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                      <div className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-400 transition-colors group-hover:text-violet-300">
                        Read article
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
        </div>
      </section>
    </main>
  )
}
