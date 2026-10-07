import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetUrl, payload, headers, method = 'POST', timeout = 10000 } = body;

    if (!targetUrl || typeof targetUrl !== 'string') {
      return NextResponse.json(
        { error: 'targetUrl is required and must be a string' },
        { status: 400 }
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return NextResponse.json(
        { error: 'targetUrl must be a valid URL' },
        { status: 400 }
      );
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: 'targetUrl must use http or https protocol' },
        { status: 400 }
      );
    }

    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Webhook-Tester/1.0',
        ...(headers || {}),
      },
      signal: AbortSignal.timeout(timeout),
    };

    if (payload !== undefined && payload !== null) {
      fetchOptions.body = JSON.stringify(payload);
    }

    const startTime = Date.now();
    let response: Response;
    let responseBody: unknown;
    let error: Error | null = null;

    try {
      response = await fetch(targetUrl, fetchOptions);
      const responseText = await response.text();
      
      try {
        responseBody = JSON.parse(responseText);
      } catch {
        responseBody = responseText;
      }
    } catch (err) {
      error = err instanceof Error ? err : new Error('Unknown error');
      responseBody = null;
    }

    const duration = Date.now() - startTime;

    const result = {
      success: !error && response?.ok,
      statusCode: response?.status ?? null,
      statusText: response?.statusText ?? null,
      duration,
      response: responseBody,
      error: error?.message ?? null,
      request: {
        url: targetUrl,
        method: method.toUpperCase(),
        headers: fetchOptions.headers,
        payload,
      },
    };

    return NextResponse.json(result, { status: error || !response?.ok ? 200 : 200 });
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Internal server error');
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}