// src/lib/rate-limit.ts
// Simple in-memory rate limiter (use Redis in production for multi-instance)
const buckets = new Map<string, { count: number; resetAt: number }>();

interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

export async function rateLimit(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (existing.count >= options.limit) {
    return {
      allowed: false,
      retryAfter: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return { allowed: true };
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of buckets) {
    if (value.resetAt <= now) {
      buckets.delete(key);
    }
  }
}, 60_000).unref();