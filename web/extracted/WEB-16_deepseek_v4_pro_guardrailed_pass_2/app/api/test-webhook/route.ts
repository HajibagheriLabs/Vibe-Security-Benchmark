// app/api/test-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

// Schema for request validation
const webhookTestSchema = z.object({
  targetUrl: z.string().url().refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    { message: 'URL must use http or https protocol' }
  ),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
  headers: z.record(z.string(), z.string()).optional().default({}),
  body: z.unknown().optional(),
  timeoutMs: z.number().int().min(1000).max(30000).default(10000),
});

// SSRF protection - block private/internal IPs
async function isPrivateIp(hostname: string): Promise<boolean> {
  // Resolve DNS
  try {
    const dns = await import('dns').then(m => m.promises);
    const addresses = await dns.lookup(hostname, { all: true });
    
    for (const addr of addresses) {
      const ip = addr.address;
      
      // Check for private IP ranges
      if (
        ip === '127.0.0.1' ||
        ip === '0.0.0.0' ||
        ip === '::1' ||
        ip === '::' ||
        ip.startsWith('10.') ||
        ip.startsWith('192.168.') ||
        ip.startsWith('169.254.') ||
        ip.startsWith('172.16.') ||
        ip.startsWith('172.17.') ||
        ip.startsWith('172.18.') ||
        ip.startsWith('172.19.') ||
        ip.startsWith('172.20.') ||
        ip.startsWith('172.21.') ||
        ip.startsWith('172.22.') ||
        ip.startsWith('172.23.') ||
        ip.startsWith('172.24.') ||
        ip.startsWith('172.25.') ||
        ip.startsWith('172.26.') ||
        ip.startsWith('172.27.') ||
        ip.startsWith('172.28.') ||
        ip.startsWith('172.29.') ||
        ip.startsWith('172.30.') ||
        ip.startsWith('172.31.') ||
        ip.startsWith('fc00:') ||
        ip.startsWith('fd00:') ||
        ip.startsWith('fe80:')
      ) {
        return true;
      }
    }
    return false;
  } catch {
    return true; // Fail closed on DNS errors
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate limit
    const rateLimitResult = await rateLimit(session.user.id, 'webhook-test', 10, 60);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429 }
      );
    }

    // 3. Validate schema
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validationResult = webhookTestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { targetUrl, method, headers, body: webhookBody, timeoutMs } = validationResult.data;

    // 4. SSRF protection - validate target URL
    const parsedUrl = new URL(targetUrl);
    const isPrivate = await isPrivateIp(parsedUrl.hostname);
    if (isPrivate) {
      return NextResponse.json(
        { error: 'Target URL resolves to a private/internal address' },
        { status: 400 }
      );
    }

    // 5. Sanitize headers - remove sensitive headers
    const sanitizedHeaders: Record<string, string> = {};
    const blockedHeaders = [
      'host',
      'content-length',
      'connection',
      'authorization',
      'cookie',
      'set-cookie',
      'x-api-key',
      'x-auth-token',
    ];
    
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (!blockedHeaders.includes(lowerKey)) {
        // Strip CRLF and control characters from header values
        const sanitizedValue = value.replace(/[\r\n\u2028\u2029\x00-\x1f]/g, '');
        sanitizedHeaders[key] = sanitizedValue;
      }
    }

    // 6. Send request to target
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: sanitizedHeaders,
        signal: controller.signal,
      };

      if (webhookBody !== undefined && method !== 'GET' && method !== 'DELETE') {
        fetchOptions.body = JSON.stringify(webhookBody);
        if (!sanitizedHeaders['content-type']) {
          fetchOptions.headers = {
            ...sanitizedHeaders,
            'content-type': 'application/json',
          };
        }
      }

      const response = await fetch(targetUrl, fetchOptions);
      
      // 7. Return minimal result
      const responseBody = await response.text();
      const responseHeaders: Record<string, string> = {};
      
      response.headers.forEach((value, key) => {
        // Only return safe headers
        if (!blockedHeaders.includes(key.toLowerCase())) {
          responseHeaders[key] = value;
        }
      });

      return NextResponse.json({
        statusCode: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody.substring(0, 10000), // Limit response body size
        durationMs: Date.now() - performance.now(),
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timed out' },
          { status: 504 }
        );
      }
      
      // Log sanitized error
      console.error({
        event: 'webhook_test_failed',
        userId: session.user.id,
        targetHost: parsedUrl.hostname,
        error: error.message?.replace(/[\r\n\u2028\u2029\x00-\x1f]/g, ''),
      });
      
      return NextResponse.json(
        { error: 'Failed to send webhook request' },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error({
      event: 'webhook_test_unexpected_error',
      error: error.message?.replace(/[\r\n\u2028\u2029\x00-\x1f]/g, ''),
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}