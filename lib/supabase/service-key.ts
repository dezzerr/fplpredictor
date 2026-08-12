/**
 * Supabase accepts new `sb_secret_...` keys and legacy JWT service-role keys.
 * Treat examples, URLs, publishable keys, and anon JWTs as unconfigured so a
 * bad local placeholder cannot make every rate-limited API route return 503.
 */
export function isUsableSupabaseServiceKey(value: string | null | undefined): boolean {
  const key = value?.trim()
  if (!key || /^(your_|replace_|example)/i.test(key)) return false
  if (/^sb_secret_[A-Za-z0-9_-]{20,}$/.test(key)) return true

  const parts = key.split('.')
  if (parts.length !== 3) return false

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { role?: unknown }
    return payload.role === 'service_role'
  } catch {
    return false
  }
}

export function getConfiguredSupabaseServiceKey(): string | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return isUsableSupabaseServiceKey(key) ? key! : null
}
