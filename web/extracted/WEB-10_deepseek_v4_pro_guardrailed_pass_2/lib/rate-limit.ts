// lib/rate-limit.ts
import { NextRequest } from 'next/server';

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining?: number;
  resetAt?: number;
}

// Simple in-memory rate limiter (use Redis in production)
const requestLog = new Map<string, number[]>();

export async function rateLimit(
  request: NextRequest,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
            request.headers.get('x-real-ip') || 
            'unknown';
  
  const now = Date.now();
  const windowStart = now - options.windowMs;
  
  // Clean up old entries
  const userRequests = (requestLog.get(ip) || []).filter(timestamp => timestamp > windowStart);
  
  if (userRequests.length >= options.maxRequests) {
    return {
      success: false,
      resetAt: Math.min(...userRequests) + options.windowMs,
    };
  }
  
  userRequests.push(now);
  requestLog.set(ip, userRequests);
  
  return {
    success: true,
    remaining: options.maxRequests - userRequests.length,
    resetAt: now + options.windowMs,
  };
}