export interface RateLimitResult {
  allowed: boolean;
  // Requests left in the current window (0 when blocked).
  remaining: number;
  // How long to wait before trying again (0 when allowed).
  retryAfterSeconds: number;
}

export interface RateLimiterOptions {
  // At most this many requests...
  limit: number;
  // ...in any window of this many milliseconds.
  windowMs: number;
  // How many different clients are remembered at most (protects memory).
  maxKeys?: number;
  // The clock. Replaceable in tests.
  now?: () => number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
  // How many clients are remembered right now.
  size(): number;
}

// A sliding-window limiter kept in memory. It remembers the time of each recent request per
// client. Limits: it forgets everything on restart and does not work across several servers.
export function createRateLimiter({ limit, windowMs, maxKeys = 10_000, now = Date.now }: RateLimiterOptions): RateLimiter {
  if (!Number.isInteger(limit) || limit < 1) throw new Error("limit must be a whole number of 1 or more");
  if (!Number.isFinite(windowMs) || windowMs <= 0) throw new Error("windowMs must be more than 0");
  if (!Number.isInteger(maxKeys) || maxKeys < 1) throw new Error("maxKeys must be a whole number of 1 or more");

  const hits = new Map<string, number[]>();

  function forgetOldClients(windowStart: number) {
    if (hits.size <= maxKeys) return;
    for (const [key, times] of hits) {
      if (times[times.length - 1] <= windowStart) hits.delete(key);
    }
    // Still too many active clients: drop the ones remembered longest.
    for (const key of hits.keys()) {
      if (hits.size <= maxKeys) break;
      hits.delete(key);
    }
  }

  return {
    check(key) {
      const current = now();
      const windowStart = current - windowMs;
      const recent = (hits.get(key) ?? []).filter((time) => time > windowStart);

      if (recent.length >= limit) {
        hits.set(key, recent);
        // The oldest request leaves the window first; that is when a place frees up.
        const wait = Math.ceil((recent[0] + windowMs - current) / 1000);
        return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, wait) };
      }

      // Blocked requests are not recorded, so waiting is never punished with more waiting.
      recent.push(current);
      hits.set(key, recent);
      forgetOldClients(windowStart);
      return { allowed: true, remaining: limit - recent.length, retryAfterSeconds: 0 };
    },
    size: () => hits.size,
  };
}
