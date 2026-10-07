// lib/rate-limit.ts
import { LRUCache } from 'lru-cache';

interface RateLimitOptions {
  interval: number;
  uniqueTokenPerInterval: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export class RateLimit {
  private cache: LRUCache<string, number[]>;
  private interval: number;

  constructor(options: RateLimitOptions) {
    this.cache = new LRUCache({
      max: options.uniqueTokenPerInterval,
      ttl: options.interval,
    });
    this.interval = options.interval;
  }

  async check(token: string, limit: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - this.interval;
    
    const timestamps = this.cache.get(token) ?? [];
    const recentTimestamps = timestamps.filter((ts) => ts > windowStart);
    
    if (recentTimestamps.length >= limit) {
      return {
        success: false,
        limit,
        remaining: 0,
        reset: Math.ceil((recentTimestamps[0] + this.interval - now) / 1000),
      };
    }
    
    recentTimestamps.push(now);
    this.cache.set(token, recentTimestamps);
    
    return {
      success: true,
      limit,
      remaining: limit - recentTimestamps.length,
      reset: Math.ceil(this.interval / 1000),
    };
  }
}