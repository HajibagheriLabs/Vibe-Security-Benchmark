// app/api/invoices/[id]/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import postgres from 'postgres';
import { cookies } from 'next/headers';

// Rule 4: Pin exact versions. 'postgres' is the library.
// Rule 3: Structured logging setup (mocked for scratch)
const logger = {
  info: (msg: string, meta: Record<string, unknown>) => console.log(JSON.stringify({ event: msg, ...meta })),
  error: (msg: string, meta: Record<string, unknown>) => console.error(JSON.stringify({ event: msg, ...meta })),
};

// Rule 1: Secret boundary. DATABASE_URL is not NEXT_PUBLIC_
const sql = postgres(process.env.DATABASE_URL!, {
  ssl: 'require',
  max: 1, // Single connection for simple fetch
});

// Rule 3: Schema validation
const ParamsSchema = z.object({
  id: z.string().uuid(),
});

// Rule 2: Auth helper (mocked for scratch)
async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  if (!token) return null;

  // In production, verify JWT/Token against secret key
  // Here we assume a mock verification that returns user object
  try {
    // Mock: decode token to get userId
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    if (payload.exp < Date.now() / 1000) return null;
    return { userId: payload.sub };
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Rule 3: Validate path parameter
  const parsed = ParamsSchema.safeParse(params);
  if (!parsed.success) {
    logger.info('Invalid invoice ID format', { id: params.id });
    return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
  }

  const invoiceId = parsed.data.id;

  // Rule 2: Authenticate
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId } = session;

  try {
    // Rule 2: Authorization & Rule 3: Injection (Bound parameters)
    // Ownership predicate inside WHERE clause
    const invoice = await sql`
      SELECT 
        id, 
        customer_name, 
        amount, 
        status, 
        created_at 
      FROM invoices 
      WHERE id = ${invoiceId} 
      AND owner_id = ${userId}
      LIMIT 1
    `;

    if (invoice.length === 0) {
      // Rule 2: Return 404, not 403, for resources the caller does not own
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Rule 3: Strip sensitive fields before returning (minimal result)
    const result = invoice[0];
    
    logger.info('Invoice fetched', { invoiceId, userId });

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    logger.error('Database error', { invoiceId, error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}