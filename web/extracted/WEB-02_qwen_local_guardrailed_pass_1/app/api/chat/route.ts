// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Flag: Secret is server-only. No NEXT_PUBLIC_ prefix.
// Scope: chat.completions.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    // Validate Schema (Rule §3)
    const body = await req.json();
    const { message } = body as { message: string };

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    // Rate Limiting (Rule §1)
    // In a real app, check Redis/DB for user IP/token limit.

    // Call Vendor (Rule §1)
    const stream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: message }],
      stream: true,
    });

    // Create a ReadableStream for the response
    const encoder = new TextEncoder();
    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          controller.enqueue(encoder.encode(content));
        }
      },
    });

    // Return Stream
    return new Response(stream.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}