import { createBrowserClient } from '@supabase/ssr'
import { getSupabasePublicKey } from './public-key'

export const createClient = () => {
  try {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      getSupabasePublicKey()
    )
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    throw new Error('Supabase client initialization failed. Please check your environment variables.')
  }
}
