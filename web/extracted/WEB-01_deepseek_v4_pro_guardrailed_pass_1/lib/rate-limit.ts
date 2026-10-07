// lib/rate-limit.ts
import { NextRequest } from "next/server";

const buckets = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(
  _req: NextRequest,
  userId: string,
  opts: { limit: number; windowSeconds: number }
): Promise<{ success: boolean }> {
  const key = `checkout:${userId}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + opts.windowSeconds * 1000,
    });
    return { success: true };
  }

  if (bucket.count >= opts.limit) {
    return { success: false };
  }

  bucket.count += 1;
  return { success: true };
}