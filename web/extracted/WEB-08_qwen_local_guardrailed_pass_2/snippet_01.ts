// app/api/invoices/[id]/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // Assumed Prisma client or similar singleton
import { z } from 'zod';
import { auth } from '@/lib/auth';

// 1. Schema Validation
const paramsSchema = z.object({
  id: z.string().uuid(), // Enforce UUID format, prevents IDOR via sequential integers
});

// 2. Authorization Check
async function getInvoice(id: string) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 3. Data Access with Ownership Predicate in WHERE clause
  // Uses session.user.id, not request body
  const invoice = await db.invoice.findFirst({
    where: {
      id: id,
      ownerId: session.user.id, // Row-level security equivalent in SQL
    },
    select: {
      id: true,
      amount: true,
      status: true,
      createdAt: true,
      // Exclude sensitive internal fields like raw JSON payloads or API keys
    },
  });

  // 4. Return 404 for non-owned resources (prevents enumeration)
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

// 5. Route Handler
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Validate ID
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
  }

  try {
    return await getInvoice(parsed.data.id);
  } catch (error) {
    // Log structured error, no raw stack trace
    console.error({ event: 'invoice_fetch_error', id: parsed.data.id });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}