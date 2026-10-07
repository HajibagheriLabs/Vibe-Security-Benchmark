// app/api/test-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { validateWebhookUrl } from '@/lib/url-validation';

// Schema for request body validation
const webhookRequestSchema = z.object({
  targetUrl: z.string().url().max(2048),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
  timeoutMs: z.number().int().min(1000).max(30000).default(10000),
});

// Allowlist of permitted protocols and hosts
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate - require valid session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Rate limit - prevent abuse
    const rateLimitResult = await rateLimit({
      identifier: `webhook-test:${session.user.id}`,
      maxRequests: 10,
      windowMs: 60000, // 10 requests per minute
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429 }
      );
    }

    // 3. Validate request body
    let parsedBody;
    try {
      const rawBody = await request.json();
      parsedBody = webhookRequestSchema.parse(rawBody);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // 4. Validate and sanitize target URL (SSRF protection)
    const urlValidation = await validateWebhookUrl(parsedBody.targetUrl);
    if (!urlValidation.isValid) {
      return NextResponse.json(
        { error: urlValidation.reason || 'Invalid target URL' },
        { status: 400 }
      );
    }

    // 5. Sanitize headers - remove sensitive headers
    const sanitizedHeaders = sanitizeHeaders(parsedBody.headers);

    // 6. Send webhook request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), parsedBody.timeoutMs);

    try {
      const webhookResponse = await fetch(parsedBody.targetUrl, {
        method: parsedBody.method,
        headers: sanitizedHeaders,
        body: parsedBody.method !== 'GET' && parsedBody.body !== undefined 
          ? JSON.stringify(parsedBody.body) 
          : undefined,
        signal: controller.signal,
        redirect: 'manual', // Prevent automatic redirects to internal addresses
      });

      clearTimeout(timeoutId);

      // 7. Read response (limit size to prevent memory exhaustion)
      const responseText = await readResponseWithLimit(webhookResponse, 1024 * 1024); // 1MB limit

      // 8. Return minimal response info
      return NextResponse.json({
        statusCode: webhookResponse.status,
        statusText: webhookResponse.statusText,
        headers: sanitizeResponseHeaders(webhookResponse.headers),
        body: responseText,
        durationMs: Date.now() - request.headers.get('x-request-start-time') 
          ? Date.now() - parseInt(request.headers.get('x-request-start-time')!)
          : undefined,
      });

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Webhook request timed out' },
          { status: 504 }
        );
      }

      // Log sanitized error
      console.error({
        event: 'webhook_test_failed',
        userId: session.user.id,
        error: sanitizeForLog(error.message),
        targetHost: urlValidation.hostname,
      });

      return NextResponse.json(
        { error: 'Failed to send webhook request' },
        { status: 502 }
      );
    }

  } catch (error) {
    // Log sanitized error
    console.error({
      event: 'webhook_endpoint_error',
      error: sanitizeForLog(error instanceof Error ? error.message : 'Unknown error'),
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper: Sanitize headers to prevent header injection and remove sensitive data
function sanitizeHeaders(headers?: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  const blockedHeaders = [
    'host',
    'content-length',
    'connection',
    'transfer-encoding',
    'upgrade',
    'proxy-authorization',
    'authorization',
    'cookie',
    'set-cookie',
  ];

  if (!headers) return sanitized;

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    
    // Skip blocked headers
    if (blockedHeaders.includes(lowerKey)) continue;
    
    // Validate header name (prevent injection)
    if (!/^[a-zA-Z0-9-]+$/.test(key)) continue;
    
    // Strip CRLF and control characters from values
    const cleanValue = value.replace(/[\r\n\u0000-\u001f\u007f]/g, '');
    
    // Limit header size
    if (cleanValue.length > 8192) continue;
    
    sanitized[key] = cleanValue;
  }

  return sanitized;
}

// Helper: Sanitize response headers
function sanitizeResponseHeaders(headers: Headers): Record<string, string> {
  const sanitized: Record<string, string> = {};
  const allowedResponseHeaders = [
    'content-type',
    'content-length',
    'x-request-id',
    'x-webhook-id',
    'retry-after',
  ];

  headers.forEach((value, key) => {
    if (allowedResponseHeaders.includes(key.toLowerCase())) {
      sanitized[key] = value;
    }
  });

  return sanitized;
}

// Helper: Read response with size limit
async function readResponseWithLimit(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.length;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      return '[Response truncated - exceeds 1MB limit]';
    }

    chunks.push(value);
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return new TextDecoder().decode(combined);
}

// Helper: Sanitize values for logging (prevent log injection)
function sanitizeForLog(value: string): string {
  return value
    .replace(/[\r\n\u2028\u2029]/g, '')
    .replace(/\u001b\[[0-9;]*m/g, '') // Remove ANSI escape codes
    .slice(0, 500); // Limit length
}