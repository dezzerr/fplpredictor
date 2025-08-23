/* Simple in-memory TTL cache for server-side usage (odds, mappings, etc.) */

export type CacheEntry<V> = { value: V; expiresAt: number };

export class TTLCache<K, V> {
  private store = new Map<K, CacheEntry<V>>();
  private defaultTtlMs: number;

  constructor(defaultTtlMs?: number) {
    const envTtl = Number(process.env.ODDS_CACHE_TTL_SECONDS || 600);
    this.defaultTtlMs = defaultTtlMs ?? envTtl * 1000;
  }

  set(key: K, value: V, ttlMs?: number) {
    const now = Date.now();
    const ttl = typeof ttlMs === 'number' ? ttlMs : this.defaultTtlMs;
    this.store.set(key, { value, expiresAt: now + ttl });
  }

  get(key: K): V | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (Date.now() > e.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return e.value;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

// Shared cache instance for odds-related fetchers.
export const oddsCache = new TTLCache<string, unknown>();

// Helper: fetch with cache. If cache hit, returns cached value, else awaits fetcher and caches it.
export async function withCache<T>(
  cache: TTLCache<string, unknown>,
  key: string,
  fetcher: () => Promise<T>,
  ttlMs?: number
): Promise<T> {
  const hit = cache.get(key) as T | undefined;
  if (hit !== undefined) return hit;
  const val = await fetcher();
  cache.set(key, val as unknown, ttlMs);
  return val;
}
