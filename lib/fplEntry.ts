const MAX_ENTRY_ID = 99_999_999
const OFFICIAL_FPL_HOST = 'fantasy.premierleague.com'

/** Returns a canonical FPL entry ID from a plain ID or official entry URL. */
export function parseFplEntryId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const input = value.trim()
  if (!input) return null

  if (/^\d+$/.test(input)) return validEntryId(input) ? String(Number(input)) : null

  let url: URL
  try {
    url = new URL(input)
  } catch {
    return null
  }

  if (url.protocol !== 'https:' || url.hostname !== OFFICIAL_FPL_HOST) return null
  const match = url.pathname.match(/^\/entry\/(\d+)(?:\/|$)/)
  return match && validEntryId(match[1]) ? String(Number(match[1])) : null
}

export function validEntryId(value: string): boolean {
  if (!/^\d+$/.test(value)) return false
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 && id <= MAX_ENTRY_ID
}
