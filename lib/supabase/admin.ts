import 'server-only'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { getConfiguredSupabaseServiceKey } from '@/lib/supabase/service-key'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = getConfiguredSupabaseServiceKey()

  if (!url || !key) {
    throw new Error('Supabase admin client is not configured')
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
