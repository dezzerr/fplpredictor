import { NextResponse } from 'next/server'
import { getAllPosts } from '@/lib/sanity/client'
import { rateLimitGuard } from '@/lib/request-security'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const protection = await rateLimitGuard(request, 'blog-posts', 30, 60_000)
  if (protection) return protection

  try {
    const posts = await getAllPosts()
    if (!posts) {
      return NextResponse.json(
        { error: 'Blog content is temporarily unavailable', source: 'unavailable' },
        { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } },
      )
    }
    return NextResponse.json(posts.slice(0, 4), {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Failed to fetch blog posts for homepage:', error)
    return NextResponse.json(
      { error: 'Blog content is temporarily unavailable', source: 'unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    )
  }
}
