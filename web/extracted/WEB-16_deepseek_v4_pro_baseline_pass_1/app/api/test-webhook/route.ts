// app/api/test-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetUrl, method = 'POST', headers = {}, payload = {} } = body;

    // Validate target URL
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

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: 'Only http and https protocols are allowed' },
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

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    // Only include body for methods that support it
    if (!['GET', 'HEAD'].includes(method.toUpperCase())) {
      fetchOptions.body = JSON.stringify(payload);
    }

    // Send the webhook request
    const startTime = Date.now();
    const response = await fetch(targetUrl, fetchOptions);
    const responseTime = Date.now() - startTime;

    // Read response body
    const responseText = await response.text();
    let responseBody: any;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText;
    }

    // Return webhook response details
    return NextResponse.json({
      success: response.ok,
      statusCode: response.status,
      statusText: response.statusText,
      responseTime: `${responseTime}ms`,
      responseHeaders: Object.fromEntries(response.headers.entries()),
      responseBody,
    });
  } catch (error) {
    console.error('Webhook test error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send webhook request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}