/**
 * Simple cache utility with expiration support
 */

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const CACHE_STORAGE: Map<string, CacheEntry<any>> = new Map()

/**
 * Get a value from cache if it exists and hasn't expired
 */
export function getCached<T>(key: string): T | null {
  if (typeof window === 'undefined') return null

  // Try in-memory cache first (fastest)
  const cached = CACHE_STORAGE.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T
  }

  // Try localStorage as fallback
  try {
    const stored = localStorage.getItem(`cache:${key}`)
    if (stored) {
      const entry: CacheEntry<T> = JSON.parse(stored)
      if (entry.expiresAt > Date.now()) {
        // Restore to in-memory cache
        CACHE_STORAGE.set(key, entry)
        return entry.data
      } else {
        // Expired, remove it
        localStorage.removeItem(`cache:${key}`)
      }
    }
  } catch {
    // Ignore storage errors
  }

  return null
}

/**
 * Set a value in cache with expiration time
 * @param key Cache key
 * @param data Data to cache
 * @param expirationMs How long to keep in cache (milliseconds)
 */
export function setCache<T>(key: string, data: T, expirationMs: number = 3600000): void {
  if (typeof window === 'undefined') return

  const entry: CacheEntry<T> = {
    data,
    expiresAt: Date.now() + expirationMs,
  }

  // Store in both memory and localStorage
  CACHE_STORAGE.set(key, entry)

  try {
    localStorage.setItem(`cache:${key}`, JSON.stringify(entry))
  } catch {
    // Ignore storage errors (quota exceeded, etc)
  }
}

/**
 * Clear a specific cache entry
 */
export function clearCache(key: string): void {
  if (typeof window === 'undefined') return

  CACHE_STORAGE.delete(key)

  try {
    localStorage.removeItem(`cache:${key}`)
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
  if (typeof window === 'undefined') return

  CACHE_STORAGE.clear()

  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('cache:')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  } catch {
    // Ignore storage errors
  }
}
