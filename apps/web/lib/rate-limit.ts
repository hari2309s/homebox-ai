/**
 * Simple in-memory sliding-window rate limiter keyed by an arbitrary string
 * (typically user ID). Each key gets a fixed-size ring buffer of timestamps;
 * a request is allowed only if fewer than `maxRequests` fall within the
 * trailing `windowMs`.
 *
 * **Limitations (acceptable for a self-hosted / single-instance deploy):**
 * - State is per-process — a Vercel cold-start or multiple instances each get
 *   a fresh window. For multi-instance enforcement, swap in Upstash Ratelimit
 *   or similar and keep the same `checkRateLimit` signature.
 * - Stale entries are only pruned on access, not on a timer, so a burst of
 *   unique keys that never return will linger until the process exits. The
 *   per-key memory is tiny (a few hundred bytes) so this is fine for any
 *   realistic user count.
 */

interface SlidingWindow {
  /** Ring buffer of request timestamps (epoch ms). */
  timestamps: number[];
  /** Points to the next slot to overwrite. */
  cursor: number;
}

const windows = new Map<string, SlidingWindow>();

export interface RateLimitConfig {
  /** Maximum requests allowed inside `windowMs`. */
  maxRequests: number;
  /** Sliding window duration in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Requests remaining in the current window (0 when denied). */
  remaining: number;
  /** Epoch ms when the earliest request in the window expires (the caller can
   *  surface this as a Retry-After header). */
  retryAfterMs: number;
}

/**
 * Returns whether a request under `key` is allowed, and updates the window
 * if so. Calling this is side-effect-free when the request is denied (the
 * denied attempt is not recorded).
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const cutoff = now - config.windowMs;

  let win = windows.get(key);
  if (!win) {
    win = { timestamps: [], cursor: 0 };
    windows.set(key, win);
  }

  // Count how many timestamps fall inside the window.
  const recent = win.timestamps.filter((t) => t > cutoff);

  if (recent.length >= config.maxRequests) {
    // Denied — find the earliest timestamp still in the window to compute
    // Retry-After.
    const earliest = Math.min(...recent);
    return { allowed: false, remaining: 0, retryAfterMs: earliest + config.windowMs };
  }

  // Allowed — record this request.
  if (win.timestamps.length < config.maxRequests) {
    // Ring buffer hasn't filled yet — append.
    win.timestamps.push(now);
  } else {
    // Overwrite the oldest slot.
    win.timestamps[win.cursor] = now;
    win.cursor = (win.cursor + 1) % config.maxRequests;
  }

  return { allowed: true, remaining: config.maxRequests - recent.length - 1, retryAfterMs: 0 };
}
