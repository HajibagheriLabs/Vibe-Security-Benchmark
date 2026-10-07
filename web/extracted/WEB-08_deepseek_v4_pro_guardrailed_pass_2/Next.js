// app/api/invoices/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// Schema for validating route parameters
const ParamsSchema = z.object({
  id: z.string().uuid('Invalid invoice ID format'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate - verify session exists
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Validate schema - ensure ID is a valid UUID
    const validationResult = ParamsSchema.safeParse(params);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid invoice ID' },
        { status: 400 }
      );
    }

    const invoiceId = validationResult.data.id;

    // 3. Authorize + fetch - ownership predicate in WHERE clause
    // Returns 404 for non-owned invoices to prevent enumeration
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        ownerId: session.user.id, // Identity from verified session only
      },
      select: {
        id: true,
        invoiceNumber: true,
        amount: true,
        currency: true,
        status: true,
        issuedDate: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
        // Exclude sensitive fields like internal notes, payment details
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // 4. Return minimal result
    return NextResponse.json({ invoice });

  } catch (error) {
    // Log structured error without sensitive data
    console.error({
      event: 'invoice_fetch_error',
      userId: session?.user?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}