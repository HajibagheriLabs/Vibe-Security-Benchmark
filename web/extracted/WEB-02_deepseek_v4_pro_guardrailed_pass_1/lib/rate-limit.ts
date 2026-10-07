import { LRUCache } from 'lru-cache';

interface RateLimitOptions {
  interval: number;
  uniqueTokenPerInterval: number;
}

export class RateLimit {
  private tokenCache: LRUCache<string, number[]>;

  constructor(options: RateLimitOptions) {
    this.tokenCache = new LRUCache({
      max: options.uniqueTokenPerInterval,
      ttl: options.interval,
    });
  }

  async check(limit: number, token: string): Promise<{ success: boolean }> {
    const now = Date.now();
    const windowStart = now - 60 * 1000; // 1 minute window
    
    const tokenCount = this.tokenCache.get(token) || [];
    const validTokens = tokenCount.filter(timestamp => timestamp > windowStart);
    
    if (validTokens.length >= limit) {
      return { success: false };
    }
    
    validTokens.push(now);
    this.tokenCache.set(token, validTokens);
    return { success: true };
  }
}