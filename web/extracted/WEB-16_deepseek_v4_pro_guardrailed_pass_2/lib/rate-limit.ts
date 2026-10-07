// lib/rate-limit.ts
import { NextRequest } from 'next/server';

interface RateLimitResult {
  success: boolean;
  remaining?: number;
  resetAt?: number;
}

// Simple in-memory rate limiter (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(
  userId: string,
  action: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  
  const current = rateLimitStore.get(key);
  
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { success: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }
  
  if (current.count >= maxRequests) {
    return { success: false, remaining: 0, resetAt: current.resetAt };
  }
  
  current.count++;
  return { success: true, remaining: maxRequests - current.count, resetAt: current.resetAt };
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);