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

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'WebhookTester/1.0',
      ...(headers || {}),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(targetUrl, {
        method: method.toUpperCase(),
        headers: requestHeaders,
        body: payload ? JSON.stringify(payload) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout', targetUrl },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to send request', details: error instanceof Error ? error.message : 'Unknown error', targetUrl },
        { status: 502 }
      );
    }
    clearTimeout(timeoutId);

    let responseData: unknown;
    const contentType = response.headers.get('content-type') || '';
    try {
      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }
    } catch {
      responseData = 'Unable to parse response body';
    }

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
      targetUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}