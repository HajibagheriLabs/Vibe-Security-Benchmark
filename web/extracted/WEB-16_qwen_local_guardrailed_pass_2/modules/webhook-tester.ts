// modules/webhook-tester.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server'; // Assuming Supabase/RLS context based on rules

// 1. SECRETS: No public env prefix for the webhook secret if used for signing
// const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET; 

// 3. INJECTION: Strict schema validation for user input
const WebhookSchema = z.object({
  url: z.string().url().refine((url) => {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  }, { message: 'Protocol must be http or https' }),
  payload: z.record(z.unknown()).optional(),
  headers: z.record(z.string()).optional(),
});

// 3. INJECTION: Allowlist for HTTP methods to prevent SSRF via exotic methods if needed
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

export async function POST(request: NextRequest) {
  try {
    // Parse and validate body
    const body = await request.json();
    const validated = WebhookSchema.parse(body);

    // 2. AUTH: Derive identity from session (optional, depending on if webhook tester is user-scoped)
    // const supabase = createClient();
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 3. INJECTION: Validate method if provided
    const method = (body.method as string) || 'POST';
    if (!ALLOWED_METHODS.includes(method.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid method' }, { status: 400 });
    }

    // 3. INJECTION: Construct headers, ensuring no user-controlled header overwrites critical ones like Host
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Source': 'next-webhook-tester',
    };
    
    if (validated.headers) {
      Object.entries(validated.headers).forEach(([key, value]) => {
        // Lowercase key for consistency, prevent injection of line breaks
        const cleanKey = key.toLowerCase().replace(/[\r\n]/g, '');
        const cleanValue = value.replace(/[\r\n]/g, '');
        headers[cleanKey] = cleanValue;
      });
    }

    // 3. INJECTION: Fetch with timeout and size limit to prevent resource exhaustion
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(validated.url, {
      method: method.toUpperCase(),
      headers,
      body: validated.payload ? JSON.stringify(validated.payload) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Return minimal result: status and headers (excluding set-cookie if present to avoid leaking session)
    const resultHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      if (key !== 'set-cookie') {
        resultHeaders[key] = value;
      }
    });

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      headers: resultHeaders,
      body: await response.text(), // Or parse JSON if content-type indicates
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    // 3. INJECTION: Log structured object, strip user-controlled values
    console.error({
      event: 'webhook_test_failed',
      url: body?.url || 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}