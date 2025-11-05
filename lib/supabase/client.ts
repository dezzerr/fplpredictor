import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const createClient = () => {
  try {
    return createClientComponentClient()
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    throw new Error('Supabase client initialization failed. Please check your environment variables.')
  }
}
