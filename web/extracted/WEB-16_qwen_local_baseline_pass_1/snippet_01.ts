import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, method, headers: reqHeaders, body: webhookBody } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'Missing target URL' },
        { status: 400 }
      );
    }

    const targetMethod = method || 'POST';
    
    // Construct headers object, handling potential array or object formats
    let targetHeaders: Record<string, string> = {};
    if (reqHeaders) {
      if (typeof reqHeaders === 'object' && !Array.isArray(reqHeaders)) {
        targetHeaders = reqHeaders as Record<string, string>;
      } else if (Array.isArray(reqHeaders)) {
        // Handle array of {key, value} or similar if needed, defaulting to simple object merge
        reqHeaders.forEach((h: any) => {
          if (h.key && h.value) {
            targetHeaders[h.key] = h.value;
          }
        });
      }
    }

    // Default Content-Type if not provided and body exists
    if (webhookBody && !targetHeaders['Content-Type']) {
      targetHeaders['Content-Type'] = 'application/json';
    }

    const fetchOptions: RequestInit = {
      method: targetMethod,
      headers: targetHeaders,
    };

    // Only add body for methods that typically support it
    if (webhookBody && (targetMethod === 'POST' || targetMethod === 'PUT' || targetMethod === 'PATCH')) {
      fetchOptions.body = JSON.stringify(webhookBody);
    }

    const response = await fetch(url, fetchOptions);
    const responseText = await response.text();

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText,
    }, {
      status: response.status,
    });

  } catch (error) {
    console.error('Webhook test failed:', error);
    return NextResponse.json(
      { error: 'Failed to send webhook', details: (error as Error).message },
      { status: 500 }
    );
  }
}