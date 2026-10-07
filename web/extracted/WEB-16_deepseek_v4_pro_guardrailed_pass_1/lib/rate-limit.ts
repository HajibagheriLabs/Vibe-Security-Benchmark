// lib/rate-limit.ts
import { NextRequest } from 'next/server';

interface RateLimitConfig {
  identifier: string;
  maxRequests: number;
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining?: number;
  resetAt?: number;
}

// In-memory store (use Redis in production for distributed rate limiting)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Cleanup every minute

export async function rateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const now = Date.now();
  const key = config.identifier;
  
  const existing = rateLimitStore.get(key);
  
  if (!existing || existing.resetAt <= now) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }
  
  if (existing.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }
  
  existing.count++;
  rateLimitStore.set(key, existing);
  
  return {
    success: true,
    remaining: config.maxRequests - existing.count,
    resetAt: existing.resetAt,
  };
}