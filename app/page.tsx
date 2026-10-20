'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { PublicNavbar } from '@/components/PublicNavbar'
import { LogoMark } from '@/components/brand/Logo'
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
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LogoMark className="h-14 w-14" animated idSuffix="loader" />
          <div className="text-slate-500 text-sm font-medium animate-pulse">Loading FPL Companion...</div>
        </div>
      </div>
    )
  }

  // Show home page for non-authenticated users
  return (
    <div className="min-h-screen selection:bg-violet-500/30">
      <PublicNavbar />
      <HomeHero />
      <HomeFeatures />
      <HomeHowItWorks />
      <HomeBlog />
      <HomeCTA />
    </div>
  )
}
