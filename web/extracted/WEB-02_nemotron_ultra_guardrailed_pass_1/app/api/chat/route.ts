import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().min(1).max(4000),
    })
  ).min(1).max(20),
  model: z.enum(['gpt-4o-mini', 'gpt-4o']).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export async function POST(req: NextRequest) {
  // 1. Authenticate
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Validate schema
  let body: z.infer<typeof chatSchema>;
  try {
    body = chatSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // 3. Rate limit (simple in-memory per-user; replace with Redis in production)
  const rateLimitKey = `chat:${session.user.id}`;
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 20;

  // In production, use Redis with sliding window
  // This is a minimal placeholder
  if (!globalThis.chatRateLimit) globalThis.chatRateLimit = new Map();
  const userRequests = globalThis.chatRateLimit.get(rateLimitKey) || [];
  const recentRequests = userRequests.filter((ts: number) => now - ts < windowMs);
  if (recentRequests.length >= maxRequests) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  recentRequests.push(now);
  globalThis.chatRateLimit.set(rateLimitKey, recentRequests);

  // 4. Call vendor (OpenAI)
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: body.model || 'gpt-4o-mini',
        messages: body.messages,
        temperature: body.temperature ?? 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      // Log structured, redacted
      console.error({ event: 'openai_error', status: response.status, userId: session.user.id });
      return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
    }

    // 5. Return streamed response
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error({ event: 'openai_fetch_failed', userId: session.user.id, error: String(err) });
    return NextResponse.json({ error: 'Upstream unavailable' }, { status: 502 });
  }
}