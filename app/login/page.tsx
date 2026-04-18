'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { PublicNavbar } from '@/components/PublicNavbar'
import type { SupabaseClient } from '@supabase/supabase-js'

export default function LoginPage() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [clientInitError, setClientInitError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    try {
      setSupabase(createClient())
    } catch (error) {
      console.error('Supabase client initialization failed:', error)
      setClientInitError('Authentication is temporarily unavailable. Please try again later.')
    }
  }, [])

  useEffect(() => {
    if (!supabase) return

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.push('/squad')
        router.refresh()
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Background gradient effects - matching home page */}
      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600/20 via-transparent to-cyan-600/20" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-fuchsia-500/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/30 rounded-full blur-3xl" />
      
      {/* Header */}
      <PublicNavbar />

      {/* Main Content */}
      <div className="relative flex min-h-[calc(100vh-100px)] flex-col items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8">
          {/* Title */}
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-400 text-transparent bg-clip-text">
                FPL Companion
              </span>
            </h1>
            <p className="text-lg text-slate-300">
              Sign in to save your squads and track your performance
            </p>
          </div>

          {/* Auth Card */}
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-fuchsia-600 to-cyan-600 rounded-2xl blur-xl opacity-50" />
            
            {/* Card */}
            <div className="relative bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
              {clientInitError ? (
                <p className="text-sm text-red-300">{clientInitError}</p>
              ) : supabase ? (
                <Auth
                  supabaseClient={supabase}
                  appearance={{
                    theme: ThemeSupa,
                    variables: {
                      default: {
                        colors: {
                          brand: '#d946ef',
                          brandAccent: '#c026d3',
                          brandButtonText: 'white',
                          defaultButtonBackground: '#1e293b',
                          defaultButtonBackgroundHover: '#334155',
                          defaultButtonBorder: '#475569',
                          defaultButtonText: 'white',
                          dividerBackground: '#475569',
                          inputBackground: '#1e293b',
                          inputBorder: '#475569',
                          inputBorderHover: '#64748b',
                          inputBorderFocus: '#d946ef',
                          inputText: 'white',
                          inputPlaceholder: '#94a3b8',
                        },
                        space: {
                          spaceSmall: '8px',
                          spaceMedium: '12px',
                          spaceLarge: '16px',
                        },
                        borderWidths: {
                          buttonBorderWidth: '1px',
                          inputBorderWidth: '1px',
                        },
                        radii: {
                          borderRadiusButton: '8px',
                          buttonBorderRadius: '8px',
                          inputBorderRadius: '8px',
                        },
                      },
                    },
                    className: {
                      container: 'auth-container',
                      label: 'text-slate-300',
                      button: 'font-semibold',
                      anchor: 'text-fuchsia-400 hover:text-fuchsia-300',
                    },
                  }}
                  theme="dark"
                  providers={['google']}
                  redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
                  showLinks={true}
                  view="sign_in"
                />
              ) : (
                <p className="text-sm text-slate-300">Preparing sign-in...</p>
              )}
            </div>
          </div>

          {/* Footer text */}
          <p className="text-center text-sm text-slate-400">
            By signing in, you agree to our{' '}
            <Link href="/" className="text-fuchsia-400 hover:text-fuchsia-300 transition-colors">
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link href="/" className="text-fuchsia-400 hover:text-fuchsia-300 transition-colors">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
