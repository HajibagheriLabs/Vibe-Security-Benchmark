src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { chatRequestSchema } from '@/lib/validation';
import { openai, DEFAULT_MODEL, MAX_TOKENS, TEMPERATURE } from '@/lib/openai';
import { ratelimit } from '@/lib/rate-limiter';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = request.headers.get('x-forwarded-for') || 'anonymous';
  const { success, limit, reset, remaining } = await ratelimit.limit(`chat:${session.user.id}:${ip}`);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parseResult = chatRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid request', details: parseResult.error.flatten() }, { status: 400 });
  }

  const { messages, model, temperature, maxTokens } = parseResult.data;

  const systemMessage = {
    role: 'system' as const,
    content: 'You are a helpful assistant. Keep responses concise and safe.',
  };

  const stream = await openai.chat.completions.create({
    model: model || DEFAULT_MODEL,
    messages: [systemMessage, ...messages],
    temperature: temperature ?? TEMPERATURE,
    max_tokens: maxTokens ?? MAX_TOKENS,
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(reset),
    },
  });
}