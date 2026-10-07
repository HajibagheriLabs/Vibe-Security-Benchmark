// lib/rate-limit.ts
import { NextApiRequest, NextApiResponse } from "next";

interface RateLimitOptions {
  interval: number;
  uniqueTokenPerInterval: number;
}

interface RateLimiter {
  check: (limit: number, token: string) => Promise<void>;
}

export function rateLimit(options: RateLimitOptions): RateLimiter {
  const tokenCache = new Map<string, number[]>();

  return {
    check: async (limit: number, token: string): Promise<void> => {
      const now = Date.now();
      const windowStart = now - options.interval;

      const tokenCount = tokenCache.get(token) || [];
      const validTimestamps = tokenCount.filter(
        (timestamp) => timestamp > windowStart
      );

      if (validTimestamps.length >= limit) {
        throw new Error("Rate limit exceeded");
      }

      validTimestamps.push(now);
      tokenCache.set(token, validTimestamps);

      // Clean up old tokens periodically
      if (tokenCache.size > options.uniqueTokenPerInterval) {
        const oldestToken = tokenCache.keys().next().value;
        if (oldestToken) {
          tokenCache.delete(oldestToken);
        }
      }
    },
  };
}