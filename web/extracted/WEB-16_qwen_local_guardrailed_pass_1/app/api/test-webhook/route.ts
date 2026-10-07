import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema validation for the webhook target
const WebhookSchema = z.object({
  targetUrl: z.string().url(),
  payload: z.record(z.unknown()).optional(),
  method: z.enum(['POST', 'PUT', 'PATCH']).default('POST'),
  headers: z.record(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Validate Schema
    const body = await request.json();
    const validated = WebhookSchema.parse(body);

    // 2. Validate URL Protocol (Defense against javascript: / data: schemes)
    const url = new URL(validated.targetUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return NextResponse.json(
        { error: 'Invalid protocol. Only http and https are allowed.' },
        { status: 400 }
      );
    }

    // 3. Construct Request
    const fetchOptions: RequestInit = {
      method: validated.method,
      headers: {
        'Content-Type': 'application/json',
        // Strip sensitive headers from the incoming request to prevent leakage
        'X-Webhook-Tester': 'true',
        ...validated.headers,
      },
      body: validated.payload ? JSON.stringify(validated.payload) : undefined,
      // Timeout protection (3s)
      signal: AbortSignal.timeout(3000),
    };

    // 4. Execute Server-Side Proxy
    // Note: In a production environment, we would verify the domain against an allowlist
    // or use a custom DNS resolver to prevent SSRF (e.g., 169.254.169.254).
    const response = await fetch(validated.targetUrl, fetchOptions);

    // 5. Return Minimal Result
    const responseText = await response.text();
    
    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      body: responseText,
      headers: Object.fromEntries(response.headers.entries()),
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    // Generic error handling, stripping internal details
    console.error('Webhook test failed:', error);
    return NextResponse.json(
      { error: 'Failed to send webhook' },
      { status: 500 }
    );
  }
}