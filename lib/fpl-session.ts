import 'server-only'

import crypto from 'crypto'
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type StoredFplSession = {
  userId: string
  managerId: number
  cookies: string
  expiresAt: string
}

type AuthenticatedUser = {
  id: string
}

const FPL_BASE_URL = 'https://fantasy.premierleague.com'
const PL_LOGIN_URL = 'https://users.premierleague.com/accounts/login/'
const COOKIE_IV_LENGTH = 12

function createFplNetworkError(error: unknown) {
  const cause =
    typeof error === 'object' && error && 'cause' in error
      ? ((error as { cause?: { code?: string; hostname?: string } }).cause ?? {})
      : {}

  if (cause.code === 'ENOTFOUND') {
    return Object.assign(
      new Error(
        `Could not reach FPL login service (${cause.hostname || 'users.premierleague.com'}). Check DNS/network and try again.`
      ),
      { status: 503 }
    )
  }

  if (cause.code === 'ETIMEDOUT' || cause.code === 'ECONNREFUSED' || cause.code === 'ECONNRESET') {
    return Object.assign(new Error('FPL login service is temporarily unreachable. Please try again.'), {
      status: 503,
    })
  }

  return Object.assign(new Error('Failed to reach FPL login service. Please try again.'), { status: 503 })
}

function getEncryptionKey() {
  const raw = process.env.FPL_SESSION_ENCRYPTION_KEY
  if (!raw) {
    throw new Error('FPL_SESSION_ENCRYPTION_KEY is not configured')
  }

  if (/^[a-f0-9]{64}$/i.test(raw)) {
    return Buffer.from(raw, 'hex')
  }

  if (raw.length >= 32) {
    return crypto.createHash('sha256').update(raw).digest()
  }

  throw new Error('FPL_SESSION_ENCRYPTION_KEY must be at least 32 characters or a 64-character hex key')
}

export function encryptFplCookies(cookies: string) {
  const iv = crypto.randomBytes(COOKIE_IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(cookies, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`
}

export function decryptFplCookies(payload: string) {
  const [version, ivRaw, tagRaw, encryptedRaw] = payload.split(':')
  if (version !== 'v1' || !ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error('Invalid FPL session cookie payload')
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivRaw, 'base64'))
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

function serializeSetCookies(headers: Headers) {
  const maybeGetSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.()
  const setCookies = Array.isArray(maybeGetSetCookie) ? maybeGetSetCookie : []
  const fallback = headers.get('set-cookie')
  const all = setCookies.length ? setCookies : fallback ? [fallback] : []

  return all
    .flatMap((header) => header.split(/,(?=\s*[^;,=]+=[^;,]+)/g))
    .map((cookie) => cookie.split(';')[0]?.trim())
    .filter((cookie): cookie is string => Boolean(cookie && cookie.includes('=')))
    .join('; ')
}

async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return { id: user.id }
}

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser()
  if (!user) {
    throw Object.assign(new Error('You must be logged in'), { status: 401 })
  }
  return user
}

async function fetchEntry(managerId: number) {
  try {
    const res = await fetch(`${FPL_BASE_URL}/api/entry/${managerId}/`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function loginToFpl(args: { email: string; password: string }) {
  const body = new URLSearchParams({
    login: args.email,
    password: args.password,
    app: 'plfpl-web',
    redirect_uri: `${FPL_BASE_URL}/`,
  })

  let res: Response
  try {
    res = await fetch(PL_LOGIN_URL, {
      method: 'POST',
      redirect: 'manual',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: FPL_BASE_URL,
        Referer: `${FPL_BASE_URL}/`,
        'User-Agent': 'Mozilla/5.0 FPL Companion',
      },
      body,
    })
  } catch (error) {
    throw createFplNetworkError(error)
  }

  const cookies = serializeSetCookies(res.headers)
  const hasSession = /pl_profile=|sessionid=|csrftoken=/.test(cookies)

  if (!hasSession) {
    throw Object.assign(new Error('FPL login failed. Check your credentials and try again.'), { status: 401 })
  }

  let meRes: Response
  try {
    meRes = await fetch(`${FPL_BASE_URL}/api/me/`, {
      cache: 'no-store',
      headers: {
        Cookie: cookies,
        Referer: `${FPL_BASE_URL}/`,
        'User-Agent': 'Mozilla/5.0 FPL Companion',
      },
    })
  } catch (error) {
    throw createFplNetworkError(error)
  }

  if (!meRes.ok) {
    throw Object.assign(new Error('FPL login succeeded but manager details could not be verified.'), { status: 502 })
  }

  const me = await meRes.json()
  const player = Array.isArray(me?.player?.entry) ? me.player.entry[0] : me?.player?.entry
  const managerId = Number(player?.id || player?.entry || me?.player?.entry_id || me?.entry?.id)

  if (!Number.isFinite(managerId) || managerId <= 0) {
    throw Object.assign(new Error('Could not find a Fantasy Premier League team on this account.'), { status: 422 })
  }

  const entry = await fetchEntry(managerId)
  const teamName = entry?.name || player?.name || 'Unknown Team'
  const playerName = [entry?.player_first_name, entry?.player_last_name].filter(Boolean).join(' ').trim() || undefined

  return {
    cookies,
    managerId,
    teamName,
    playerName,
  }
}

export async function storeFplSession(args: {
  userId: string
  managerId: number
  cookies: string
}) {
  const admin = createAdminClient()
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString()

  const { error } = await admin
    .from('fpl_sessions')
    .upsert({
      user_id: args.userId,
      manager_id: args.managerId,
      encrypted_cookies: encryptFplCookies(args.cookies),
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    })

  if (error) {
    throw new Error(`Failed to store FPL session: ${error.message}`)
  }

  await admin
    .from('profiles')
    .update({ fpl_team_id: args.managerId })
    .eq('id', args.userId)

  return expiresAt
}

export async function getStoredFplSession(userId: string): Promise<StoredFplSession | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('fpl_sessions')
    .select('manager_id, encrypted_cookies, expires_at')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null

  const expiresAt = new Date(data.expires_at)
  if (expiresAt < new Date()) return null

  if (!data.encrypted_cookies) return null

  return {
    userId,
    managerId: data.manager_id,
    cookies: decryptFplCookies(data.encrypted_cookies),
    expiresAt: data.expires_at,
  }
}

export async function requireStoredFplSession() {
  const user = await requireAuthenticatedUser()
  const session = await getStoredFplSession(user.id)
  if (!session) {
    throw Object.assign(new Error('Connect your FPL account again before applying changes.'), { status: 401 })
  }
  return session
}

export async function deleteFplSession(userId: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('fpl_sessions')
    .delete()
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to delete FPL session: ${error.message}`)
  }
}
