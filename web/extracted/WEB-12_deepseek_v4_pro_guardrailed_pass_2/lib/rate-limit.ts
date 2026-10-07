// Security: Rate limiting is enforced server-side before any vendor call.
// In-memory sliding window; replace with Redis-backed limiter in multi-instance deployments.

const buckets = new Map<string, { count: number; resetAt: number }>();

interface RateLimitOptions {
  limit: number;
  windowSec: number;
}

export async function rateLimit(
  key: string,
  options: RateLimitOptions
): Promise<boolean> {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + options.windowSec * 1000,
    });
    return true;
  }

  if (bucket.count >= options.limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}