// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { OpenAI } from 'openai';

// Schema Validation
const ChatSchema = z.object({
  message: z.string().min(1).max(1000),
});

// Server-side Client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  // 1. Authenticate (Cosmetic check for demo, usually checks session cookie)
  // In a real app: const session = await getSession(req);
  // if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. Validate Schema
  let body;
  try {
    body = await req.json();
    ChatSchema.parse(body);
  } catch (e) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { message } = body;

  try {
    // 3. Rate Limit (Simple implementation)
    // In production: Use Upstash Redis or similar middleware

    // 4. Call Vendor
    const stream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: message }],
      stream: true,
    });

    // 5. Return Stream
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            const payload = JSON.stringify({
              choices: [{ delta: { content } }],
            });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('OpenAI Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}