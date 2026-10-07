// lib/rate-limit.ts
import { NextResponse } from 'next/server';

// Simple in-memory rate limiter (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export async function rateLimit(
  userId: string,
  action: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ success: boolean }> {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  const existing = rateLimitStore.get(key);
  
  if (!existing || existing.resetTime < now) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true };
  }

  if (existing.count >= maxRequests) {
    return { success: false };
  }

  existing.count++;
  return { success: true };
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);