import { POST } from './route';
import { NextRequest } from 'next/server';

describe('POST /api/test-webhook', () => {
  it('rejects invalid URL', async () => {
    const req = new NextRequest(new URL('http://localhost/api/test-webhook'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUrl: 'not-a-url' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects javascript: protocol', async () => {
    const req = new NextRequest(new URL('http://localhost/api/test-webhook'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUrl: 'javascript:alert(1)' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 on missing payload schema', async () => {
    const req = new NextRequest(new URL('http://localhost/api/test-webhook'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    // targetUrl is required by schema
    expect(res.status).toBe(400);
  });
});