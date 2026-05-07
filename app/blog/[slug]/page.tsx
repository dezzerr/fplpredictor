import {PortableText} from '@portabletext/react'
import type {Metadata, Route} from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {ArrowLeft, ArrowRight, CalendarDays} from 'lucide-react'

import {PublicNavbar} from '@/components/PublicNavbar'
import {portableTextComponents} from '@/components/blog/PortableTextComponents'
import {Badge} from '@/components/ui/badge'
import {getAllPostSlugs, getPostBySlug, siteUrl, type BlogCategory} from '@/lib/sanity/client'
import {urlForImage} from '@/lib/sanity/image'

export const revalidate = 300

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {dateStyle: 'long'}).format(new Date(value))
}

interface BlogPostPageProps {
  params: {
    slug: string
  }
}

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs()

  return slugs.map((slug: string) => ({slug}))
}

export async function generateMetadata({params}: BlogPostPageProps): Promise<Metadata> {
  const post = await getPostBySlug(params.slug)

  if (!post) {
    return {
      title: 'Post not found',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const title = post.seoTitle || post.title
  const description = post.seoDescription || post.excerpt
  const socialImage = post.ogImage ?? post.coverImage
  const socialImageUrl = socialImage?.asset ? urlForImage(socialImage).width(1200).height(630).fit('crop').auto('format').url() : undefined

  return {
    title,
    description,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${siteUrl}/blog/${post.slug}`,
      publishedTime: post.publishedAt,
      authors: post.author?.name ? [post.author.name] : undefined,
      images: socialImageUrl ? [{url: socialImageUrl, width: 1200, height: 630, alt: post.title}] : undefined,
    },
    twitter: {
      card: socialImageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      images: socialImageUrl ? [socialImageUrl] : undefined,
    },
  }
}

export default async function BlogPostPage({params}: BlogPostPageProps) {
  const post = await getPostBySlug(params.slug)

  if (!post) {
    notFound()
  }

  const coverImageUrl = post.coverImage?.asset ? urlForImage(post.coverImage).width(1600).height(900).fit('crop').auto('format').url() : null
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post._updatedAt || post.publishedAt,
    mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
    author: post.author?.name
      ? {
          '@type': 'Person',
          name: post.author.name,
        }
      : undefined,
    publisher: {
      '@type': 'Organization',
      name: 'FPL Companion',
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/icon.svg`,
      },
    },
    image: coverImageUrl ? [coverImageUrl] : undefined,
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <PublicNavbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}} />
      <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <Link href={'/blog' as Route} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to blog
        </Link>

        <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {formatDate(post.publishedAt)}
          </span>
          {post.author?.name ? <span>By {post.author.name}</span> : null}
        </div>

        <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">{post.title}</h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">{post.excerpt}</p>

        {post.categories?.length ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {post.categories.map((category: BlogCategory) => (
              <Badge key={`${post._id}-${category.title}`} className="border-slate-200 bg-slate-100 text-slate-600">
                {category.title}
              </Badge>
            ))}
          </div>
        ) : null}

        {coverImageUrl ? (
          <div className="mt-10 overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <Image src={coverImageUrl} alt={post.title} width={1600} height={900} className="h-auto w-full object-cover" priority />
          </div>
        ) : null}

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <PortableText value={post.body} components={portableTextComponents} />
        </div>

        <div className="mt-12 rounded-3xl border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-indigo-50 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-slate-900">Put this advice into action</h2>
          <p className="mt-4 max-w-2xl text-slate-600">Move from content to decisions with player comparison, fixture analysis, and squad optimization tools inside FPL Companion.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/compare" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-5 py-3 font-semibold text-white transition-colors hover:from-fuchsia-500 hover:to-indigo-500 shadow-lg shadow-fuchsia-500/20">
              Compare players
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="inline-flex items-center rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-100">
              Open FPL Companion
            </Link>
          </div>
        </div>
      </article>
    </main>
  )
}
