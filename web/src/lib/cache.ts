type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cacheKey(key: string): string {
  return `lifeos:cache:${key}`;
}

export function getCache<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(cacheKey(key));
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > ttlMs) {
      sessionStorage.removeItem(cacheKey(key));
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;

  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    sessionStorage.setItem(cacheKey(key), JSON.stringify(entry));
  } catch {
    // Ignore storage errors (e.g., quota exceeded, private mode).
  }
}

export function invalidateCache(pattern?: string): void {
  if (typeof window === 'undefined') return;

  try {
    const prefix = cacheKey(pattern ?? '');
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(prefix)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore storage errors.
  }
}
