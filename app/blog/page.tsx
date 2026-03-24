import type {Metadata, Route} from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {ArrowRight, CalendarDays} from 'lucide-react'

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

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(217,70,239,0.18),_transparent_40%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.16),_transparent_30%)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <Badge className="border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200">FPL Content Hub</Badge>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">FPL guides, captain picks, and transfer strategy that support your next move.</h1>
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

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        {posts.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader>
              <CardTitle>No blog posts published yet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-300">
              <p>Your Sanity integration is live. Publish your first article in the Studio and it will appear here automatically.</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/login" className="inline-flex items-center rounded-lg bg-fuchsia-600 px-4 py-2 font-medium text-white transition-colors hover:bg-fuchsia-500">
                  Go to app
                </Link>
                <Link href="/fixtures" className="inline-flex items-center rounded-lg border border-slate-700 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-800">
                  Explore fixtures
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {posts.map((post: BlogPostPreview) => {
              const coverImageUrl = post.coverImage?.asset ? urlForImage(post.coverImage).width(1200).height(675).fit('crop').auto('format').url() : null

              return (
                <Link key={post._id} href={`/blog/${post.slug}` as Route} className="group block">
                  <Card className="h-full overflow-hidden border-slate-800 bg-slate-900/70 transition-all duration-200 hover:border-fuchsia-500/40 hover:bg-slate-900">
                    <div className="relative aspect-[16/9] overflow-hidden border-b border-slate-800 bg-gradient-to-br from-fuchsia-900/30 via-slate-900 to-indigo-900/30">
                      {coverImageUrl ? (
                        <Image
                          src={coverImageUrl}
                          alt={post.title}
                          width={1200}
                          height={675}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-full items-end bg-[radial-gradient(circle_at_top_left,_rgba(217,70,239,0.22),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.2),_transparent_30%)] p-6 text-sm font-medium text-slate-300">
                          FPL Companion Blog
                        </div>
                      )}
                    </div>
                    <CardHeader className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" />
                          {formatDate(post.publishedAt)}
                        </span>
                        {post.author?.name ? <span>By {post.author.name}</span> : null}
                      </div>
                      <CardTitle className="text-2xl text-white transition-colors group-hover:text-fuchsia-200">{post.title}</CardTitle>
                      <p className="text-base leading-7 text-slate-300">{post.excerpt}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {post.categories?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {post.categories.map((category: BlogCategory) => (
                            <Badge key={`${post._id}-${category.title}`} className="border-slate-700 bg-slate-800 text-slate-200">
                              {category.title}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                      <div className="inline-flex items-center gap-2 font-medium text-fuchsia-300 transition-colors group-hover:text-fuchsia-200">
                        Read article
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
