import { NextResponse } from 'next/server'
import { getAllPosts } from '@/lib/sanity/client'

export async function GET() {
  try {
    const posts = await getAllPosts()
    return NextResponse.json(posts)
  } catch (error) {
    console.error('Failed to fetch blog posts for homepage:', error)
    return NextResponse.json([])
  }
}
