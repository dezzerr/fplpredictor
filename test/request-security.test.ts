import test from 'node:test'
import assert from 'node:assert/strict'
import {
  rateLimitGuard,
  readConfiguredSecret,
  sameOriginGuard,
} from '@/lib/request-security'
import { isUsableSupabaseServiceKey } from '@/lib/supabase/service-key'

test('rejects cross-origin browser requests while allowing the configured site origin', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
  process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com'

  const crossOrigin = new Request('https://example.com/api/test', {
    headers: { Origin: 'https://attacker.example' },
  })
  assert.equal(sameOriginGuard(crossOrigin)?.status, 403)

  const sameOrigin = new Request('https://example.com/api/test', {
    headers: { Origin: 'https://example.com' },
  })
  assert.equal(sameOriginGuard(sameOrigin), null)

  if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
  else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl
})

test('rate limits repeated requests and compares scan secrets safely', async () => {
  const request = new Request('https://example.com/api/test')
  assert.equal(await rateLimitGuard(request, 'security-test', 1, 60_000), null)
  assert.equal((await rateLimitGuard(request, 'security-test', 1, 60_000))?.status, 429)

  const originalSecret = process.env.SCAN_SECRET
  process.env.SCAN_SECRET = 'test-secret'
  const validRequest = new Request('https://example.com/api/scan', {
    headers: { 'x-scan-secret': 'test-secret' },
  })
  const invalidRequest = new Request('https://example.com/api/scan', {
    headers: { 'x-scan-secret': 'wrong-secret' },
  })
  assert.deepEqual(readConfiguredSecret(validRequest, 'x-scan-secret', 'SCAN_SECRET'), { configured: true, valid: true })
  assert.deepEqual(readConfiguredSecret(invalidRequest, 'x-scan-secret', 'SCAN_SECRET'), { configured: true, valid: false })

  if (originalSecret === undefined) delete process.env.SCAN_SECRET
  else process.env.SCAN_SECRET = originalSecret
})

test('service-role configuration rejects placeholders, URLs, and anon keys', () => {
  const syntheticSecretKey = ['sb', 'secret', 'x'.repeat(32)].join('_')
  const jwt = (role: string) => [
    Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url'),
    Buffer.from(JSON.stringify({ role })).toString('base64url'),
    'signature',
  ].join('.')

  assert.equal(isUsableSupabaseServiceKey('your_service_role_key'), false)
  assert.equal(isUsableSupabaseServiceKey('https://project.supabase.co/rest/v1/'), false)
  assert.equal(isUsableSupabaseServiceKey('sb_publishable_abcdefghijklmnopqrstuv_12345678'), false)
  assert.equal(isUsableSupabaseServiceKey(jwt('anon')), false)
  assert.equal(isUsableSupabaseServiceKey(jwt('service_role')), true)
  assert.equal(isUsableSupabaseServiceKey(syntheticSecretKey), true)
})
