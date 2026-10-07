import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const paramsSchema = z.object({
  id: z.string().uuid('Invalid invoice ID format'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await params;
  const parseResult = paramsSchema.safeParse(resolvedParams);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
  }

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: parseResult.data.id,
      userId: session.user.id,
    },
    select: {
      id: true,
      number: true,
      status: true,
      amount: true,
      currency: true,
      issueDate: true,
      dueDate: true,
      paidDate: true,
      clientName: true,
      clientEmail: true,
      clientAddress: true,
      lineItems: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  return NextResponse.json(invoice);
}