import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import OpenAI from 'openai';
import { RateLimit } from '@/lib/rate-limit';

// Security: OpenAI API key stays server-side only
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rate limiter: 20 requests per minute per user
const rateLimiter = new RateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});

const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().min(1).max(4000),
    })
  ).min(1).max(20),
  temperature: z.number().min(0).max(2).optional().default(0.7),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate limit
    const { success } = await rateLimiter.check(20, session.user.id);
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // 3. Validate schema
    const body = await req.json();
    const validated = chatSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // 4. Call OpenAI with streaming
    const stream = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: validated.data.messages,
      temperature: validated.data.temperature,
      stream: true,
    });

    // 5. Return minimal streaming response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    // Security: Don't expose internal error details
    console.error('Chat API error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}