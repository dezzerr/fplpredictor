'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import HomeHero from '@/components/home/HomeHero'
import HomeFeatures from '@/components/home/HomeFeatures'
import HomeHowItWorks from '@/components/home/HomeHowItWorks'
import HomeWhyChoose from '@/components/home/HomeWhyChoose'
import HomeCTA from '@/components/home/HomeCTA'

export default function RootPage() {
  const [isChecking, setIsChecking] = useState(true)
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
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
  }, [supabase, router])

  // Show loading state while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  // Show home page for non-authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <HomeHero />
      <HomeFeatures />
      <HomeHowItWorks />
      <HomeWhyChoose />
      <HomeCTA />
    </div>
  )
}
