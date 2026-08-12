import {createClient} from '@sanity/client'
import groq from 'groq'

export const SANITY_PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? '50z71eov'
export const SANITY_DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
export const SANITY_API_VERSION = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2026-03-24'
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fplcompanion.co.uk'

export interface SanitySlug {
  current: string
}

export interface SanityImage {
  asset?: {
    _ref?: string
    url?: string
  }
}

export interface BlogAuthor {
  name: string
  slug?: SanitySlug | null
  xHandle?: string | null
}

export interface BlogCategory {
  title: string
  slug?: SanitySlug | null
}

export interface BlogPostPreview {
  _id: string
  _updatedAt?: string
  title: string
  slug: string
  excerpt: string
  publishedAt: string
  coverImage?: SanityImage | null
  author?: BlogAuthor | null
  categories?: BlogCategory[]
}

export interface BlogPost extends BlogPostPreview {
  body: any[]
  seoTitle?: string | null
  seoDescription?: string | null
  ogImage?: SanityImage | null
}

export const sanityClient = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: SANITY_API_VERSION,
  useCdn: process.env.NODE_ENV === 'production',
})

function textFromPortable(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(textFromPortable).join(' ').trim()
  if (value && typeof value === 'object') {
    const obj = value as {text?: unknown; children?: unknown[]}
    if (typeof obj.text === 'string') return obj.text
    if (Array.isArray(obj.children)) return obj.children.map(textFromPortable).join(' ').trim()
  }
  return ''
}

function normalizeExcerpt(value: unknown): string {
  return textFromPortable(value).replace(/\s+/g, ' ').trim()
}

function normalizePostPreview(post: BlogPostPreview): BlogPostPreview {
  return {
    ...post,
    excerpt: normalizeExcerpt(post.excerpt),
  }
}

function normalizePost(post: BlogPost): BlogPost {
  return {
    ...post,
    excerpt: normalizeExcerpt(post.excerpt),
  }
}

const postPreviewProjection = groq`{
  _id,
  _updatedAt,
  title,
  "slug": slug.current,
  "excerpt": coalesce(pt::text(excerpt), excerpt, ""),
  publishedAt,
  coverImage,
  "author": author->{name, slug, xHandle},
  "categories": categories[]->{title, slug}
}`

const allPostsQuery = groq`*[_type == "post" && defined(slug.current)] | order(coalesce(publishedAt, _createdAt) desc) ${postPreviewProjection}`

const postBySlugQuery = groq`*[_type == "post" && slug.current == $slug][0] {
  _id,
  _updatedAt,
  title,
  "slug": slug.current,
  "excerpt": coalesce(pt::text(excerpt), excerpt, ""),
  publishedAt,
  coverImage,
  body,
  seoTitle,
  seoDescription,
  ogImage,
  "author": author->{name, slug, xHandle},
  "categories": categories[]->{title, slug}
}`

const postSlugsQuery = groq`*[_type == "post" && defined(slug.current)][].slug.current`

const sitemapPostsQuery = groq`*[_type == "post" && defined(slug.current)][]{
  "slug": slug.current,
  publishedAt,
  _updatedAt
}`

export async function getAllPosts() {
  try {
    const posts = await sanityClient.fetch<BlogPostPreview[]>(allPostsQuery)
    return posts.map(normalizePostPreview)
  } catch (error) {
    console.error('Failed to fetch Sanity blog posts', error)
    return null
  }
}

export async function getPostBySlug(slug: string) {
  try {
    const post = await sanityClient.fetch<BlogPost | null>(postBySlugQuery, {slug})
    return post ? normalizePost(post) : null
  } catch (error) {
    console.error(`Failed to fetch Sanity post for slug ${slug}`, error)
    return null
  }
}

export async function getAllPostSlugs() {
  try {
    return await sanityClient.fetch<string[]>(postSlugsQuery)
  } catch (error) {
    console.error('Failed to fetch Sanity post slugs', error)
    return []
  }
}

export async function getPostsForSitemap() {
  try {
    return await sanityClient.fetch<Array<{slug: string; publishedAt?: string; _updatedAt?: string}>>(sitemapPostsQuery)
  } catch (error) {
    console.error('Failed to fetch Sanity sitemap posts', error)
    return []
  }
}
