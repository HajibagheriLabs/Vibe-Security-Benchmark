// app/api/test-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetUrl, method = 'POST', headers = {}, payload = {}, timeout = 10000 } = body;

    // Validate required fields
    if (!targetUrl) {
      return NextResponse.json(
        { error: 'targetUrl is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid targetUrl format' },
        { status: 400 }
      );
    }

    // Validate protocol
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: 'Only HTTP and HTTPS protocols are allowed' },
        { status: 400 }
      );
    }

    // Validate method
    const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    if (!allowedMethods.includes(method.toUpperCase())) {
      return NextResponse.json(
        { error: `Invalid method. Allowed methods: ${allowedMethods.join(', ')}` },
        { status: 400 }
      );
    }

    // Prepare headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: requestHeaders,
      signal: AbortSignal.timeout(timeout),
    };

    // Add body for non-GET/HEAD methods
    if (!['GET', 'HEAD'].includes(method.toUpperCase())) {
      fetchOptions.body = JSON.stringify(payload);
    }

    const startTime = Date.now();
    
    // Send the webhook request
    const response = await fetch(targetUrl, fetchOptions);
    const responseTime = Date.now() - startTime;

    // Parse response
    const responseContentType = response.headers.get('content-type') || '';
    let responseBody: any;
    
    if (responseContentType.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    // Return the result
    return NextResponse.json({
      success: response.ok,
      statusCode: response.status,
      statusText: response.statusText,
      responseTime,
      responseHeaders: Object.fromEntries(response.headers.entries()),
      responseBody,
      request: {
        url: targetUrl,
        method: method.toUpperCase(),
        headers: requestHeaders,
        payload: ['GET', 'HEAD'].includes(method.toUpperCase()) ? null : payload,
      },
    }, { status: 200 });

  } catch (error: any) {
    console.error('Webhook test error:', error);

    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Request timed out',
          details: error.message 
        },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to send webhook request',
        details: error.message 
      },
      { status: 500 }
    );
  }
}