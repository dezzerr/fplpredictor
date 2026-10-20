/**
 * The new publishable-key variable is preferred so deployments can migrate
 * away from the legacy anon-key variable without interrupting sessions.
 */
export function getSupabasePublicKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!key) {
    throw new Error('Supabase public key is not configured')
  }

  return key
}
