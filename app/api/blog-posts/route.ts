import { NextResponse } from 'next/server'
import { getAllPosts } from '@/lib/sanity/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const posts = await getAllPosts()
    return NextResponse.json(posts.slice(0, 4), {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Failed to fetch blog posts for homepage:', error)
    return NextResponse.json([], {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  }
}
