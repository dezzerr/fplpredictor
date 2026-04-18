'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { PublicNavbar } from '@/components/PublicNavbar'
import HomeHero from '@/components/home/HomeHero'
import HomeFeatures from '@/components/home/HomeFeatures'
import HomeHowItWorks from '@/components/home/HomeHowItWorks'
import HomeBlog from '@/components/home/HomeBlog'
import HomeCTA from '@/components/home/HomeCTA'

export default function RootPage() {
  const [isChecking, setIsChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          // User is logged in, redirect to squad page
          router.push('/squad')
        } else {
          // User is not logged in, show home page
          setIsChecking(false)
        }
      } catch (error) {
        console.error('Auth check error:', error)
        // On error, show home page
        setIsChecking(false)
      }
    }

    checkAuth()
  }, [router])

  // Show loading state while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-12 h-12 bg-gradient-to-br from-fuchsia-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-fuchsia-500/20">
            <svg className="w-6 h-6 text-white transform rotate-[-45deg]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
          <div className="text-slate-500 text-sm font-medium">Loading FPL Companion...</div>
        </div>
      </div>
    )
  }

  // Show home page for non-authenticated users
  return (
    <div className="min-h-screen selection:bg-fuchsia-500/30">
      <PublicNavbar />
      <HomeHero />
      <HomeFeatures />
      <HomeHowItWorks />
      <HomeBlog />
      <HomeCTA />
    </div>
  )
}
