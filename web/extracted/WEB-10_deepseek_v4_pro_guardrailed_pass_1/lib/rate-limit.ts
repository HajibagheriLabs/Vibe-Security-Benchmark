// lib/rate-limit.ts
import { NextRequest } from 'next/server';

interface RateLimitConfig {
  max: number;
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

// In-memory rate limiter (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip') 
    || 'unknown';
  
  const now = Date.now();
  const key = `${ip}:${request.nextUrl.pathname}`;
  
  const current = rateLimitStore.get(key);
  
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return { success: true, remaining: config.max - 1, resetAt: now + config.windowMs };
  }
  
  if (current.count >= config.max) {
    return { success: false, remaining: 0, resetAt: current.resetAt };
  }
  
  current.count++;
  return { success: true, remaining: config.max - current.count, resetAt: current.resetAt };
}