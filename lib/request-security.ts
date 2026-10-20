import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getConfiguredSupabaseServiceKey } from '@/lib/supabase/service-key'

type RateLimitState = {
  count: number
  resetAt: number
}

const rateLimitState = new Map<string, RateLimitState>()
const MAX_TRACKED_KEYS = 10_000

function clientIdentity(request: Request) {
  const trustedPlatformIp = request.headers.get('x-nf-client-connection-ip') ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip')
  if (trustedPlatformIp) return trustedPlatformIp

  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'forwarded-unknown'
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || 'unknown'
}

function configuredSiteOrigin() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!raw) return null

  try {
    return new URL(raw).origin
  } catch {
    return null
  }
}

/**
 * Browser state-changing requests should carry an Origin matching this app.
 * Requests without Origin are allowed for server-to-server callers; those
 * callers still need route-specific authentication or a secret.
 */
export function sameOriginGuard(request: Request): NextResponse | null {
  const origin = request.headers.get('origin')
  if (!origin) return null

  let requestOrigin: string
  try {
    requestOrigin = new URL(request.url).origin
  } catch {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 400 })
  }

  const allowed = new Set([requestOrigin])
  const configured = configuredSiteOrigin()
  if (configured) allowed.add(configured)

  if (!allowed.has(origin)) {
    return NextResponse.json({ error: 'Cross-origin request rejected' }, { status: 403 })
  }

  return null
}

function localRateLimitGuard(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  const now = Date.now()
  const key = `${scope}:${clientIdentity(request)}`
  const current = rateLimitState.get(key)

  if (!current || current.resetAt <= now) {
    rateLimitState.set(key, { count: 1, resetAt: now + windowMs })
  } else if (current.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  } else {
    current.count += 1
  }

  if (rateLimitState.size > MAX_TRACKED_KEYS) {
    for (const [entryKey, entry] of rateLimitState) {
      if (entry.resetAt <= now) rateLimitState.delete(entryKey)
      if (rateLimitState.size <= MAX_TRACKED_KEYS) break
    }
  }

  return null
}

function rateLimitError(retryAfter: number) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  )
}

export async function rateLimitGuard(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
  identity?: string,
): Promise<NextResponse | null> {
  const key = identity ? `${scope}:user:${identity}` : `${scope}:ip:${clientIdentity(request)}`
  const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getConfiguredSupabaseServiceKey())

  if (process.env.NODE_ENV === 'test' || !hasSupabase) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Rate limiting is not configured.' }, { status: 503 })
    }
    return localRateLimitGuard(request, scope, limit, windowMs)
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('consume_api_rate_limit', {
      p_scope: scope,
      p_rate_key: key,
      p_limit: limit,
      p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
    })
    if (error || !data?.[0]) throw error ?? new Error('Rate limiter returned no result')
    const result = data[0]
    return result.allowed ? null : rateLimitError(result.retry_after)
  } catch (error) {
    console.error('Shared rate limit error:', error)
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Using the local development rate limiter instead.')
      return localRateLimitGuard(request, scope, limit, windowMs)
    }
    return NextResponse.json({ error: 'Rate limiting is temporarily unavailable.' }, { status: 503 })
  }
}

export async function protectRequest(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
): Promise<NextResponse | null> {
  return sameOriginGuard(request) ?? await rateLimitGuard(request, scope, limit, windowMs)
}

export function readConfiguredSecret(request: Request, headerName: string, envName: string) {
  const expected = process.env[envName]?.trim()
  if (!expected) return { configured: false, valid: false }

  const received = request.headers.get(headerName)?.trim() || ''
  const expectedBytes = Buffer.from(expected)
  const receivedBytes = Buffer.from(received)
  const valid = expectedBytes.length === receivedBytes.length &&
    timingSafeEqual(expectedBytes, receivedBytes)

  return { configured: true, valid }
}
