import { OpenAI } from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI();

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const stream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      stream: true,
    });

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        }
        controller.close();
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error in OpenAI API call:', error);
    return NextResponse.json({ error: 'An error occurred during the request.' }, { status: 500 });
  }
}