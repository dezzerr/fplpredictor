'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function TestSupabasePage() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading')
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    try {
      const supabase = createClient()
      
      // Test 1: Check if client can be created
      if (!supabase) {
        throw new Error('Failed to create Supabase client')
      }

      // Test 2: Check environment variables
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!url || !key) {
        throw new Error('Missing environment variables')
      }

      // Test 3: Try to get user (will be null if not signed in, but shouldn't error)
      const { data, error } = await supabase.auth.getUser()
      
      if (error && error.message !== 'Auth session missing!') {
        throw error
      }

      setUser(data.user)
      setStatus('connected')
    } catch (err: any) {
      setError(err.message)
      setStatus('error')
    }
  }

  const testSignUp = async () => {
    try {
      const supabase = createClient()
      const testEmail = `test+${Date.now()}@example.com`
      const testPassword = 'testpassword123'

      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
      })

      if (error) throw error

      alert('Test signup successful! Check your email for confirmation.')
    } catch (err: any) {
      alert(`Signup test failed: ${err.message}`)
    }
  }

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="text-2xl font-bold mb-6">Supabase Connection Test</h1>
      
      <div className="space-y-4">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Connection Status</h2>
          
          {status === 'loading' && (
            <div className="text-blue-600">Testing connection...</div>
          )}
          
          {status === 'connected' && (
            <div className="text-green-600">
              ✅ Supabase connected successfully!
              {user && <div className="mt-2">Signed in as: {user.email}</div>}
              {!user && <div className="mt-2">Not signed in (this is normal)</div>}
            </div>
          )}
          
          {status === 'error' && (
            <div className="text-red-600">
              ❌ Connection failed: {error}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Environment Check</h2>
          <div className="space-y-2 text-sm">
            <div>
              SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}
            </div>
            <div>
              SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Tests</h2>
          <div className="space-y-2">
            <Button onClick={testConnection} variant="outline">
              Test Connection Again
            </Button>
            <Button onClick={testSignUp} variant="outline">
              Test Signup (Creates Test User)
            </Button>
            <Button asChild variant="outline">
              <a href="/login">Go to Login Page</a>
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Next Steps</h2>
          <div className="text-sm space-y-2">
            {status === 'error' && (
              <div>
                1. Check your `.env.local` file has the correct Supabase credentials<br/>
                2. Restart your development server: `npm run dev`<br/>
                3. Verify your Supabase project is active
              </div>
            )}
            {status === 'connected' && (
              <div>
                1. ✅ Connection working<br/>
                2. Test the login page: <a href="/login" className="text-blue-600 underline">/login</a><br/>
                3. Try saving a squad from the main page<br/>
                4. Check your Supabase dashboard for data
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
